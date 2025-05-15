from neo4j import GraphDatabase
import os
import pathlib


# common logic

def start_neo4j_session():
    URI = os.getenv("NEO4J_URI", "neo4j://localhost:7687")
    # Align with canonical test credentials used across Vercel & docker-compose.
    AUTH = os.getenv("NEO4J_USER", "neo4j"), os.getenv("NEO4J_PASSWORD", "test12345")

    driver = GraphDatabase.driver(URI, auth=AUTH)
    driver.verify_connectivity()
    session = driver.session()

    test_path = "docs/scripts/neo4j/001_init_schema.cypher"
    test_file = pathlib.Path(test_path).read_text()

    return driver, session, test_file


def test_program_id_constraint(): # checks if each program node has a unique id in the DAG database

    driver, session, test_file = start_neo4j_session()
    test_file = test_file.split(";")[0]

    mig = session.run(test_file)
    mig.consume()
    constraints = session.run("""
    SHOW CONSTRAINTS
    YIELD name
    WHERE name = 'program_id'
    RETURN name
    """)
    record = constraints.single()
    assert record is not None and record["name"] == "program_id"
    session.close()
    driver.close()

def test_module_id_constraint(): # checks if each module node has a unique id in the DAG database

    driver, session, test_file = start_neo4j_session()
    test_file = test_file.split(";")[1]

    mig = session.run(test_file)
    mig.consume()
    constraints = session.run("""
    SHOW CONSTRAINTS
    YIELD name
    WHERE name = 'module_id'
    RETURN name
    """)
    record = constraints.single()
    assert record is not None and record["name"] == "module_id"
    session.close()
    driver.close()

def test_day_id_constraint(): # checks if each day node has a unique id in the DAG database

    driver, session, test_file = start_neo4j_session()
    test_file = test_file.split(";")[2]
    
    mig = session.run(test_file)
    mig.consume()
    constraints = session.run("""
    SHOW CONSTRAINTS
    YIELD name
    WHERE name = 'day_id'
    RETURN name
    """)
    record = constraints.single()
    assert record is not None and record["name"] == "day_id"
    session.close()
    driver.close()

def test_persona_id_constraint(): # checks if each persona node has a unique id in the DAG database

    driver, session, test_file = start_neo4j_session()
    test_file = test_file.split(";")[3]
    
    mig = session.run(test_file)
    mig.consume()
    constraints = session.run("""
    SHOW CONSTRAINTS
    YIELD name
    WHERE name = 'persona_id'
    RETURN name
    """)
    record = constraints.single()
    assert record is not None and record["name"] == "persona_id"
    session.close()
    driver.close()

def test_turn_id_constraint(): # checks if each turn node has a unique id in the DAG database

    driver, session, test_file = start_neo4j_session()
    test_file = test_file.split(";")[4]
    
    mig = session.run(test_file)
    mig.consume()
    constraints = session.run("""
    SHOW CONSTRAINTS
    YIELD name
    WHERE name = 'turn_id'
    RETURN name
    """)
    record = constraints.single()
    assert record is not None and record["name"] == "turn_id"
    session.close()
    driver.close()

def test_candidate_by_parent_ts_index(): # checks if the ordering of all children of a common parent by timestamp is provided by an index
    driver, session, test_file = start_neo4j_session()
    test_file = test_file.split(";")[5]
    
    mig = session.run(test_file)
    mig.consume()
    result = session.run("""
    SHOW INDEXES
    YIELD name
    WHERE name = 'candidate_by_parent_ts'
    RETURN name
    """)
    record = result.single()
    assert record is not None
    session.close()
    driver.close()

def test_module_by_prog_index(): # checks if `module_by_prog` index exists that orders modules by their seq property so it can be ordered for the user in the UI quickly
    driver, session, test_file = start_neo4j_session()
    test_file = test_file.split(";")[6]
    
    mig = session.run(test_file)
    mig.consume()
    result = session.run("""
    SHOW INDEXES
    YIELD name
    WHERE name = 'module_by_prog'
    RETURN name
    """)
    record = result.single()
    assert record is not None
    session.close()
    driver.close()

def test_day_by_module_index(): # checks if 'day_by_module' index exists that orders days by their seq property so it can be ordered for the user in the UI quickly
    driver, session, test_file = start_neo4j_session()
    test_file = test_file.split(";")[7]
    
    mig = session.run(test_file)
    mig.consume()
    result = session.run("""
    SHOW INDEXES
    YIELD name
    WHERE name = 'day_by_module'
    RETURN name
    """)
    record = result.single()
    assert record is not None
    session.close()
    driver.close()

def test_turn_embedding_index(): # checks if 'turnEmbedding' vector index exists that orders turns by their embeddings is not empty
    driver, session, test_file = start_neo4j_session()
    test_file = test_file.split(";")[8]
    
    mig = session.run(test_file)
    mig.consume()
    result = session.run("""
    SHOW INDEXES
    YIELD name
    WHERE name = 'turnEmbedding'
    RETURN name
    """)
    record = result.single()
    assert record is not None
    session.close()
    driver.close()