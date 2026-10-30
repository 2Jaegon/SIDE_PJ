import pytest
from fastapi.testclient import TestClient
from app.main import app

client = TestClient(app)

def test_history_flow_guest():
    # 1. Clear guest history first
    res = client.delete("/api/history")
    assert res.status_code == 200

    # 2. Check initial history empty
    res = client.get("/api/history")
    assert res.status_code == 200
    assert res.json() == []

    # 3. Save a turn
    turn_data = {
        "query": "삼성전자 최근 실적 분석",
        "result": {
            "mode": "ai",
            "query": "삼성전자 최근 실적 분석",
            "final_content": "# 분석 결과",
            "plan_reason": "테스트",
            "experts": [],
            "agent_logs": {},
            "prompt_coach_tip": "팁"
        },
        "feed": [{"text": "시작", "kind": "start"}]
    }
    res = client.post("/api/history", json=turn_data)
    assert res.status_code == 201
    saved_id = res.json()["id"]

    # 4. List history and verify saved turn
    res = client.get("/api/history")
    assert res.status_code == 200
    items = res.json()
    assert len(items) == 1
    assert items[0]["id"] == saved_id
    assert items[0]["query"] == "삼성전자 최근 실적 분석"
    assert items[0]["result"]["final_content"] == "# 분석 결과"

    # 5. Delete specific turn
    res = client.delete(f"/api/history/{saved_id}")
    assert res.status_code == 200

    # 6. Verify empty again
    res = client.get("/api/history")
    assert res.status_code == 200
    assert len(res.json()) == 0

