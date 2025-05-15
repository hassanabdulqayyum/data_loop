import os
import pytest
from neo4j import GraphDatabase
import pathlib, re

URI = os.getenv("NEO4J_URI", "bolt://localhost:7687")
AUTH = (
    os.getenv("NEO4J_USER", "neo4j"),
    os.getenv("NEO4J_PASSWORD", "test12345"),
)

@pytest.fixture(scope="module")
def driver():
    drv = GraphDatabase.driver(URI, auth=AUTH)
    drv.verify_connectivity()
    yield drv
    drv.close()


def test_focus_persona_has_turns(driver):
    script = pathlib.Path("docs/scripts/neo4j/004_demo_catalog.cypher").read_text()
    statements = [s.strip() for s in re.split(r";\s*", script) if s.strip()]

    with driver.session() as session:
        # Run every statement so the catalog + script exist for assertion
        for stmt in statements:
            session.run(stmt)

        result = session.run(
            """
            MATCH (per:Persona {id:'Focus'})-[:ROOTS]->(root:Turn)
            OPTIONAL MATCH (root)<-[:CHILD_OF*]-(child)
            RETURN root, collect(child) AS children
            """
        )
        record = result.single()
        assert record is not None, "Focus persona should exist"
        root = record["root"]
        children = record["children"]
        # root exists
        assert root is not None
        # should have at least 1 child turn (system role)
        assert len(children) >= 1 