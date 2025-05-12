from neo4j import GraphDatabase
import os
import pathlib


# common logic

def start_neo4j_session():
    URI = os.getenv("NEO4J_URI", "neo4j://localhost:7687")
    AUTH = os.getenv("NEO4J_USER", "neo4j"), os.getenv("NEO4J_PASSWORD", "test")

    driver = GraphDatabase.driver(URI, auth=AUTH)
    driver.verify_connectivity()
    session = driver.session()
    
    test_path = "docs/scripts/neo4j/002_seed_data.cypher"
    test_file = pathlib.Path(test_path).read_text()
    session.run("""
    MATCH (n)
    DETACH DELETE n
""")
    return driver, session, test_file

def test_seed_program_node_exists():
    driver, session, test_file = start_neo4j_session()
    test_file = test_file.split(";")[0]

    mig = session.run(test_file)
    mig.consume()
    result = session.run("""
    MATCH (p:Program)
    RETURN p
    """)
    record = result.single()
    assert record is not None
    assert record[0]['id'] is not None
    session.close()
    driver.close()

def test_seed_module_node_exists():
    driver, session, test_file = start_neo4j_session()
    test_file = test_file.split(";")[1]

    mig = session.run(test_file)
    mig.consume()
    result = session.run("""
    MATCH (m:Module)
    RETURN m
    """)
    record = result.single()
    assert record is not None
    assert record[0]['id'] is not None
    session.close()
    driver.close()

def test_seed_day_node_exists():
    driver, session, test_file = start_neo4j_session()
    test_file = test_file.split(";")[2]

    mig = session.run(test_file)
    mig.consume()
    result = session.run("""
    MATCH (d:Day)
    RETURN d
    """)
    record = result.single()
    assert record is not None
    assert record[0]['id'] is not None
    session.close()
    driver.close()

def test_seed_module_node_has_day_relationship():
    driver, session, test_file = start_neo4j_session()
    for i in range(4):
        test_file_output = test_file.split(";")[i]
        session.run(test_file_output)

    result = session.run("""
    MATCH (d:Day), (m:Module) WHERE (m)-[:HAS_DAY]->(d)
    RETURN m
    """)
    record = result.single()
    assert record is not None
    assert record[0]['id'] is not None
    session.close()
    driver.close()

def test_seed_persona_node_exists():
    driver, session, test_file = start_neo4j_session()
    test_file = test_file.split(";")[4]

    mig = session.run(test_file)
    mig.consume()
    result = session.run("""
    MATCH (per:Persona)
    RETURN per
    """)
    record = result.single()
    assert record is not None
    assert record[0]['id'] is not None
    session.close()
    driver.close()

def test_seed_day_node_has_persona_relationship():
    driver, session, test_file = start_neo4j_session()
    for i in range(6):
        test_file_output = test_file.split(";")[i]
        session.run(test_file_output)

    result = session.run("""
    MATCH (d:Day), (per:Persona) WHERE (d)-[:HAS_PERSONA]->(per)
    RETURN d
    """)
    record = result.single()
    assert record is not None
    assert record[0]['id'] is not None
    session.close()
    driver.close()

def test_seed_persona_node_has_roots_relationship():
    driver, session, test_file = start_neo4j_session()
    for i in range(8):
        test_file_output = test_file.split(";")[i]
        session.run(test_file_output)

    result = session.run("""
    MATCH (t:Turn {role: 'root'}), (per:Persona) WHERE (per)-[:ROOTS]->(t)
    RETURN per, t
    """)
    records = result.single()
    next_record = result.peek()
    assert next_record is None
    assert records[0] is not None
    assert records[0]['id'] is not None
    assert records[1] is not None
    assert records[1]['id'] is not None
    session.close()
    driver.close()

def test_seed_system_node_has_child_relationship():
    driver, session, test_file = start_neo4j_session()
    for i in range(12):
        test_file_output = test_file.split(";")[i]
        session.run(test_file_output)

    result = session.run("""
    MATCH (t1:Turn {role: 'system'}), (t2:Turn {role: 'user'}) WHERE (t1)<-[:CHILD_OF]-(t2)
    RETURN t1, t2
    """)
    records = result.single()
    assert records[0] is not None
    assert records[0]['id'] is not None
    assert records[1] is not None
    assert records[1]['id'] is not None
    session.close()
    driver.close()

def test_seed_user_node_has_child_relationship():
    driver, session, test_file = start_neo4j_session()
    for i in range(14):
        test_file_output = test_file.split(";")[i]
        session.run(test_file_output)

    result = session.run("""
    MATCH (t1:Turn {role: 'user'}), (t2:Turn {role: 'assistant'}) WHERE (t1)<-[:CHILD_OF]-(t2)
    RETURN t1, t2
    """)
    records = result.single()
    assert records[0] is not None
    assert records[0]['id'] is not None
    assert records[1] is not None
    assert records[1]['id'] is not None
    session.close()
    driver.close()