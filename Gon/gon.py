"""
Gon CLI — 스킬 라우팅, 지연 설치, 메모리, 전역 /Gon 등록을 한 파일로.

    python Gon/gon.py catalog            스킬 목록(id | 용도). AI가 요구사항을 분석해 여기서 고른다
    python Gon/gon.py pick <id> [id…]    고른 스킬의 경로 출력 (없는 저장소는 자동으로 받고, 항상 적용 핵심을 덧붙임)
    python Gon/gon.py fetch <id|all>     스킬 저장소 받기 (shallow)
    python Gon/gon.py remember "<사실>"  장기 메모리에 한 줄 추가
    python Gon/gon.py log "<한 줄>"      작업 이력에 한 줄 추가
    python Gon/gon.py learn <id> "<용도>" "<트리거,…>"   로컬 스킬 생성·등록
    python Gon/gon.py install            어느 프로젝트에서든 /Gon 쓰도록 전역 명령 등록
    python Gon/gon.py always on|off      /Gon 없이 모든 세션에 Gon 상시 적용 / 해제
    python Gon/gon.py doctor             설치 상태 점검
    python Gon/gon.py run                서비스 준비(의존성 설치) + 백엔드·프론트 서버 실행
    python Gon/gon.py stop               실행 중인 서비스 종료
"""

import json
import os
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
    tag = {"always": " [항상 적용]", "project": " [코드·UI 작업]"}
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
    # 항상 적용 핵심(ECC 검증·코딩 표준, karpathy)은 고르지 않아도 붙는다
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


# ---------- install (전역 /Gon) ----------

def command_body(arg: str) -> str:
    return (
        f"지금부터 이 요청을 Gon으로서 수행한다: {arg}\n\n"
        f"1. `{GON / 'GON.md'}`를 읽고 그대로 따른다. Gon 홈은 `{HOME}`이다.\n"
        "2. 현재 작업 디렉토리는 사용자의 프로젝트다. 산출물은 그곳에 만들고, Gon 홈에는 메모리·스킬만 기록한다.\n"
        "3. 요청이 비어 있으면 무엇을 할지 한 줄로 물어본다.\n"
    )


def cmd_install() -> int:
    targets = {
        Path.home() / ".claude" / "commands" / "Gon.md":
            "---\ndescription: Gon 에이전트로 요청을 수행한다\nargument-hint: <요청>\n---\n\n" + command_body("$ARGUMENTS"),
        Path.home() / ".gemini" / "commands" / "Gon.toml":
            'description = "Gon 에이전트로 요청을 수행한다"\nprompt = """\n' + command_body("{{args}}") + '"""\n',
    }
    for path, body in targets.items():
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
                urllib.request.urlopen(f"http://127.0.0.1:{BACKEND_PORT}/api/office/layout", timeout=1)
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


ALWAYS_FILES = (Path.home() / ".claude" / "CLAUDE.md", Path.home() / ".gemini" / "GEMINI.md")
BEGIN, END = "<!-- gon:begin -->", "<!-- gon:end -->"


def cmd_always(on: bool) -> int:
    """전역 지침 파일에 Gon 블록을 넣거나 뺀다. 블록 밖의 사용자 내용은 건드리지 않는다."""
    block = (
        f"{BEGIN}\n# Gon (항상 적용)\n"
        "모든 세션에서 너는 비서 에이전트 Gon이다. 아래 프로토콜을 따른다. "
        "현재 프로젝트의 지침과 충돌하면 프로젝트 지침이 우선한다.\n\n"
        f"@{(GON / 'GON.md').as_posix()}\n{END}\n"
    )
    for path in ALWAYS_FILES:
        text = path.read_text(encoding="utf-8") if path.exists() else ""
        if BEGIN in text:
            text = text[: text.index(BEGIN)] + text[text.index(END) + len(END):].lstrip("\n")
        if on:
            text = (text.rstrip() + "\n\n" if text.strip() else "") + block
        path.parent.mkdir(parents=True, exist_ok=True)
        path.write_text(text, encoding="utf-8")
        print(f"{'적용' if on else '해제'}: {path}")
    return 0


def cmd_doctor() -> int:
    registry = load()
    present = {r for s in registry.values() if (r := repo_of(s)) and (REPOS / r).exists()}
    needed = {r for s in registry.values() if (r := repo_of(s))}
    broken = [sid for sid, s in registry.items() if repo_of(s) in present and not entry_path(s).exists()]
    tools = {t: bool(shutil.which(t)) for t in ("git", "agy", "claude", "gemini")}
    print(f"Gon 홈: {HOME}")
    print(f"스킬 {len(registry)}개 | 저장소 {len(present)}/{len(needed)} 설치 (나머지는 쓸 때 자동으로 받음)")
    print(f"경로 깨짐: {broken or '없음'}")
    up = port_busy(BACKEND_PORT) and port_busy(FRONTEND_PORT)
    print(f"서비스: {'실행 중 http://localhost:' + str(FRONTEND_PORT) if up else '꺼짐 (python Gon/gon.py run)'}")
    print("도구: " + ", ".join(f"{t}={'O' if ok else 'X'}" for t, ok in tools.items()))
    for p in (Path.home() / ".claude/commands/Gon.md", Path.home() / ".gemini/commands/Gon.toml"):
        print(f"전역 /Gon: {p} {'O' if p.exists() else 'X (python Gon/gon.py install)'}")
    for p in ALWAYS_FILES:
        on = p.exists() and BEGIN in p.read_text(encoding="utf-8")
        print(f"상시 적용: {p} {'O' if on else 'X (python Gon/gon.py always on)'}")
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
    if cmd in ("remember", "log") and len(a) > 1:
        sys.exit(append("MEMORY.md" if cmd == "remember" else "log.md", " ".join(a[1:])))
    if cmd == "learn" and len(a) == 4:
        sys.exit(cmd_learn(*a[1:]))
    if cmd == "install":
        sys.exit(cmd_install())
    if cmd == "always" and len(a) == 2 and a[1] in ("on", "off"):
        sys.exit(cmd_always(a[1] == "on"))
    if cmd == "stop":
        sys.exit(cmd_stop())
    if cmd == "run":
        sys.exit(cmd_run("--no-open" not in a))
    if cmd == "doctor":
        sys.exit(cmd_doctor())
    print(__doc__)
    sys.exit(2)
