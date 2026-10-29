"""
Gon CLI — 스킬 라우팅, 지연 설치, 메모리, 전역 /gon 등록을 한 파일로.

    python Gon/gon.py catalog            스킬 목록(id | 용도). AI가 요구사항을 분석해 여기서 고른다
    python Gon/gon.py pick <id> [id…]    고른 스킬의 경로 출력 (없는 저장소는 자동으로 받고, 항상 적용 핵심을 덧붙임)
    python Gon/gon.py fetch <id|all>     스킬 저장소 받기 (shallow)
    python Gon/gon.py remember "<사실>"  장기 메모리에 한 줄 추가
    python Gon/gon.py recent [n]         작업 시작 전: 최근 이력·커밋·미커밋 변경·개발자 코어 스킬을 한 번에 본다
    python Gon/gon.py log --by claude|gemini "<한 줄>"   작업 끝: 이력에 한 줄 추가 (미커밋 변경 파일 자동 첨부)
    python Gon/gon.py observe --by claude|gemini <스킬id|new:이름> "<한 줄>"   작업 중 본 스킬의 문제를 기록 (2개 쌓이면 점검 안내)
    python Gon/gon.py review [--done <대상> "<처리 내용>"]   쌓인 관찰을 대상별로 보고 점검 / 처리했다고 닫기
    python Gon/gon.py learn <id> "<용도>" "<트리거,…>"   로컬 스킬 생성·등록
    python Gon/gon.py install [--tools claude,gemini,codex]   어느 프로젝트에서든 /gon 쓰도록 전역 명령 등록. 쓰는 AI만 고른다(안 주면 터미널에서 묻는다)
    python Gon/gon.py always on|off [--tools …]   /gon 없이 모든 세션에 Gon 상시 적용 / 해제 (off는 --tools가 없으면 전부)
    python Gon/gon.py doctor             설치 상태 점검
    python Gon/gon.py run                서비스 준비(의존성 설치) + 백엔드·프론트 서버 실행
    python Gon/gon.py stop               실행 중인 서비스 종료
"""

import glob
import json
import os
import re
import shutil
import socket
import subprocess
import sys
import time
import urllib.request
import webbrowser
from datetime import date
from pathlib import Path

GON = Path(__file__).resolve().parent
HOME = GON.parent  # 저장소 루트 (GON_HOME)
REGISTRY = GON / "registry" / "skills.json"
MANIFEST = GON / "skills" / "repos.json"
REPOS = GON / "skills" / "repos"
LOCAL = GON / "skills" / "local"
MEMORY = GON / "memory"
MAX_SKILLS = 5
DEFAULT = ["karpathy"]


# ---------- 도구 탐색 (PATH 미갱신 환경 대비) ----------

def find_tool(name: str) -> str | None:
    found = shutil.which(name)
    if found:
        return found
    if os.name == "nt":
        appdata = os.getenv("APPDATA")
        if appdata:
            for ext in (".cmd", ".exe", ".ps1"):
                cand = os.path.join(appdata, "npm", f"{name}{ext}")
                if os.path.exists(cand):
                    return cand
        if name == "agy":
            local = os.getenv("LOCALAPPDATA")
            if local:
                hits = glob.glob(os.path.join(local, "Microsoft", "WinGet", "Packages", "Google.AntigravityCLI_*", "agy.exe"))
                if hits:
                    return hits[0]
    else:
        for d in (Path.home() / ".local" / "bin", Path.home() / ".npm-global" / "bin"):
            cand = d / name
            if cand.exists():
                return str(cand)
    return None


# ---------- registry ----------

def load() -> dict:
    return {s["id"]: s for s in json.loads(REGISTRY.read_text(encoding="utf-8"))["skills"]}


def save(registry: dict) -> None:
    data = json.loads(REGISTRY.read_text(encoding="utf-8"))
    data["skills"] = list(registry.values())
    REGISTRY.write_text(json.dumps(data, ensure_ascii=False, indent=1) + "\n", encoding="utf-8")


def entry_path(s: dict) -> Path | None:
    if s["status"] == "external":
        return None
    base = HOME if s["status"] == "local" else REPOS
    return (base / s["entry"]).resolve()


def repo_of(s: dict) -> str | None:
    """entry가 Gon/skills/repos/<repo>/... 아래면 그 repo 이름."""
    p = entry_path(s)
    try:
        return p.relative_to(REPOS.resolve()).parts[0] if p else None
    except ValueError:
        return None


# ---------- fetch (지연 설치) ----------

def fetch(names: list[str]) -> list[str]:
    manifest = json.loads(MANIFEST.read_text(encoding="utf-8"))
    REPOS.mkdir(parents=True, exist_ok=True)
    failed = []
    for name in names:
        if (REPOS / name).exists() or name not in manifest:
            continue
        print(f"[gon] fetch {name}", file=sys.stderr)
        # longpaths: Windows 260자 제한으로 깊은 폴더 checkout이 깨지는 것 방지
        r = subprocess.run(["git", "-c", "core.longpaths=true", "clone", "-q", "--depth", "1", "--config", "core.longpaths=true", manifest[name], str(REPOS / name)])
        if r.returncode:
            shutil.rmtree(REPOS / name, ignore_errors=True)  # 반쯤 받은 폴더가 남으면 다음 fetch가 건너뛴다
            failed.append(name)
    return failed


# ---------- catalog / pick ----------
# 스킬 선택은 키워드 매칭이 아니라 AI(이 프로토콜을 읽는 모델)가 요구사항을 분석해 정한다.
# catalog는 선택지를 보여 주고, pick은 고른 스킬의 경로를 돌려준다.

def excerpt(path: Path, chars: int = 500) -> str:
    text = path.read_text(encoding="utf-8", errors="replace")
    if text.startswith("---"):  # 머리말 제거
        end = text.find("\n---", 3)
        text = text[end + 4:] if end != -1 else text
    return " ".join(text.split())[:chars]


def cmd_catalog() -> int:
    registry = load()
    tag = {"always": " [항상 적용]", "dev": " [개발 코어]", "project": " [코드·UI 작업]"}
    for s in registry.values():
        if s["status"] != "external":
            print(f"{s['id']}{tag.get(s.get('core'), '')} | {s['use_for']}")
    return 0


def cmd_pick(ids: list[str]) -> int:
    registry = load()
    unknown = [i for i in ids if i not in registry or registry[i]["status"] == "external"]
    if unknown:
        print(f"[gon] 없는 스킬: {unknown} (python Gon/gon.py catalog 로 목록 확인)", file=sys.stderr)
        return 1
    # 항상 적용 핵심(ECC 검증·코딩 표준, karpathy)은 고르지 않아도 붙는다. 개발 코어는 목록만 `recent`에 나오고, 고른 것만 받는다.
    chain = [registry[i] for i in dict.fromkeys(ids)]
    always = [s for s in registry.values() if s.get("core") == "always" and s["id"] not in ids]
    need = [r for s in chain + always if (r := repo_of(s)) and not (REPOS / r).exists()]
    failed = fetch(list(dict.fromkeys(need)))

    def line(s: dict, tag: str) -> str:
        p = entry_path(s)
        flag = "" if p and p.exists() else "  [MISSING]"
        guard = f"  ! {s['guard']}" if s.get("guard") else ""
        return f"{tag}{s['id']} | {s['use_for']} | {p}{flag}{guard}"

    # 토큰 절약: 한 스킬당 한 줄. 항상 적용 핵심은 지침 발췌를 바로 붙인다.
    for s in chain:
        print(line(s, ""))
    for s in always:
        print(line(s, "[핵심-항상] "))
        p = entry_path(s)
        if p and p.is_file():
            print(f"    > {excerpt(p)}")
    if failed:
        print(f"[gon] fetch 실패: {failed}", file=sys.stderr)
    return 0


# ---------- memory ----------

def append(file: str, line: str) -> int:
    MEMORY.mkdir(exist_ok=True)
    with (MEMORY / file).open("a", encoding="utf-8") as f:
        f.write(f"- [{date.today()}] {line.strip()}\n")
    return 0


# ---------- 작업 이력 (Claude Code · Antigravity Gemini · Codex 공용) ----------

def git_lines(*args: str) -> list[str]:
    r = subprocess.run(["git", "-C", str(HOME), *args], capture_output=True, text=True, encoding="utf-8", errors="replace")
    return [l for l in r.stdout.splitlines() if l.strip()]


def uncommitted() -> list[str]:
    """아직 커밋되지 않은 변경 파일. 이력 파일 자체는 뺀다."""
    out = []
    for l in git_lines("status", "--short", "--untracked-files=all"):
        path = l[3:].strip().strip('"')
        if not path.startswith("Gon/memory/"):
            out.append(path)
    return out


def cmd_log(args: list[str]) -> int:
    """gon log [--by claude|gemini|codex] "<한 일, 결과, 다음 사람이 알아야 할 것>" — 커밋 안 된 변경 파일은 자동으로 덧붙인다."""
    by = os.environ.get("GON_ACTOR", "ai")
    if len(args) >= 2 and args[0] == "--by":
        by, args = args[1], args[2:]
    if not args or args[0] in ("-h", "--help"):
        print('사용법: gon log --by claude|gemini|codex "<무엇을 했고 결과가 어땠는지>"', file=sys.stderr)
        return 2
    files = uncommitted()
    tail = f" | 미커밋 {len(files)}개: {', '.join(files[:8])}{' 외' if len(files) > 8 else ''}" if files else ""
    MEMORY.mkdir(exist_ok=True)
    with (MEMORY / "log.md").open("a", encoding="utf-8") as f:
        f.write(f"- [{date.today()} {time.strftime('%H:%M')}] [{by}] {' '.join(args).strip()}{tail}\n")
    return 0


def cmd_recent(n: int = 10) -> int:
    """작업 시작 전에 보는 것: 최근 이력, 최근 커밋, 미커밋 변경, 개발자 코어 스킬 상태."""
    log = MEMORY / "log.md"
    print("## 최근 작업 이력")
    lines = log.read_text(encoding="utf-8").splitlines()[-n:] if log.exists() else []
    print("\n".join(lines) if lines else "(없음)")
    print("\n## 최근 커밋")
    print("\n".join(git_lines("log", "-5", "--format=%h %ad %s", "--date=format:%m-%d %H:%M")) or "(없음)")
    print("\n## 아직 커밋되지 않은 변경 (최근 수정순) — 누가 했는지 모르면 git diff로 내용을 먼저 본다")
    now = time.time()
    rows = []
    for path in uncommitted():
        p = HOME / path
        rows.append((p.stat().st_mtime if p.exists() else 0, path))
    for mtime, path in sorted(rows, reverse=True):
        age = f"{int((now - mtime) // 60)}분 전" if mtime else "삭제됨"
        print(f"  {path}  ({age})")
    if not rows:
        print("  (없음)")

    registry = load()
    always_ids = [s["id"] for s in registry.values() if s.get("core") == "always"]
    dev_ids = [s["id"] for s in registry.values() if s.get("core") == "dev"]
    proj_ids = [s["id"] for s in registry.values() if s.get("core") == "project"]
    print("\n## 개발자 코어 스킬 (작업 단계별 적용 — python Gon/gon.py pick <id>)")
    print(f"  [항상 적용]   {', '.join(always_ids)}")
    print(f"  [개발 코어]   {', '.join(dev_ids)}  (착수: graphify·context7 | 워크플로: ecc | 감사·압축: ponytail·headroom). 반론 검증 court는 중요한 결정에만")
    print(f"  [코드·UI 작업] {', '.join(proj_ids)}")

    groups = open_observations()
    if groups:
        print("\n## 열린 스킬 관찰 (python Gon/gon.py review)")
        print("  " + ", ".join(f"{t}({len(r)})" for t, r in groups.items()))
    return 0


# ---------- 스킬 관찰 (skills/local/skill-observer 참고) ----------
# 작업 중 본 스킬의 문제를 한 줄로 남기고, 같은 대상에 REVIEW_AT개 이상 쌓이면 고칠 때다.
# 형식: - [날짜 시각] [누가] [대상] [관찰|처리] 내용   (대상: 스킬 id 또는 new:<새 스킬 이름>)

OBSERVATIONS = "observations.md"
REVIEW_AT = 2
OBS_LINE = re.compile(r"^- \[(?P<ts>[^\]]+)\] \[(?P<by>[^\]]+)\] \[(?P<target>[^\]]+)\] \[(?P<kind>관찰|처리)\] (?P<text>.*)$")


def read_observations() -> list[dict]:
    f = MEMORY / OBSERVATIONS
    lines = f.read_text(encoding="utf-8").splitlines() if f.exists() else []
    return [m.groupdict() for line in lines if (m := OBS_LINE.match(line))]


def open_observations() -> dict[str, list[dict]]:
    """대상별로, 그 대상의 마지막 '처리' 뒤에 쌓인 관찰."""
    groups: dict[str, list[dict]] = {}
    for row in read_observations():
        if row["kind"] == "처리":
            groups[row["target"]] = []
        else:
            groups.setdefault(row["target"], []).append(row)
    return {t: rows for t, rows in groups.items() if rows}


def write_observation(by: str, target: str, kind: str, text: str) -> None:
    MEMORY.mkdir(exist_ok=True)
    with (MEMORY / OBSERVATIONS).open("a", encoding="utf-8") as f:
        f.write(f"- [{date.today()} {time.strftime('%H:%M')}] [{by}] [{target}] [{kind}] {' '.join(text.split())}\n")


def split_by(args: list[str]) -> tuple[str, list[str]]:
    by = os.environ.get("GON_ACTOR", "ai")
    if len(args) >= 2 and args[0] == "--by":
        by, args = args[1], args[2:]
    return by, args


def known_target(target: str, registry: dict) -> bool:
    return target in registry or (target.startswith("new:") and len(target) > 4)


def cmd_observe(args: list[str]) -> int:
    """gon observe [--by claude|gemini] <스킬id|new:이름> "<일반화한 한 줄>" — 작업 중 본 스킬의 문제를 남긴다."""
    by, args = split_by(args)
    if len(args) < 2 or args[0] in ("-h", "--help") or not " ".join(args[1:]).strip():
        print('사용법: gon observe --by claude|gemini <스킬id | new:이름> "<무엇이 어땠고 어떤 규칙이 필요한지 한 줄>"', file=sys.stderr)
        return 2
    target, text = args[0], " ".join(args[1:])
    if not known_target(target, load()):
        print(f"[gon] 없는 대상: {target} (python Gon/gon.py catalog 의 id, 또는 new:<새 스킬 이름>)", file=sys.stderr)
        return 1
    write_observation(by, target, "관찰", text)
    n = len(open_observations().get(target, []))
    print(f"기록: {target} (열린 관찰 {n}개)")
    if n >= REVIEW_AT:
        print(f"! {target}에 관찰이 {n}개 쌓였다. `python Gon/gon.py review`로 점검한다. "
              "같은 규칙이 또 어겨진 것이라면 문구를 키우지 말고 구조적 장치(검증 단계, 체크리스트)로 바꾼다.")
    return 0


def cmd_review(args: list[str]) -> int:
    """gon review — 열린 관찰을 대상별로 보여 준다. gon review --done <대상> "<처리 내용>" — 처리했다고 닫는다."""
    if args and args[0] == "--done":
        by, rest = split_by(args[1:])
        if len(rest) < 2 or not " ".join(rest[1:]).strip():
            print('사용법: gon review --done [--by …] <대상> "<무엇을 고쳤거나 왜 버렸는지>"', file=sys.stderr)
            return 2
        target = rest[0]
        if target not in open_observations():
            print(f"[gon] 열린 관찰이 없는 대상: {target}", file=sys.stderr)
            return 1
        write_observation(by, target, "처리", " ".join(rest[1:]))
        print(f"닫음: {target}")
        return 0
    groups = open_observations()
    if not groups:
        print("열린 관찰이 없다.")
        return 0
    registry = load()

    def show(target: str, rows: list[dict]) -> None:
        s = registry.get(target)
        where = f" | 용도: {s['use_for']} | 파일: {entry_path(s) or '(외부 도구)'}" if s else " | 새 스킬 후보"
        print(f"### {target} ({len(rows)}개){where}")
        for r in rows:
            print(f"  - [{r['ts']}] [{r['by']}] {r['text']}")

    ready = {t: r for t, r in groups.items() if len(r) >= REVIEW_AT}
    later = {t: r for t, r in groups.items() if len(r) < REVIEW_AT}
    if ready:
        print(f"## 고칠 후보 (관찰 {REVIEW_AT}개 이상)")
        for t, rows in ready.items():
            show(t, rows)
    if later:
        print("\n## 더 지켜볼 것")
        for t, rows in later.items():
            show(t, rows)
    print("\n절차: 본문을 읽고 분류 → 개수와 함께 사용자에게 보이고 승인 → 로컬 스킬은 SKILL.md·use_for 수정, 외부 저장소 스킬은 레지스트리 guard·use_for에 메모 "
          "→ `python Gon/gon.py review --done <대상> \"<무엇을 했나>\"`  (자세한 기준: skills/local/skill-observer/SKILL.md)")
    return 0


# ---------- learn ----------

def cmd_learn(sid: str, use_for: str, triggers: str) -> int:
    registry = load()
    if sid in registry:
        print(f"이미 있음: {sid} → {entry_path(registry[sid])} 를 고쳐라")
        return 1
    skill = LOCAL / sid / "SKILL.md"
    if not skill.exists():
        skill.parent.mkdir(parents=True, exist_ok=True)
        skill.write_text(
            f"---\nname: {sid}\ndescription: {use_for}\n---\n\n# {sid}\n\n"
            "## 언제 쓰나\n\n## 입력\n\n## 순서\n1. \n\n## 결정 (X면 Y)\n\n## 완료의 정의\n\n## 예외 사례\n",
            encoding="utf-8",
        )
    registry[sid] = {
        "id": sid, "cluster": "local", "status": "local",
        "entry": skill.relative_to(HOME).as_posix(),
        "use_for": use_for, "triggers": [t.strip() for t in triggers.split(",") if t.strip()], "synergy": [],
    }
    save(registry)
    print(skill)
    return 0


# ---------- install (전역 /gon 및 /Gon 등록: Claude Code, Gemini CLI, Codex CLI) ----------

def command_body(arg: str) -> str:
    return (
        f"지금부터 이 요청을 Gon으로서 수행한다: {arg}\n\n"
        f"1. `{GON / 'GON.md'}`를 읽고 그대로 따른다. Gon 홈은 `{HOME}`이다.\n"
        f"2. `python -I \"{GON / 'gon.py'}\" recent`를 먼저 실행해 최근 이력과 개발자 코어 스킬(karpathy, ecc, ponytail, graphify, context7 등)을 확인한다.\n"
        "3. 현재 작업 디렉토리는 사용자의 프로젝트다. 산출물은 그곳에 만들고, Gon 홈에는 메모리·스킬만 기록한다.\n"
        f"4. 요청이 비어 있으면 `python -I \"{GON / 'gon.py'}\" doctor`로 상태를 점검하고, 서비스가 꺼져 있으면 `python -I \"{GON / 'gon.py'}\" run --no-open`을 백그라운드로 실행한 뒤 무엇을 할지 한 줄로 물어본다.\n"
    )


# Gon을 적용할 수 있는 AI 도구. 쓰지 않는 도구의 전역 설정은 건드리지 않도록 사용자가 고른 것만 적용한다.
# commands는 /gon 명령 파일(대소문자 둘 다), always는 모든 세션에 Gon을 켜는 전역 지침 파일이다.
TOOLS = {
    "claude": {"label": "Claude Code", "kind": "md", "always": ".claude/CLAUDE.md",
               "commands": (".claude/commands/gon.md", ".claude/commands/Gon.md")},
    "gemini": {"label": "Gemini CLI·Antigravity", "kind": "toml", "always": ".gemini/GEMINI.md",
               "commands": (".gemini/commands/gon.toml", ".gemini/commands/Gon.toml")},
    "codex": {"label": "Codex CLI", "kind": "md", "always": ".codex/AGENTS.md",
              "commands": (".codex/prompts/gon.md", ".codex/prompts/Gon.md")},
}
CHOICE = GON / "tools.local.json"  # 이 PC에서 고른 AI 도구 (커밋하지 않는다)


def detected_tools() -> list[str]:
    found = []
    for name in TOOLS:
        if find_tool(name) or (name == "gemini" and (find_tool("agy") or (Path.home() / ".gemini").exists())):
            found.append(name)
    return found


def load_choice() -> list[str] | None:
    try:
        names = json.loads(CHOICE.read_text(encoding="utf-8"))["tools"]
    except (OSError, ValueError, KeyError):
        return None
    return [n for n in names if n in TOOLS] or None


def parse_tools(args: list[str]) -> tuple[list[str] | None, bool]:
    """--tools claude,gemini 또는 환경변수 GON_TOOLS. (이름 목록 또는 None, 이름이 올바른가)"""
    raw = None
    if "--tools" in args and args.index("--tools") + 1 < len(args):
        raw = args[args.index("--tools") + 1]
    raw = raw or os.environ.get("GON_TOOLS")
    if not raw:
        return None, True
    names = [n.strip().lower() for n in raw.replace(" ", ",").split(",") if n.strip()]
    bad = [n for n in names if n not in TOOLS]
    if bad or not names:
        print(f"[gon] 알 수 없는 AI: {bad or raw} (선택 가능: {', '.join(TOOLS)})", file=sys.stderr)
        return None, False
    return list(dict.fromkeys(names)), True


def choose_tools(args: list[str]) -> list[str] | None:
    """Gon을 적용할 AI 도구를 정한다: 명령줄·환경변수 > 저장된 선택 > 터미널이면 질문. 정하지 못하면 None."""
    names, ok = parse_tools(args)
    if not ok:
        return None
    if names is None:
        names = load_choice()
    if names is None:
        found = detected_tools()
        if not sys.stdin.isatty():
            options = ", ".join(k + "(" + v["label"] + ")" for k, v in TOOLS.items())
            print("[gon] Gon을 적용할 AI를 아직 정하지 않았다. 사용자에게 어떤 AI를 쓰는지 물은 뒤 실행해라:\n"
                  f"  python Gon/gon.py install --tools {','.join(found[:2]) or 'claude'}\n"
                  f"  선택 가능: {options} | 이 PC에서 감지됨: {', '.join(found) or '없음'}",
                  file=sys.stderr)
            return None
        print("Gon을 적용할 AI를 고르세요. 고른 도구의 전역 설정만 바꿉니다.")
        for k, v in TOOLS.items():
            print(f"  {k:7} {v['label']}{'  (감지됨)' if k in found else ''}")
        try:
            answer = input(f"쉼표로 입력 (예: claude,gemini) [Enter = 감지된 것 전체: {', '.join(found) or '없음'}]: ").strip()
        except EOFError:
            answer = ""
        names, ok = parse_tools(["--tools", answer]) if answer else (found, True)
        if not ok or not names:
            return None
    CHOICE.write_text(json.dumps({"tools": names}, ensure_ascii=False) + "\n", encoding="utf-8")
    return names


def cmd_install(args: list[str] | None = None) -> int:
    tools = choose_tools(args or [])
    if tools is None:
        return 2
    md_content = "---\ndescription: Gon 에이전트로 요청을 수행한다\nargument-hint: [요청]\n---\n\n" + command_body("$ARGUMENTS")
    toml_content = 'description = "Gon 에이전트로 요청을 수행한다"\nprompt = """\n' + command_body("{{args}}") + '"""\n'
    for name in tools:
        body = toml_content if TOOLS[name]["kind"] == "toml" else md_content
        for rel in TOOLS[name]["commands"]:
            path = Path.home() / rel
            path.parent.mkdir(parents=True, exist_ok=True)
            path.write_text(body, encoding="utf-8")
            print(f"등록: {path}")
    return cmd_doctor()


# ---------- run (Gon 서비스 실행) ----------

BACKEND_PORT, FRONTEND_PORT = 8000, 5173


def port_busy(port: int) -> bool:
    for host in ("127.0.0.1", "::1"):
        fam = socket.AF_INET6 if ":" in host else socket.AF_INET
        with socket.socket(fam, socket.SOCK_STREAM) as s:
            s.settimeout(0.3)
            if s.connect_ex((host, port)) == 0:
                return True
    return False


def stop(p: subprocess.Popen) -> None:
    if p.poll() is not None:
        return
    if os.name == "nt":  # npm이 띄운 node까지 트리째 종료
        subprocess.run(["taskkill", "/T", "/F", "/PID", str(p.pid)], capture_output=True)
    else:
        p.terminate()


def cmd_run(open_browser: bool = True) -> int:
    be, fe = HOME / "backend", HOME / "frontend"
    if not (be / "app" / "main.py").exists() or not (fe / "package.json").exists():
        print("이 폴더에 backend/, frontend/ 가 없다. Gon 저장소 루트에서 실행해라.")
        return 1

    # 1) 의존성: 없을 때만 설치
    if subprocess.run([sys.executable, "-c", "import fastapi, uvicorn"], capture_output=True).returncode:
        print("[gon] 백엔드 패키지 설치 중...")
        if subprocess.run([sys.executable, "-m", "pip", "install", "-q", "-r", str(be / "requirements.txt")]).returncode:
            return 1
    npm = shutil.which("npm")
    if not npm:
        print("Node.js(npm)가 필요하다. https://nodejs.org 에서 설치한 뒤 다시 실행해라.")
        return 1
    if not (fe / "node_modules").exists():
        print("[gon] 프론트엔드 패키지 설치 중...")
        if subprocess.run([npm, "install"], cwd=fe).returncode:
            return 1

    # 2) 포트: 이전 서버가 남아 있으면 옛 코드가 응답한다 (화면이 안 뜨는 원인이 된 적 있음)
    busy = [p for p in (BACKEND_PORT, FRONTEND_PORT) if port_busy(p)]
    if busy:
        print(f"포트 {busy}가 이미 사용 중이다. 이전에 띄운 서버를 종료한 뒤 다시 실행해라.")
        return 1

    # 3) 실행
    env = {**os.environ, "PYTHONPATH": str(be)}
    procs = [
        subprocess.Popen([sys.executable, str(be / "app" / "main.py")], cwd=HOME, env=env),
        subprocess.Popen([npm, "run", "dev", "--", "--port", str(FRONTEND_PORT), "--strictPort"], cwd=fe),
    ]
    url = f"http://localhost:{FRONTEND_PORT}/"
    try:
        for _ in range(60):
            if any(p.poll() is not None for p in procs):
                print("서버가 시작 직후 종료됐다. 위 오류 메시지를 확인해라.")
                return 1
            try:
                urllib.request.urlopen(f"http://127.0.0.1:{BACKEND_PORT}/health", timeout=1)
                urllib.request.urlopen(url, timeout=1)
                break
            except Exception:
                time.sleep(0.5)
        else:
            print("30초 안에 서버가 응답하지 않았다.")
            return 1
        print(f"\n[gon] 실행 중: {url}  (종료: Ctrl+C)")
        if open_browser:
            webbrowser.open(url)
        while all(p.poll() is None for p in procs):
            time.sleep(1)
        return 1
    except KeyboardInterrupt:
        return 0
    finally:
        for p in procs:
            stop(p)


def cmd_stop() -> int:
    """포트를 잡고 있는 서비스 프로세스를 트리째 종료한다."""
    killed = 0
    for port in (BACKEND_PORT, FRONTEND_PORT):
        if os.name == "nt":
            out = subprocess.run(["netstat", "-ano"], capture_output=True, text=True).stdout
            pids = {ln.split()[-1] for ln in out.splitlines() if f":{port} " in ln and "LISTENING" in ln}
            for pid in pids:
                killed += subprocess.run(["taskkill", "/T", "/F", "/PID", pid], capture_output=True).returncode == 0
        else:
            out = subprocess.run(["lsof", "-ti", f":{port}"], capture_output=True, text=True).stdout.split()
            for pid in out:
                killed += subprocess.run(["kill", pid], capture_output=True).returncode == 0
    print(f"[gon] 종료한 프로세스 {killed}개" if killed else "[gon] 실행 중인 서비스가 없다")
    return 0


BEGIN, END = "<!-- gon:begin -->", "<!-- gon:end -->"


def always_file(name: str) -> Path:
    return Path.home() / TOOLS[name]["always"]


def cmd_always(on: bool, args: list[str] | None = None) -> int:
    """전역 지침 파일에 Gon 블록을 넣거나 뺀다. 블록 밖의 사용자 내용은 건드리지 않는다.

    켤 때는 고른 AI의 파일만 바꾼다. 끌 때는 --tools가 없으면 모든 AI에서 Gon 블록을 걷어낸다.
    """
    args = args or []
    if on:
        tools = choose_tools(args)
    else:
        tools, ok = parse_tools(args)
        tools = list(TOOLS) if ok and tools is None else tools
    if tools is None:
        return 2
    block = (
        f"{BEGIN}\n# Gon (항상 적용)\n"
        "모든 세션에서 너는 비서 에이전트 Gon이다. 아래 프로토콜을 따른다. "
        "현재 프로젝트의 지침과 충돌하면 프로젝트 지침이 우선한다.\n\n"
        f"@{(GON / 'GON.md').as_posix()}\n{END}\n"
    )
    for name in tools:
        path = always_file(name)
        text = path.read_text(encoding="utf-8") if path.exists() else ""
        if not on and BEGIN not in text:
            continue
        if BEGIN in text:
            text = text[: text.index(BEGIN)] + text[text.index(END) + len(END):].lstrip("\n")
        if on:
            text = (text.rstrip() + "\n\n" if text.strip() else "") + block
        if not on and not text.strip():  # Gon 블록만 있던 파일은 지운다
            path.unlink()
            print(f"해제: {path} (비어서 삭제)")
            continue
        path.parent.mkdir(parents=True, exist_ok=True)
        path.write_text(text, encoding="utf-8")
        print(f"{'적용' if on else '해제'}: {path}")
    return 0


def cmd_doctor() -> int:
    registry = load()
    present = {r for s in registry.values() if (r := repo_of(s)) and (REPOS / r).exists()}
    needed = {r for s in registry.values() if (r := repo_of(s))}
    broken = [sid for sid, s in registry.items() if repo_of(s) in present and not entry_path(s).exists()]
    tools = {t: bool(find_tool(t)) for t in ("git", "agy", "claude", "gemini", "codex")}
    print(f"Gon 홈: {HOME}")
    print(f"스킬 {len(registry)}개 | 저장소 {len(present)}/{len(needed)} 설치 (나머지는 쓸 때 자동으로 받음)")
    print(f"경로 깨짐: {broken or '없음'}")
    up = port_busy(BACKEND_PORT) and port_busy(FRONTEND_PORT)
    print(f"서비스: {'실행 중 http://localhost:' + str(FRONTEND_PORT) if up else '꺼짐 (python Gon/gon.py run)'}")
    print("도구: " + ", ".join(f"{t}={'O' if ok else 'X'}" for t, ok in tools.items()))
    chosen = load_choice()
    print(f"적용할 AI: {', '.join(chosen) if chosen else '아직 안 정함 (python Gon/gon.py install)'}")
    for name in chosen or []:
        p = Path.home() / TOOLS[name]["commands"][0]
        print(f"전역 /gon ({name}): {p} {'O' if p.exists() else 'X (python Gon/gon.py install)'}")
        a = always_file(name)
        on = a.exists() and BEGIN in a.read_text(encoding="utf-8")
        print(f"상시 적용 ({name}): {a} {'O' if on else 'X (python Gon/gon.py always on)'}")
    for name in TOOLS:
        a = always_file(name)
        if name not in (chosen or []) and a.exists() and BEGIN in a.read_text(encoding="utf-8"):
            print(f"! 고르지 않은 {name}에 Gon이 상시 적용돼 있다: python Gon/gon.py always off --tools {name}")
    return 1 if broken else 0


if __name__ == "__main__":
    sys.stdout.reconfigure(encoding="utf-8")
    sys.stderr.reconfigure(encoding="utf-8")
    a = sys.argv[1:]
    cmd = a[0] if a else "doctor"
    if cmd == "catalog":
        sys.exit(cmd_catalog())
    if cmd == "pick" and len(a) > 1:
        sys.exit(cmd_pick([i for x in a[1:] for i in x.replace(",", " ").split()]))
    if cmd == "fetch" and len(a) > 1:
        names = list(json.loads(MANIFEST.read_text(encoding="utf-8"))) if a[1] == "all" else a[1:]
        sys.exit(1 if fetch(names) else 0)
    if cmd == "remember" and len(a) > 1:
        sys.exit(append("MEMORY.md", " ".join(a[1:])))
    if cmd == "log":
        sys.exit(cmd_log(a[1:]))
    if cmd == "recent":
        sys.exit(cmd_recent(int(a[1]) if len(a) > 1 and a[1].isdigit() else 10))
    if cmd == "observe":
        sys.exit(cmd_observe(a[1:]))
    if cmd == "review":
        sys.exit(cmd_review(a[1:]))
    if cmd == "learn" and len(a) == 4:
        sys.exit(cmd_learn(*a[1:]))
    if cmd == "install":
        sys.exit(cmd_install(a[1:]))
    if cmd == "always" and len(a) >= 2 and a[1] in ("on", "off"):
        sys.exit(cmd_always(a[1] == "on", a[2:]))
    if cmd == "stop":
        sys.exit(cmd_stop())
    if cmd == "run":
        sys.exit(cmd_run("--no-open" not in a))
    if cmd == "doctor":
        sys.exit(cmd_doctor())
    print(__doc__)
    sys.exit(2)
