"""QA 루프(긍정·부정 평가 → QA 재배포 → 수정 → QA 재확인), 인터뷰, 스킬 탐색 연결을 가짜 AI로 검증한다."""

import json

import pytest

from app.core import interview, pipeline, qa, roles, skillfinder


def _team():
    return [
        {"id": "karpathy", "name": "클린 코드 설계자", "task": "구조 설계", "done_when": "구조도가 있다", "lens_ko": "개발자 관점"},
        {"id": "taste", "name": "웹 아트디렉터", "task": "화면 시안", "done_when": "", "lens_ko": "서비스 관점"},
    ]


class FakeAI:
    """프롬프트의 역할로 구분해 정해진 JSON을 돌려준다. verify_pass가 False면 재확인에서 한 번 실패시킨다."""

    def __init__(self, verify_results=("pass",)):
        self.calls = []
        self.verify_results = list(verify_results)

    def ask(self, prompt, timeout=120, images=None, model=None, via=None, web=False):
        if "'긍정 평가자'" in prompt:
            self.calls.append("advocate")
            return json.dumps({"reviews": [{"id": "karpathy", "verdict": "pass", "strengths": ["구조가 명확"], "issues": []},
                                           {"id": "taste", "verdict": "pass", "strengths": ["톤이 일관"], "issues": []}], "cross": []})
        if "'부정 평가자'" in prompt:
            self.calls.append("critic")
            return json.dumps({"reviews": [{"id": "karpathy", "verdict": "revise", "strengths": [],
                                            "issues": [{"severity": "critical", "point": "출처 없는 수치", "fix": "수치를 빼거나 확인 필요로"}]},
                                           {"id": "taste", "verdict": "pass", "strengths": [], "issues": []}], "cross": ["둘의 용어가 다름"]})
        if "고칠 일을 정해 나눠" in prompt:
            self.calls.append("triage")
            return json.dumps({"assignments": [{"id": "karpathy", "must_fix": ["출처 없는 수치 제거"], "keep": ["구조도"], "note": "critical 우선"}],
                               "conflicts": ["용어 통일"], "summary": "1명 수정"})
        if "QA 수정 요청" in prompt:
            self.calls.append("revise")
            return "수정본: 구조도 + 확인 필요 표시"
        if "하나씩 확인하세요" in prompt:
            self.calls.append("verify")
            verdict = self.verify_results.pop(0) if self.verify_results else "pass"
            if verdict == "pass":
                return json.dumps({"checks": [{"id": "karpathy", "resolved": ["수치 제거"], "unresolved": [], "new_issues": [], "verdict": "pass"}], "note": "반영됨"})
            return json.dumps({"checks": [{"id": "karpathy", "resolved": [], "unresolved": ["출처 없는 수치 제거"], "new_issues": [], "verdict": "fail"}], "note": "덜 고쳐짐"})
        raise AssertionError("알 수 없는 프롬프트: " + prompt[:80])


def _run(monkeypatch, fake, depth="normal"):
    monkeypatch.setattr(qa.llm, "ask", fake.ask)
    texts = {"karpathy": "원래 결과 (수치 70%)", "taste": "시안 설명"}
    gen = qa.run("요청", _team(), texts, {"karpathy": "원래 프롬프트", "taste": "원래 프롬프트2"}, depth, None, 2)
    events = []
    try:
        while True:
            events.append(next(gen))
    except StopIteration as stop:
        return events, stop.value, texts


def test_qa_loop_review_triage_revise_verify_order(monkeypatch):
    fake = FakeAI()
    events, report, texts = _run(monkeypatch, fake)
    assert set(fake.calls[:2]) == {"advocate", "critic"}  # 두 평가자는 병렬로 먼저
    assert fake.calls[2:] == ["triage", "revise", "verify"]
    types = [e["type"] + ":" + str(e.get("stage") or e.get("status") or "") for e in events]
    assert types[0] == "review:start"
    assert "qa:triage" in types and "qa:verify" in types
    assert texts["karpathy"].startswith("수정본")  # 수정본이 제자리에 반영된다
    assert texts["taste"] == "시안 설명"  # 평가를 통과한 전문가는 그대로
    assert report["revised"] == ["karpathy"] and report["passed"] == ["karpathy"] and report["unresolved"] == {}
    assert any(e["type"] == "agent" and e.get("revised") for e in events)


def test_critical_issue_reaches_must_fix_even_if_advocate_passes(monkeypatch):
    fake = FakeAI()
    events, _, _ = _run(monkeypatch, fake)
    triage = next(e for e in events if e["type"] == "qa" and e["stage"] == "triage")
    assert [a["id"] for a in triage["assignments"]] == ["karpathy"]
    assert triage["assignments"][0]["must_fix"] == ["출처 없는 수치 제거"]


def test_failed_verify_loops_again_only_in_deep(monkeypatch):
    normal = FakeAI(verify_results=("fail",))
    _, report, _ = _run(monkeypatch, normal, "normal")
    assert normal.calls.count("revise") == 1 and report["rounds"] == 1
    assert report["unresolved"] == {"karpathy": ["출처 없는 수치 제거"]}  # 못 고친 것은 숨기지 않고 남긴다

    deep = FakeAI(verify_results=("fail", "pass"))
    _, report2, _ = _run(monkeypatch, deep, "deep")
    assert deep.calls.count("revise") == 2 and report2["rounds"] == 2
    assert report2["passed"] == ["karpathy"] and report2["unresolved"] == {}


def test_qa_skips_when_both_reviewers_fail(monkeypatch):
    def boom(*a, **k):
        raise qa.llm.LLMError("fail")

    monkeypatch.setattr(qa.llm, "ask", boom)
    texts = {"karpathy": "a", "taste": "b"}
    gen = qa.run("요청", _team(), texts, {}, "normal", None, 2)
    events, report = [], None
    try:
        while True:
            events.append(next(gen))
    except StopIteration as stop:
        report = stop.value
    assert report["ran"] is False and "건너뛰" in report["skipped"]
    assert texts == {"karpathy": "a", "taste": "b"}


def test_triage_fallback_uses_review_issues_when_qa_fails(monkeypatch):
    class Fake(FakeAI):
        def ask(self, prompt, *a, **k):
            if "고칠 일을 정해 나눠" in prompt:
                raise qa.llm.LLMError("QA down")
            return super().ask(prompt, *a, **k)

    events, report, _ = _run(monkeypatch, Fake())
    triage = next(e for e in events if e["type"] == "qa" and e["stage"] == "triage")
    assert [a["id"] for a in triage["assignments"]] == ["karpathy"]
    assert report["revised"] == ["karpathy"]


def test_parse_review_drops_unknown_ids_and_bad_severity():
    out = qa.parse_review(json.dumps({"reviews": [
        {"id": "ghost", "issues": [{"point": "x"}]},
        {"id": "karpathy", "verdict": "revise", "issues": [{"severity": "weird", "point": "p", "fix": "f"}, {"point": ""}]}]}), ["karpathy"])
    assert list(out["reviews"]) == ["karpathy"]
    assert out["reviews"]["karpathy"]["issues"] == [{"severity": "major", "point": "p", "fix": "f"}]


def test_report_for_lead_discloses_unresolved():
    note = qa.report_for_lead({"ran": True, "rounds": 1, "reviewed": ["a", "b"], "revised": ["a"], "passed": [], "summary": "s",
                               "conflicts": ["c"], "unresolved": {"a": ["남은 문제"]}}, {"a": "A전문가"})
    assert "미해결(A전문가): 남은 문제" in note and "전문가 간 충돌: c" in note
    assert qa.report_for_lead({"ran": False}, {}) == ""


def test_roles_bind_skills_and_prompts():
    assert "grill-me" in roles.skill_ids("interviewer") and "find-skills" in roles.skill_ids("skill_finder")
    assert "court" in roles.skill_ids("critic")
    assert roles.public("qa")["name"] == "QA 담당"
    assert "Never fabricate" in roles.core()


# ---------- 인터뷰 ----------

def test_interview_parse_adds_recommended_to_options_and_caps_questions():
    out = interview.parse(json.dumps({"ready": False, "questions": [
        {"title": f"질문{i}", "body": "b", "options": ["가", "나"], "recommended": "다"} for i in range(6)]}), 1)
    assert out["ready"] is False and len(out["questions"]) == interview.MAX_QUESTIONS
    assert out["questions"][0]["options"][0] == "다" and out["questions"][0]["id"] == "r1q1"


def test_interview_last_round_always_ready():
    out = interview.parse(json.dumps({"ready": False, "questions": [{"title": "q", "options": []}], "brief": "명세"}), interview.MAX_ROUNDS)
    assert out["ready"] is True and out["questions"] == [] and out["brief"] == "명세"


def test_interview_run_is_ready_without_ai_and_on_bad_output(monkeypatch):
    assert interview.run("요청")["ready"] is True  # 테스트는 stub이라 AI가 없다
    monkeypatch.setattr(interview.llm, "available", lambda: True)
    monkeypatch.setattr(interview.llm, "check_model", lambda m: None)
    monkeypatch.setattr(interview.llm, "ask", lambda *a, **k: "JSON 아님")
    out = interview.run("요청")
    assert out["ready"] is True and out["brief"] == ""


def test_interview_enrich_keeps_original_and_adds_brief():
    assert interview.enrich("요청", "", []) == "요청"
    text = interview.enrich("요청", "목적: X", [{"title": "독자", "answer": "초보"}])
    assert text.startswith("요청") and "목적: X" in text and "독자: 초보" in text


# ---------- 스킬 탐색 ----------

def test_skillfinder_rejects_bad_ref_and_cleans_gaps():
    assert skillfinder.install("rm -rf /")["ok"] is False
    gaps = skillfinder.parse_gaps([{"need": "법률 검토", "query": "legal; rm -rf contract review"}, {"need": "", "query": "x"}, "bad"])
    assert gaps == [{"need": "법률 검토", "query": "legal  rm -rf contract review"}]


# ---------- 파이프라인 전체 ----------

def test_pipeline_runs_full_loop_with_fake_ai(monkeypatch):
    fake = FakeAI()
    plan = json.dumps({"route": "team", "intent": "i", "reason": "r", "sub_questions": ["q"],
                       "experts": [{"id": "karpathy", "lens": "dev", "task": "t", "done_when": "구조도가 있다"},
                                   {"id": "taste", "lens": "service", "task": "t2"}],
                       "missing_capabilities": [{"need": "법률 검토", "query": "legal review"}]})

    def ask(prompt, timeout=120, images=None, model=None, via=None, web=False):
        if "총괄 아키텍트" in prompt:
            return plan
        if "[작업 지침]" in prompt and "QA 수정 요청" not in prompt:
            return "전문가 초안"
        if "질문 코칭" in prompt or "다음엔 요청에 무엇을" in prompt:
            return "코칭"
        return fake.ask(prompt, timeout, images, model, via, web)

    monkeypatch.setattr(pipeline.llm, "available", lambda: True)
    monkeypatch.setattr(pipeline.llm, "check_model", lambda m: None)
    monkeypatch.setattr(pipeline.llm, "ask", ask)
    monkeypatch.setattr(qa.llm, "ask", ask)
    monkeypatch.setattr(pipeline.llm, "stream", lambda *a, **k: iter(["최종", " 답"]))
    monkeypatch.setattr(pipeline.skillfinder, "find_gap", lambda g: {"need": g["need"], "query": g["query"], "candidates": [{"ref": "o/r@legal", "installs": "1K", "url": "u"}]})

    events = list(pipeline.run("요청", depth="normal", brief="확정 명세", answers=[{"title": "독자", "answer": "초보"}]))
    types = [e["type"] for e in events]
    # 순서: 전문가 작업 → 평가 → QA → 수정 → 재확인 → 스킬 후보 → 종합
    assert types.index("agent") < types.index("review") < types.index("qa") < types.index("revise") < types.index("skill_gap") < types.index("synthesis")
    final = events[-1]["data"]
    assert final["final_content"] == "최종 답" and final["query"] == "요청"
    assert final["qa"]["revised"] == ["karpathy"] and final["agent_logs"]["karpathy"]["revised"] is True
    assert final["skill_gaps"][0]["candidates"][0]["ref"] == "o/r@legal"
    plan_event = next(e for e in events if e["type"] == "plan")
    assert plan_event["experts"][0]["done_when"] == "구조도가 있다"


def test_stub_mode_skips_qa():
    events = list(pipeline.run("테스트 요청입니다"))
    assert not any(e["type"] in ("review", "qa", "revise", "skill_gap") for e in events)
    assert events[-1]["data"]["qa"] is None


# ---------- 서비스.md 9~12단계: 추가 전문가 투입, 단계(phase), 서브 AI 분담, 최종 점검 ----------

def test_qa_adds_extra_expert_verifies_it_and_collects_gaps(monkeypatch):
    class Fake(FakeAI):
        def ask(self, prompt, timeout=120, images=None, model=None, via=None, web=False):
            if "고칠 일을 정해 나눠" in prompt:
                self.calls.append("triage")
                return json.dumps({"assignments": [], "additions": [{"id": "ghost", "task": "x"}, {"id": "court", "task": "반론 검증", "done_when": "반론 3개"}],
                                   "missing_capabilities": [{"need": "법률 검토", "query": "legal review"}], "summary": "s"})
            if prompt == "추가 프롬프트":
                self.calls.append("added")
                return "추가 결과"
            if "하나씩 확인하세요" in prompt:
                self.calls.append("verify")
                return json.dumps({"checks": [{"id": "court", "resolved": ["반론 3개"], "unresolved": [], "new_issues": [], "verdict": "pass"}], "note": "ok"})
            return super().ask(prompt, timeout, images, model, via, web)

    extras = {"catalog": "court | 반론 검증관 | x", "addable": {"court"},
              "member": lambda eid, task, dw: {"id": eid, "name": "반론 검증관", "task": task, "done_when": dw, "lens_ko": "개발자 관점", "via": None, "public": {"id": eid}},
              "prompt": lambda m: "추가 프롬프트"}
    monkeypatch.setattr(qa.llm, "ask", Fake().ask)
    team = _team()
    texts = {"karpathy": "a", "taste": "b"}
    gen = qa.run("요청", team, texts, {}, "normal", None, 2, extras)
    events = []
    try:
        while True:
            events.append(next(gen))
    except StopIteration as stop:
        report = stop.value
    triage = next(e for e in events if e["type"] == "qa" and e["stage"] == "triage")
    assert [a["id"] for a in triage["additions"]] == ["court"]  # 후보에 없는 id(ghost)는 버린다
    assert any(e["type"] == "plan_add" for e in events)
    assert any(e["type"] == "agent" and e.get("added") for e in events)
    assert texts["court"] == "추가 결과" and team[-1]["id"] == "court"
    assert report["added"] == ["court"] and report["passed"] == ["court"]
    assert report["gaps"] == [{"need": "법률 검토", "query": "legal review"}]


def _pipeline_ai(monkeypatch, plan, prompts, vias):
    def ask(prompt, timeout=120, images=None, model=None, via=None, web=False):
        if "총괄 아키텍트" in prompt:
            return json.dumps(plan)
        if "[작업 지침]" in prompt:
            prompts.append(prompt)
            vias.append(via)
            return "초안 " + str(len(prompts))
        if "다음엔 요청에 무엇을" in prompt:
            return "코칭"
        if "마지막으로 점검합니다" in prompt:
            return json.dumps({"verdict": "pass", "checks": [{"item": "요구사항", "ok": True, "note": "ok"}], "notes": []})
        if "'긍정 평가자'" in prompt or "'부정 평가자'" in prompt:
            return json.dumps({"reviews": [], "cross": []})
        if "고칠 일을 정해 나눠" in prompt:
            return json.dumps({"assignments": [], "summary": "ok"})
        raise AssertionError(prompt[:60])

    monkeypatch.setattr(pipeline.llm, "available", lambda: True)
    monkeypatch.setattr(pipeline.llm, "check_model", lambda m: None)
    monkeypatch.setattr(pipeline.llm, "ask", ask)
    monkeypatch.setattr(qa.llm, "ask", ask)
    monkeypatch.setattr(pipeline.llm, "stream", lambda *a, **k: iter(["최종"]))


def test_later_phase_receives_earlier_results_and_final_qa_runs(monkeypatch):
    prompts, vias = [], []
    plan = {"route": "team", "intent": "i", "reason": "r", "sub_questions": [],
            "experts": [{"id": "karpathy", "lens": "dev", "task": "설계", "phase": 2}, {"id": "firecrawl", "lens": "service", "task": "조사", "phase": 1}]}
    _pipeline_ai(monkeypatch, plan, prompts, vias)
    monkeypatch.setattr(pipeline.llm, "sub_cli_for", lambda via: ("agy", "x") if via == "gemini" else None)
    events = list(pipeline.run("요청", depth="fast"))
    assert len(prompts) == 2
    assert "앞 단계 팀원들의 결과" not in prompts[0] and "앞 단계 팀원들의 결과" in prompts[1] and "초안 1" in prompts[1]  # 조사(1단계) → 설계(2단계)
    assert vias == ["gemini", None]  # 조사 전문가(research)는 연결된 서브 Gemini에, 개발 전문가는 메인에
    final_ev = next(e for e in events if e["type"] == "qa" and e["stage"] == "final")
    assert final_ev["verdict"] == "pass"
    assert events[-1]["data"]["qa"]["final"]["verdict"] == "pass"
    plan_ev = next(e for e in events if e["type"] == "plan")
    assert {x["id"]: x["via"] for x in plan_ev["experts"]} == {"karpathy": None, "firecrawl": "gemini"}


def test_no_routing_without_connected_sub_ai(monkeypatch):
    prompts, vias = [], []
    plan = {"route": "team", "intent": "i", "reason": "r", "sub_questions": [], "experts": [{"id": "firecrawl", "lens": "service", "task": "조사"}]}
    _pipeline_ai(monkeypatch, plan, prompts, vias)
    monkeypatch.setattr(pipeline.llm, "sub_cli_for", lambda via: None)
    list(pipeline.run("요청", depth="fast"))
    assert vias == [None]


def test_sub_cli_for_only_for_connected_sub(monkeypatch):
    import json as j
    import tempfile
    from pathlib import Path
    from app.core import llm
    d = tempfile.mkdtemp()
    f = Path(d) / "tools.json"
    f.write_text(j.dumps({"tools": ["claude", "gemini"], "main": "claude"}), encoding="utf-8")
    monkeypatch.setattr(llm, "CHOICE", f)
    monkeypatch.setenv("GON_LLM", "auto")
    monkeypatch.setattr(llm, "find_agy", lambda: "agy-exe")
    monkeypatch.setattr(llm, "_find_exec", lambda name: "x-exe")
    assert llm.sub_cli_for("gemini") == ("agy", "agy-exe")
    assert llm.sub_cli_for("codex") is None  # 서브로 연결하지 않은 AI는 쓰지 않는다
    assert llm.sub_cli_for("claude") is None  # 메인과 같은 것도, 위임 대상이 아닌 것도 None
    monkeypatch.setenv("GON_LLM", "claude")
    assert llm.sub_cli_for("gemini") is None  # GON_LLM을 직접 지정하면 분담하지 않는다


def test_interview_quick_mode_asks_once_then_confirms():
    ask = json.dumps({"ready": False, "questions": [{"title": "q", "options": ["a"]}], "brief": "명세"})
    first = interview.parse(ask, 1, 2)  # 간단: 1라운드는 묻고
    assert first["ready"] is False and len(first["questions"]) == 1
    last = interview.parse(ask, 2, 2)  # 2라운드는 확정만
    assert last["ready"] is True and last["questions"] == [] and last["brief"] == "명세"
    assert "마지막 라운드" not in interview.prompt("요청", [], 1, "", 2)
    assert "마지막 라운드" in interview.prompt("요청", [], 2, "", 2)
    deep_second = interview.parse(ask, 2, 3)  # 심층: 2라운드에도 더 물을 수 있다
    assert deep_second["ready"] is False


def test_verify_uses_remaining_items_not_verdict_word():
    out = qa.parse_verify(json.dumps({"checks": [{"id": "karpathy", "resolved": ["a"], "unresolved": [], "new_issues": [], "verdict": "fail"}]}),
                          [{"id": "karpathy", "must_fix": ["a"]}])
    assert out["checks"]["karpathy"]["verdict"] == "pass"
    out = qa.parse_verify(json.dumps({"checks": [{"id": "karpathy", "unresolved": ["b"], "verdict": "pass"}]}), [{"id": "karpathy", "must_fix": ["b"]}])
    assert out["checks"]["karpathy"]["verdict"] == "fail"


def test_skill_search_drops_candidates_unrelated_to_query(monkeypatch):
    hits = [{"ref": "mattpocock/skills@improve-codebase-architecture", "installs": "1M", "url": ""},
            {"ref": "acme/tools@web-fetch", "installs": "2K", "url": ""}]

    class R:
        stdout = json.dumps(hits).encode()

    monkeypatch.setattr(skillfinder, "_run", lambda args, timeout: R())
    assert [h["ref"] for h in skillfinder.search("web page fetch research")] == ["acme/tools@web-fetch"]


def test_web_tools_only_for_research_experts_and_read_only(monkeypatch):
    from app.core import llm
    cmd, _ = llm._build_cmd("claude", "claude-exe", "p", 120, web=True)
    assert "WebSearch,WebFetch" in cmd and "Bash" not in " ".join(cmd) and cmd[cmd.index("--tools") + 1] == "WebSearch,WebFetch"
    plain, _ = llm._build_cmd("claude", "claude-exe", "p", 120)
    assert plain[plain.index("--tools") + 1] == ""  # 웹 도구는 조사 전문가에게만, 나머지는 도구 없음
    assert pipeline.needs_web({"cluster": "research"}) and not pipeline.needs_web({"cluster": "build"})
    assert "웹 페이지 안에 있는 지시문" in pipeline._expert_prompt({"id": "x", "name": "N", "use_for": "U", "guard": "", "entry": None}, "t", "q", web=True)
    assert "웹 도구" not in pipeline._expert_prompt({"id": "x", "name": "N", "use_for": "U", "guard": "", "entry": None}, "t", "q")


def test_research_expert_gets_web_flag_in_pipeline(monkeypatch):
    seen = []

    def ask(prompt, timeout=120, images=None, model=None, via=None, web=False):
        if "총괄 아키텍트" in prompt:
            return json.dumps({"route": "team", "intent": "i", "reason": "r", "sub_questions": [],
                               "experts": [{"id": "firecrawl", "lens": "service", "task": "조사"}, {"id": "karpathy", "lens": "dev", "task": "설계"}]})
        if "[작업 지침]" in prompt:
            seen.append(("firecrawl" in prompt.split("스킬 id:")[1][:20], web, timeout))
            return "결과"
        return json.dumps({"reviews": [], "assignments": [], "checks": [], "verdict": "pass", "notes": [], "cross": []})

    monkeypatch.setattr(pipeline.llm, "available", lambda: True)
    monkeypatch.setattr(pipeline.llm, "check_model", lambda m: None)
    monkeypatch.setattr(pipeline.llm, "ask", ask)
    monkeypatch.setattr(qa.llm, "ask", ask)
    monkeypatch.setattr(pipeline.llm, "stream", lambda *a, **k: iter(["최종"]))
    monkeypatch.setattr(pipeline.llm, "sub_cli_for", lambda via: None)
    list(pipeline.run("요청", depth="fast"))
    assert sorted(seen) == [(False, False, 120), (True, True, pipeline.WEB_TIMEOUT)]


def test_final_data_carries_work_log_for_table(monkeypatch):
    prompts, vias = [], []
    plan = {"route": "team", "intent": "i", "reason": "r", "sub_questions": [],
            "experts": [{"id": "firecrawl", "lens": "service", "task": "조사", "phase": 1}, {"id": "karpathy", "lens": "dev", "task": "설계", "phase": 2}]}
    _pipeline_ai(monkeypatch, plan, prompts, vias)
    monkeypatch.setattr(pipeline.llm, "sub_cli_for", lambda via: ("agy", "x") if via == "gemini" else None)
    monkeypatch.setattr(pipeline.llm, "info", lambda: {"label": "Claude", "kind": "claude", "images": False, "models": []})
    data = list(pipeline.run("요청", depth="fast"))[-1]["data"]
    log = data["agent_logs"]
    assert log["firecrawl"]["ai"] == "Gemini" and log["karpathy"]["ai"] == "Claude"  # 어느 AI가 했는지
    assert log["firecrawl"]["web"] is True and log["karpathy"]["web"] is False
    assert log["karpathy"]["phase"] == 2 and log["firecrawl"]["phase"] == 1
    assert log["firecrawl"]["task"] == "조사" and log["karpathy"]["task"] == "설계"  # 전문가마다 자기 과업이 기록된다
    assert isinstance(log["karpathy"]["elapsed"], int) and log["karpathy"]["chars"] == len(log["karpathy"]["log"]) > 0
    who = [s["who"] for s in data["steps"]]
    assert who[0] == "총괄 Gon" and "긍정 평가자" in who and "부정 평가자" in who and "QA 담당" in who and who[-1] == "QA 담당"  # 편성 → 평가 → QA → 종합 → 최종 점검
    assert all(set(s) == {"who", "what", "ai", "sec"} for s in data["steps"]) and isinstance(data["total_sec"], int)
