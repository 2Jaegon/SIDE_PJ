import json
from fastapi.testclient import TestClient
from app.main import app

client = TestClient(app)


def test_office_pool_endpoint():
    res = client.get("/api/office/pool")
    assert res.status_code == 200
    data = res.json()
    assert "total" in data
    assert data["total"] > 0
    assert "clusters" in data
    assert "mode" in data


def test_office_experts_endpoint():
    res = client.get("/api/office/experts")
    assert res.status_code == 200
    data = res.json()
    assert "experts" in data
    assert isinstance(data["experts"], list)
    assert len(data["experts"]) > 0

    first = data["experts"][0]
    for key in ("id", "name", "kind", "cluster", "accent", "use_for"):
        assert key in first


def test_dispatch_stream_empty_query_400():
    res = client.post("/api/office/dispatch-stream", json={"query": ""})
    assert res.status_code == 400

    res_whitespace = client.post("/api/office/dispatch-stream", json={"query": "   "})
    assert res_whitespace.status_code == 400


def test_dispatch_stream_valid_query_ndjson():
    res = client.post("/api/office/dispatch-stream", json={"query": "테스트 보고서 작성"})
    assert res.status_code == 200
    assert "application/x-ndjson" in res.headers.get("content-type", "")

    lines = [line.strip() for line in res.text.split("\n") if line.strip()]
    assert len(lines) >= 3

    events = []
    for line in lines:
        event = json.loads(line)
        assert isinstance(event, dict)
        assert "type" in event
        events.append(event)

    assert events[0]["type"] == "start"
    assert events[-1]["type"] == "final"
    assert "data" in events[-1]
    assert events[-1]["data"]["query"] == "테스트 보고서 작성"

