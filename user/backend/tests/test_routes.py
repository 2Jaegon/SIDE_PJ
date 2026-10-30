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



_PNG = "iVBORw0KGgo="  # 내용은 검사하지 않는다(형식과 크기만 본다)


def test_dispatch_stream_image_only_ok():
    res = client.post("/api/office/dispatch-stream", json={"query": "", "images": [{"mime": "image/png", "data": _PNG}]})
    assert res.status_code == 200
    assert json.loads(res.text.strip().split("\n")[-1])["type"] == "final"


def test_dispatch_stream_image_rejects_bad_input():
    post = lambda images: client.post("/api/office/dispatch-stream", json={"query": "x", "images": images})
    assert post([{"mime": "image/svg+xml", "data": _PNG}]).status_code == 400
    assert post([{"mime": "image/png", "data": "***"}]).status_code == 400
    assert post([{"mime": "image/png", "data": _PNG}] * 5).status_code == 400
    assert post([{"mime": "image/png", "data": "A" * 8 * 1024 * 1024}]).status_code == 400


def test_office_pool_reports_connected_llm():
    data = client.get("/api/office/pool").json()
    assert data["llm"]["kind"] is None  # 테스트는 GON_LLM=stub
    assert data["llm"]["images"] is False


def test_dispatch_stream_accepts_history():
    res = client.post("/api/office/dispatch-stream", json={
        "query": "표로 다시 정리해줘",
        "history": [{"role": "user", "content": "보고서 써줘"}, {"role": "assistant", "content": "# 보고서"}],
    })
    assert res.status_code == 200
    events = [json.loads(l) for l in res.text.split("\n") if l.strip()]
    assert events[-1]["type"] == "final"


def test_dispatch_stream_model_is_validated():
    # 모델 이름은 CLI 인자로 들어가므로 안전한 문자만 받는다
    assert client.post("/api/office/dispatch-stream", json={"query": "q", "model": "opus; rm -rf"}).status_code == 422
    res = client.post("/api/office/dispatch-stream", json={"query": "q", "model": "opus"})
    assert res.status_code == 200
    start = json.loads(res.text.split("\n")[0])
    assert start["model"] is None  # 시험용(AI 없음)에서는 모델을 쓰지 않는다


def test_dispatch_stream_rejects_bad_history_role():
    res = client.post("/api/office/dispatch-stream", json={"query": "q", "history": [{"role": "system", "content": "x"}]})
    assert res.status_code == 422
