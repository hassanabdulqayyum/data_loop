"""Unit tests for the Flow-1 Python diff worker.

We do NOT spin up real Redis or Neo4j instances here.  Instead we stub
those clients with minimal in-memory mocks so the tests run in milliseconds and
can execute inside any CI runner.
"""

from __future__ import annotations

import importlib.util
import pathlib
import sys
import types
from types import ModuleType

# ---------------------------------------------------------------------------
# Minimal stub modules so `import redis` and `from neo4j import GraphDatabase`
# inside diff_worker do not blow up when those heavy dependencies aren't
# available in the test runner.  We only need the attributes referenced by the
# worker, nothing more.
# ---------------------------------------------------------------------------

# Stub `redis` --------------------------------------------------------------
redis_stub = types.ModuleType("redis")

class _RedisPlaceholder:  # pylint: disable=too-few-public-methods
    """Bare-minimum stand-in so `from redis import Redis` succeeds."""

    @classmethod
    def from_url(cls, *args, **kwargs):  # noqa: D401 – factory signature
        # A dummy instance with the two methods diff_worker expects later when
        # we pass our *real* MockRedis.
        return MockRedis()  # type: ignore  # defined later in this file


redis_stub.Redis = _RedisPlaceholder  # type: ignore[attr-defined]

orig_redis_mod = sys.modules.get("redis")
sys.modules["redis"] = redis_stub

# Stub `neo4j` -------------------------------------------------------------

neo4j_stub = types.ModuleType("neo4j")

class _Neo4jGraphDatabasePlaceholder:  # pylint: disable=too-few-public-methods
    """Stand-in for `neo4j.GraphDatabase` that returns our Mock driver."""

    @staticmethod
    def driver(*args, **kwargs):  # noqa: D401 – factory signature
        return MockNeo4jDriver()  # defined later in this file


neo4j_stub.GraphDatabase = _Neo4jGraphDatabasePlaceholder  # type: ignore[attr-defined]

orig_neo4j_mod = sys.modules.get("neo4j")
sys.modules["neo4j"] = neo4j_stub

# ---------------------------------------------------------------------------
# Dynamically load the diff_worker module so we don't worry about dashed
# directory names (apps/py-ai-service) breaking the Python import machinery.
# ---------------------------------------------------------------------------

DW_PATH = pathlib.Path("apps/py-ai-service/diff_worker.py")
_spec = importlib.util.spec_from_file_location("diff_worker", DW_PATH)
diff_worker: ModuleType = importlib.util.module_from_spec(_spec)  # type: ignore
assert _spec is not None and _spec.loader is not None, "Failed to load diff_worker module"
_spec.loader.exec_module(diff_worker)  # type: ignore[attr-defined]

# ---------------------------------------------------------------------------
# Test helpers – Tiny mocks for Redis & Neo4j that expose exactly the methods
# the worker code calls.  Anything else will raise AttributeError, ensuring we
# keep the mocks honest.
# ---------------------------------------------------------------------------

class MockRedis:
    """In-memory stub that records calls to `xadd` and `xack`."""

    def __init__(self) -> None:
        self.xadd_calls = []  # list of (stream, fields)
        self.xack_calls = []  # list of (stream, group, id)

    # Redis command proxies --------------------------------------------------

    def xadd(self, stream: str, fields: dict):
        self.xadd_calls.append((stream, fields))

    def xack(self, stream: str, group: str, msg_id: str):
        self.xack_calls.append((stream, group, msg_id))


class _FakeResult:
    """Mimics the object returned by `neo4j.Result.single()`."""

    def __init__(self, text: str):
        self._text = text

    def __getitem__(self, key):
        if key == "text":
            return self._text
        raise KeyError(key)


class _MockSession:
    """Context-manager that returns itself and stubs the Cypher `run`."""

    def __enter__(self):
        return self

    def __exit__(self, exc_type, exc, tb):
        return False  # Propagate exceptions

    # pylint: disable=unused-argument
    def run(self, query: str, id: str):  # noqa: D401 – simple stub
        # Always return the hard-coded text regardless of query.
        class _R:
            def single(self_inner):  # noqa: N802 – match neo4j style
                return _FakeResult("old text")

        return _R()


class MockNeo4jDriver:
    """Bare-bones Neo4j driver with `.session()` and `.verify_connectivity()`."""

    def session(self):  # noqa: D401 – mimics neo4j API (no args needed here)
        return _MockSession()

    def verify_connectivity(self):  # noqa: D401 – nothing to do for mock
        return None


# ---------------------------------------------------------------------------
# Tests
# ---------------------------------------------------------------------------

def test_process_message_emits_diff_html():
    """Happy path – verifies Redis receives a diff that marks additions."""

    # Arrange ----------------------------------------------------------------
    diff_worker._neo4j_driver = MockNeo4jDriver()  # type: ignore[attr-defined]
    redis = MockRedis()
    message_fields = {
        "id": "5",
        "parent_id": "4",
        "persona_id": "1",
        "text": "new text",  # ← New content compared against mock "old text"
    }

    # Act --------------------------------------------------------------------
    diff_worker._process_message(redis, "42-0", message_fields)  # type: ignore[attr-defined]

    # Assert -----------------------------------------------------------------
    assert len(redis.xadd_calls) == 1, "xadd should be called exactly once"
    stream, fields = redis.xadd_calls[0]
    assert stream == diff_worker.STREAM_OUT  # type: ignore[attr-defined]
    diff_html = fields.get("diff_html", "")
    # difflib.HtmlDiff wraps additions in <span class="diff_add">
    assert "diff_add" in diff_html, "HTML diff should mark additions"


def test_process_message_handles_missing_text():
    """Edge-case – message without `text` should still be processed safely."""

    diff_worker._neo4j_driver = MockNeo4jDriver()  # type: ignore[attr-defined]
    redis = MockRedis()
    message_fields = {
        "id": "6",
        "parent_id": "4",
        "persona_id": "1",
        # no text field here
    }

    # The function should not raise; we capture exceptions via pytest.
    diff_worker._process_message(redis, "43-0", message_fields)  # type: ignore[attr-defined]

    # Redis *should* still receive a diff entry (empty vs empty comparison).
    assert len(redis.xadd_calls) == 1 

# ---------------------------------------------------------------------------
# Restore sys.modules so downstream tests get the *real* dependencies.
# ---------------------------------------------------------------------------

if orig_redis_mod is not None:
    sys.modules["redis"] = orig_redis_mod
else:
    sys.modules.pop("redis", None)

if orig_neo4j_mod is not None:
    sys.modules["neo4j"] = orig_neo4j_mod
else:
    sys.modules.pop("neo4j", None) 