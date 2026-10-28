from app.core import experts


def test_load_pool_not_empty():
    pool = experts.load_pool()
    assert isinstance(pool, dict)
    assert len(pool) > 0


def test_load_pool_ids_unique():
    pool = experts.load_pool()
    ids = [e["id"] for e in pool.values()]
    assert len(ids) == len(set(ids)), "전문가 ID에 중복이 있습니다"
    for k, v in pool.items():
        assert k == v["id"], f"키({k})와 전문가 id({v.get('id')})가 일치해야 합니다"


def test_expert_required_fields():
    pool = experts.load_pool()
    required_keys = {"id", "name", "use_for", "cluster", "accent"}
    for eid, e in pool.items():
        missing = required_keys - set(e.keys())
        assert not missing, f"전문가 {eid}에 필수 필드가 누락되었습니다: {missing}"
        assert e["id"], f"전문가 {eid}의 id가 비어 있습니다"
        assert e["name"], f"전문가 {eid}의 name이 비어 있습니다"
        assert e["use_for"], f"전문가 {eid}의 use_for가 비어 있습니다"
        assert e["cluster"], f"전문가 {eid}의 cluster가 비어 있습니다"
        assert e["accent"], f"전문가 {eid}의 accent가 비어 있습니다"

