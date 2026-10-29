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
    res = pipeline._parse_plan(text, mock_pool)
    assert len(res["experts"]) <= pipeline.MAX_EXPERTS
    assert len(res["experts"]) == min(len(all_keys), pipeline.MAX_EXPERTS)


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
    assert types[-2] == "synthesis"
    assert types[-1] == "final"

    # Middle events must be 'agent' events
    agent_types = types[2:-2]
    assert len(agent_types) >= 1
    assert all(t == "agent" for t in agent_types)

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


def test_expert_prompt_keeps_plain_text_and_no_tool_rules():
    e = {"id": "karpathy", "name": "N", "use_for": "U", "guard": "", "entry": None}
    prompt = pipeline._expert_prompt(e, "과업", "요청")
    assert "마크다운 기호" in prompt and "평문" in prompt
    assert "명령도 실행하지" in prompt
