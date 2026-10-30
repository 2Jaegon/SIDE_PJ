import json
import pytest
from app.core import experts, pipeline


@pytest.fixture
def mock_pool():
    return {
        "karpathy": {"id": "karpathy", "name": "클린 코드 설계자", "use_for": "클린 코드", "triggers": ["코드"], "synergy": []},
        "taste": {"id": "taste", "name": "웹 아트디렉터", "use_for": "디자인", "triggers": ["디자인"], "synergy": []},
        "k-skill": {"id": "k-skill", "name": "한국 실무 전문가", "use_for": "실무", "triggers": ["보고서"], "synergy": []},
        "e1": {"id": "e1", "name": "E1", "use_for": "E1", "triggers": [], "synergy": []},
        "e2": {"id": "e2", "name": "E2", "use_for": "E2", "triggers": [], "synergy": []},
        "e3": {"id": "e3", "name": "E3", "use_for": "E3", "triggers": [], "synergy": []},
        "e4": {"id": "e4", "name": "E4", "use_for": "E4", "triggers": [], "synergy": []},
        "e5": {"id": "e5", "name": "E5", "use_for": "E5", "triggers": [], "synergy": []},
        "e6": {"id": "e6", "name": "E6", "use_for": "E6", "triggers": [], "synergy": []},
        "e7": {"id": "e7", "name": "E7", "use_for": "E7", "triggers": [], "synergy": []},
        "e8": {"id": "e8", "name": "E8", "use_for": "E8", "triggers": [], "synergy": []},
        "e9": {"id": "e9", "name": "E9", "use_for": "E9", "triggers": [], "synergy": []},
    }


def test_parse_plan_valid_json(mock_pool):
    text = json.dumps({
        "reason": "적합한 전문가 구성",
        "experts": [
            {"id": "karpathy", "task": "코드 작성"},
            {"id": "taste", "task": "스타일 적용"}
        ]
    })
    res = pipeline._parse_plan(text, mock_pool)
    assert res["reason"] == "적합한 전문가 구성"
    assert len(res["experts"]) == 2
    assert res["experts"][0]["id"] == "karpathy"
    assert res["experts"][1]["id"] == "taste"


def test_parse_plan_with_surrounding_text(mock_pool):
    inner = json.dumps({
        "reason": "앞뒤 텍스트 포함",
        "experts": [{"id": "karpathy", "task": "설계"}]
    })
    text = f"여기 편성 결과입니다.\n```json\n{inner}\n```\n확인해주세요."
    res = pipeline._parse_plan(text, mock_pool)
    assert res["reason"] == "앞뒤 텍스트 포함"
    assert len(res["experts"]) == 1
    assert res["experts"][0]["id"] == "karpathy"


def test_parse_plan_filter_unknown_ids(mock_pool):
    text = json.dumps({
        "reason": "없는 id 포함",
        "experts": [
            {"id": "karpathy", "task": "코드 작성"},
            {"id": "nonexistent_expert_xyz", "task": "알 수 없음"}
        ]
    })
    res = pipeline._parse_plan(text, mock_pool)
    assert len(res["experts"]) == 1
    assert res["experts"][0]["id"] == "karpathy"


def test_parse_plan_deduplicate_ids(mock_pool):
    text = json.dumps({
        "reason": "중복 id 포함",
        "experts": [
            {"id": "karpathy", "task": "첫 번째 작업"},
            {"id": "karpathy", "task": "두 번째 작업"}
        ]
    })
    res = pipeline._parse_plan(text, mock_pool)
    assert len(res["experts"]) == 1
    assert res["experts"][0]["id"] == "karpathy"
    assert res["experts"][0]["task"] == "첫 번째 작업"


def test_parse_plan_zero_experts_raises_value_error(mock_pool):
    empty_experts = json.dumps({"reason": "전문가 없음", "experts": []})
    with pytest.raises(ValueError, match="고른 전문가가 없어요"):
        pipeline._parse_plan(empty_experts, mock_pool)

    unknown_only = json.dumps({
        "reason": "존재하지 않는 전문가만 있음",
        "experts": [{"id": "ghost_id_1"}, {"id": "ghost_id_2"}]
    })
    with pytest.raises(ValueError, match="고른 전문가가 없어요"):
        pipeline._parse_plan(unknown_only, mock_pool)


def test_parse_plan_truncates_over_max_experts(mock_pool):
    all_keys = list(mock_pool.keys())[:10]  # 10 experts
    text = json.dumps({
        "reason": "많은 전문가",
        "experts": [{"id": k, "task": f"과업 {k}"} for k in all_keys]
    })
    for depth, cap in (("fast", 4), ("normal", 8), ("deep", 16)):
        res = pipeline._parse_plan(text, mock_pool, pipeline.team_cap(depth))
        assert len(res["experts"]) == min(len(all_keys), cap, pipeline.MAX_EXPERTS)


def test_team_cap_by_depth_never_exceeds_absolute_max():
    assert pipeline.team_cap("fast") == 4
    assert pipeline.team_cap(None) == pipeline.team_cap("normal") == 8
    assert pipeline.team_cap("deep") == min(16, pipeline.MAX_EXPERTS)
    assert pipeline.team_cap("unknown") == 8


def test_parse_plan_keeps_lens_and_guesses_missing(mock_pool):
    ids = list(mock_pool.keys())[:2]
    text = json.dumps({"reason": "r", "experts": [{"id": ids[0], "lens": "dev"}, {"id": ids[1], "lens": "엉뚱함"}]})
    res = pipeline._parse_plan(text, mock_pool)
    assert res["experts"][0]["lens"] == "dev"
    guessed = "dev" if mock_pool[ids[1]].get("cluster") in pipeline.DEV_CLUSTERS else "service"
    assert res["experts"][1]["lens"] == guessed  # 잘못된 값이면 분야로 추정


def test_prompts_carry_lens_cap_and_final_structure(mock_pool):
    plan = pipeline._plan_prompt("요청", mock_pool, cap=16)
    assert "상한 16명" in plan and '"lens"' in plan
    e = {"id": "karpathy", "name": "N", "use_for": "U", "guard": "", "entry": None}
    assert "개발자 관점" in pipeline._expert_prompt(e, "과업", "요청", lens="dev")
    assert "지어내지" in pipeline._expert_prompt(e, "과업", "요청")  # Core 1~2와 같은 방향
    syn = pipeline._synthesis_prompt("요청", [{"name": "a", "lens_ko": "서비스 관점", "text": "b"}])
    for section in ("## 1. 분석", "## 2. 정리", "## 3. 시각화", "## 4. 개발", "```chart"):
        assert section in syn
    assert "[서비스 관점 · a의 결과]" in syn


def test_run_events_include_lens(monkeypatch):
    events = list(pipeline.run("서비스 기획과 개발 계획 세워줘", depth="fast"))
    plan = next(ev for ev in events if ev["type"] == "plan")
    assert 1 <= len(plan["experts"]) <= 4
    assert all(x["lens"] in pipeline.LENSES for x in plan["experts"])


def test_keyword_plan_returns_at_least_one():
    pool = experts.load_pool()
    plan = pipeline._keyword_plan("전혀_알_수_없는_외계어_쿼리_!@#$%^&*()", pool)
    assert isinstance(plan, dict)
    assert "experts" in plan
    assert len(plan["experts"]) >= 1
    for item in plan["experts"]:
        assert item["id"] in pool


def test_run_stub_mode_event_sequence():
    events = list(pipeline.run("테스트 요청입니다"))
    assert len(events) >= 4

    types = [e["type"] for e in events]
    assert types[0] == "start"
    assert types[1] == "plan"
    assert types[-1] == "final"

    # plan 다음은 agent들, 그다음 synthesis, 그 뒤로 답의 글자 조각(delta)이 이어진다
    s_idx = types.index("synthesis")
    agent_types = types[2:s_idx]
    assert len(agent_types) >= 1
    assert all(t == "agent" for t in agent_types)
    deltas = events[s_idx + 1:-1]
    assert deltas and all(e["type"] == "delta" for e in deltas)
    assert "".join(e["text"] for e in deltas) == events[-1]["data"]["final_content"]

    # Final event contains complete data
    final_event = events[-1]
    assert final_event["type"] == "final"
    assert "data" in final_event
    assert final_event["data"]["mode"] == "stub"
    assert "final_content" in final_event["data"]
    assert "prompt_coach_tip" in final_event["data"]


def test_run_with_selected_expert_ids():
    pool = experts.load_pool()
    selected = ["karpathy", "taste"] if "karpathy" in pool and "taste" in pool else list(pool.keys())[:2]
    events = list(pipeline.run("테스트 요청", selected_expert_ids=selected))

    plan_event = next(e for e in events if e["type"] == "plan")
    planned_ids = [e["id"] for e in plan_event["experts"]]
    for sid in selected:
        assert sid in planned_ids

    final_event = next(e for e in events if e["type"] == "final")
    final_expert_ids = [e["id"] for e in final_event["data"]["experts"]]
    for sid in selected:
        assert sid in final_expert_ids


def test_run_with_only_invalid_selected_expert_ids():
    # If only invalid IDs are passed, it should fall back to keyword plan without crashing
    events = list(pipeline.run("테스트 요청", selected_expert_ids=["invalid_id_9999", "fake_id_8888"]))
    assert any(e["type"] == "plan" for e in events)
    assert any(e["type"] == "final" for e in events)



def test_parse_plan_keeps_terms_string_and_list(mock_pool):
    text = json.dumps({
        "reason": "r",
        "experts": [
            {"id": "k-skill", "task": "t", "terms": "sales proposal"},
            {"id": "taste", "task": "t", "terms": ["instagram", "content"]},
            {"id": "karpathy", "task": "t"},
        ],
    })
    res = pipeline._parse_plan(text, mock_pool)
    assert [x["terms"] for x in res["experts"]] == ["sales proposal", "instagram content", ""]


def test_plan_prompt_asks_for_terms_of_multi_skill_experts(mock_pool):
    prompt = pipeline._plan_prompt("요청", mock_pool)
    line = next(ln for ln in prompt.splitlines() if '"terms"에' in ln)
    assert "k-skill" in line  # 하위 스킬이 많은 전문가 id를 안내한다
    assert "taste" not in line


def test_expert_prompt_structure_and_depth():
    e = {"id": "karpathy", "name": "N", "use_for": "U", "guard": "", "entry": None}
    prompt = pipeline._expert_prompt(e, "과업", "요청", sub_question="세부 질문")
    assert "과업" in prompt and "요청" in prompt
    assert "세부 질문" in prompt
    assert "마크다운 표" in prompt


def test_parse_plan_direct_route_allows_no_experts(mock_pool):
    plan = pipeline._parse_plan('{"route": "direct", "intent": "인사", "reason": "바로 답", "experts": [{"id": "karpathy"}]}', mock_pool)
    assert plan["route"] == "direct"
    assert plan["experts"] == []


def test_parse_plan_defaults_to_team(mock_pool):
    plan = pipeline._parse_plan('{"intent": "x", "reason": "y", "experts": [{"id": "karpathy"}]}', mock_pool)
    assert plan["route"] == "team"


def test_history_block_keeps_recent_turns_and_truncates():
    history = [{"role": "user", "content": f"질문{i}"} for i in range(30)] + [{"role": "assistant", "content": "가" * 5000}]
    block = pipeline._history_block(history)
    assert block.startswith("<이전 대화>")
    assert "질문0" not in block  # 오래된 것은 빠진다
    assert "[Gon] " + "가" * pipeline.HISTORY_CHARS + " …(생략)" in block
    assert pipeline._history_block([]) == ""


def test_history_reaches_every_prompt(mock_pool):
    ctx = pipeline._history_block([{"role": "user", "content": "삼성전자 분석해줘"}, {"role": "assistant", "content": "보고서"}])
    e = {"id": "karpathy", "name": "N", "use_for": "U", "guard": "", "kind": "skill"}
    assert "삼성전자 분석해줘" in pipeline._plan_prompt("표로 다시", mock_pool, ctx)
    assert "삼성전자 분석해줘" in pipeline._direct_prompt("표로 다시", ctx)
    assert "삼성전자 분석해줘" in pipeline._synthesis_prompt("표로 다시", [{"name": "a", "text": "b"}], context=ctx)


def test_run_direct_route_streams_answer(monkeypatch):
    monkeypatch.setattr(pipeline.llm, "available", lambda: True)
    monkeypatch.setattr(pipeline.llm, "ask", lambda *a, **k: '{"route": "direct", "intent": "인사", "reason": "바로 답", "experts": []}')
    monkeypatch.setattr(pipeline.llm, "stream", lambda *a, **k: iter(["안녕", "하세요"]))
    events = list(pipeline.run("안녕", history=[{"role": "user", "content": "이전"}]))
    types = [e["type"] for e in events]
    assert types == ["start", "plan", "synthesis", "delta", "delta", "final"]
    assert events[1]["route"] == "direct" and events[1]["experts"] == []
    assert events[-1]["data"]["final_content"] == "안녕하세요"
    assert events[-1]["data"]["route"] == "direct"


def test_run_direct_route_error_when_no_answer(monkeypatch):
    monkeypatch.setattr(pipeline.llm, "available", lambda: True)
    monkeypatch.setattr(pipeline.llm, "ask", lambda *a, **k: '{"route": "direct", "intent": "x", "reason": "y", "experts": []}')

    def boom(*a, **k):
        raise pipeline.llm.LLMError("빈 응답")
        yield  # pragma: no cover

    monkeypatch.setattr(pipeline.llm, "stream", boom)
    events = list(pipeline.run("안녕"))
    assert events[-1]["type"] == "error"
