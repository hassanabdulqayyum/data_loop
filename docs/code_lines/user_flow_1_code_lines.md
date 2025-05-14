1. tests/test_schema.py
   - from neo4j import GraphDatabase  # Initialize Neo4j driver class import for connectivity.
   - import os  # Access environment variables without hard-coding secrets.
   - import pathlib  # Provides file-system helpers to read the Cypher migration file from disk.
   - def test_program_id_constraint():  # Unit test: verifies the `Program` node has a uniqueness constraint on `id`.
   - URI = os.getenv("NEO4J_URI", "neo4j://localhost:7687")  # Default to local instance; overridable via env.
   - AUTH = (os.getenv("NEO4J_USER", "neo4j"), os.getenv("NEO4J_PASSWORD", "test"))  # Credentials sourced from env with sensible defaults for local dev.
   - driver = GraphDatabase.driver(URI, auth=AUTH)  # Creates a Neo4j Driver instance for the test.
   - driver.verify_connectivity()  # Confirms Neo4j is reachable before running assertions.
   - session = driver.session()  # Opens a Neo4j session to execute Cypher statements in the test.
   - test_path = "docs/scripts/neo4j/001_init_schema.cypher"  # Relative path to the schema migration.
   - test_file = pathlib.Path(test_path).read_text()  # Loads the migration file.
   - test_file = test_file.split(";")[0]  # Extracts the statement that defines the Program constraint only.
   - mig = session.run(test_file)  # Executes the migration inside the test setup.
   - mig.consume()  # Forces the transaction to complete so subsequent queries see the changes.
   - constraints = session.run("""
    SHOW CONSTRAINTS
    YIELD name
    WHERE name = 'program_id'
    RETURN name
    """)  # Retrieves the specific constraint.
   - record = constraints.single()  # Safely obtains the first (and only) record.
   - assert record is not None and record["name"] == "program_id"  # Asserts the constraint exists.
   - session.close()  # Explicitly frees the session resource to avoid warnings.
   - driver.close()  # Closes the driver connection cleanly.
   - def test_module_id_constraint():  # Verifies the `Module` node uniqueness constraint.
   - URI = os.getenv("NEO4J_URI", "neo4j://localhost:7687")
   - AUTH = (os.getenv("NEO4J_USER", "neo4j"), os.getenv("NEO4J_PASSWORD", "test"))
   - driver = GraphDatabase.driver(URI, auth=AUTH)
   - driver.verify_connectivity()
   - session = driver.session()
   - test_path = "docs/scripts/neo4j/001_init_schema.cypher"
   - test_file = pathlib.Path(test_path).read_text()
   - test_file = test_file.split(";")[1]  # Second statement – Module constraint.
   - mig = session.run(test_file)
   - mig.consume()
   - constraints = session.run("""
    SHOW CONSTRAINTS
    YIELD name
    WHERE name = 'module_id'
    RETURN name
    """)
   - record = constraints.single()
   - assert record is not None and record["name"] == "module_id"
   - session.close()
   - driver.close()
   - def test_day_id_constraint():  # Verifies the `Day` node uniqueness constraint.
   - URI = os.getenv("NEO4J_URI", "neo4j://localhost:7687")
   - AUTH = (os.getenv("NEO4J_USER", "neo4j"), os.getenv("NEO4J_PASSWORD", "test"))
   - driver = GraphDatabase.driver(URI, auth=AUTH)
   - driver.verify_connectivity()
   - session = driver.session()
   - test_path = "docs/scripts/neo4j/001_init_schema.cypher"
   - test_file = pathlib.Path(test_path).read_text()
   - test_file = test_file.split(";")[2]  # Third statement – Day constraint.
   - mig = session.run(test_file)
   - mig.consume()
   - constraints = session.run("""
    SHOW CONSTRAINTS
    YIELD name
    WHERE name = 'day_id'
    RETURN name
    """)
   - record = constraints.single()
   - assert record is not None and record["name"] == "day_id"
   - session.close()
   - driver.close()
   - def test_persona_id_constraint():  # Verifies the `Persona` node uniqueness constraint.
   - URI = os.getenv("NEO4J_URI", "neo4j://localhost:7687")
   - AUTH = (os.getenv("NEO4J_USER", "neo4j"), os.getenv("NEO4J_PASSWORD", "test"))
   - driver = GraphDatabase.driver(URI, auth=AUTH)
   - driver.verify_connectivity()
   - session = driver.session()
   - test_path = "docs/scripts/neo4j/001_init_schema.cypher"
   - test_file = pathlib.Path(test_path).read_text()
   - test_file = test_file.split(";")[3]  # Fourth statement – Persona constraint.
   - mig = session.run(test_file)
   - mig.consume()
   - constraints = session.run("""
    SHOW CONSTRAINTS
    YIELD name
    WHERE name = 'persona_id'
    RETURN name
    """)
   - record = constraints.single()
   - assert record is not None and record["name"] == "persona_id"
   - session.close()
   - driver.close()
   - def test_turn_id_constraint():  # Verifies the `Turn` node uniqueness constraint.
   - URI = os.getenv("NEO4J_URI", "neo4j://localhost:7687")
   - AUTH = (os.getenv("NEO4J_USER", "neo4j"), os.getenv("NEO4J_PASSWORD", "test"))  # Uses same env-driven credentials pattern.
   - driver = GraphDatabase.driver(URI, auth=AUTH)  # Opens a new Neo4j driver for this specific test case.
   - driver.verify_connectivity()  # Ensures database is reachable before executing migrations.
   - session = driver.session()  # Starts a fresh session context.
   - test_path = "docs/scripts/neo4j/001_init_schema.cypher"  # Path remains identical – we only slice a different statement.
   - test_file = pathlib.Path(test_path).read_text()  # Reads the entire migration file into memory.
   - test_file = test_file.split(";")[4]  # Fifth statement – selects the `Turn` uniqueness constraint.
   - mig = session.run(test_file)  # Executes the constraint creation inside the session.
   - mig.consume()  # Forces the transaction to finish so the constraint becomes visible to `SHOW CONSTRAINTS`.
   - constraints = session.run("""
    SHOW CONSTRAINTS
    YIELD name
    WHERE name = 'turn_id'
    RETURN name
    """)  # Queries the catalog for the newly created constraint by name.
   - record = constraints.single()  # Retrieves the first (and only) matching row.
   - assert record is not None and record["name"] == "turn_id"  # Asserts presence and correct naming.
   - session.close()  # Cleans up the session to prevent resource leaks.
   - driver.close()  # Closes the driver connection gracefully.
   - def test_candidate_by_parent_ts_index():  # Ensures composite index exists for (parent_id, ts) on Turn nodes.
   - URI = os.getenv("NEO4J_URI", "neo4j://localhost:7687")  # Fetches the database URI from environment with fallback.
   - AUTH = (os.getenv("NEO4J_USER", "neo4j"), os.getenv("NEO4J_PASSWORD", "test"))  # Same credential pattern.
   - driver = GraphDatabase.driver(URI, auth=AUTH)  # New driver instance for this test.
   - driver.verify_connectivity()  # Quick connectivity check before running Cypher.
   - session = driver.session()  # Opens a new session.
   - test_path = "docs/scripts/neo4j/001_init_schema.cypher"  # Migration file path.
   - test_file = pathlib.Path(test_path).read_text()  # Reads whole migration file.
   - test_file = test_file.split(";")[5]  # Sixth statement – candidate_by_parent_ts index.
   - mig = session.run(test_file)  # Executes the index creation.
   - mig.consume()  # Commits so index becomes visible.
   - result = session.run("""
    SHOW INDEXES WHERE name = 'candidate_by_parent_ts'
    RETURN name
    """)  # Checks if index exists by name.
   - record = result.single()  # Retrieves single row if present.
   - assert record is not None and record["name"] == "candidate_by_parent_ts"  # Asserts index presence.
   - session.close()  # Closes session.
   - driver.close()  # Closes driver.
   - def test_module_has_prog_index():  # Verifies the `module_by_prog` index exists for ordering modules by `seq`.
   - URI = os.getenv("NEO4J_URI", "neo4j://localhost:7687")  # Default to local instance; overridable via env.
   - AUTH = (os.getenv("NEO4J_USER", "neo4j"), os.getenv("NEO4J_PASSWORD", "test"))  # Credentials pattern.
   - driver = GraphDatabase.driver(URI, auth=AUTH)  # Creates a Neo4j Driver instance for the test.
   - driver.verify_connectivity()  # Ensures database is reachable before assertions.
   - session = driver.session()  # Opens a session to run Cypher.
   - test_path = "docs/scripts/neo4j/001_init_schema.cypher"  # Points to the migration script.
   - test_file = pathlib.Path(test_path).read_text()  # Reads the file into memory.
   - test_file = test_file.split(";")[6]  # Seventh statement – `module_by_prog` index.
   - mig = session.run(test_file)  # Executes the index creation statement.
   - mig.consume()  # Commits so the index is visible in catalog.
   - result = session.run("""
    SHOW INDEXES WHERE name = 'module_by_prog'
    RETURN name
    """)  # Checks index existence by name.
   - record = result.single()  # Retrieves the single row, if present.
   - assert record is not None and record["name"] == "module_by_prog"  # Asserts presence and correct naming.
   - session.close()  # Closes the session.
   - driver.close()  # Closes the driver connection.
   - CREATE INDEX day_by_module IF NOT EXISTS FOR (d:Day) ON (d.seq);  # Index enabling ordered Day retrieval.
   - CREATE VECTOR INDEX turnEmbedding IF NOT EXISTS FOR (t:Turn) ON (t.embedding) OPTIONS { indexConfig: { `vector.dimensions`: 384, `vector.similarity_function`: 'cosine' } };  # Vector index supporting semantic search queries.

2. docs/scripts/neo4j/001_init_schema.cypher
   - CREATE CONSTRAINT program_id IF NOT EXISTS FOR (p:Program) REQUIRE p.id IS UNIQUE;  # Renamed to match canonical identifier specified in neo4j_catalog_schema.md.
   - CREATE CONSTRAINT module_id IF NOT EXISTS FOR (m:Module) REQUIRE m.id IS UNIQUE;  # Constraint name aligned with spec.
   - CREATE CONSTRAINT day_id IF NOT EXISTS FOR (d:Day) REQUIRE d.id IS UNIQUE;  # Ensures each Day node has unique ID using canonical name.
   - CREATE CONSTRAINT persona_id IF NOT EXISTS FOR (per:Persona) REQUIRE per.id IS UNIQUE;  # Canonical identifier for Persona uniqueness.
   - CREATE CONSTRAINT turn_id IF NOT EXISTS FOR (t:Turn) REQUIRE t.id IS UNIQUE;  # Guarantees global uniqueness for every Turn node.
   - CREATE INDEX candidate_by_parent_ts IF NOT EXISTS FOR (t:Turn) ON (t.parent_id, t.ts);  # Composite index speeding child-fetch queries.
   - CREATE INDEX module_by_prog IF NOT EXISTS FOR (m:Module) ON (m.seq);  # Index enabling ordered module retrieval.
   - MATCH (t:Turn {role: 'root'}), (per:Persona) CREATE (per)-[:ROOTS]->(t);  # Connects the Persona to its root Turn, forming the head of the gold-path conversation.
   - MATCH (t1:Turn {role: 'root'}), (t2:Turn {role: 'system'}) CREATE (t1)<-[:CHILD_OF]-(t2);  # Links the system Turn beneath the root to continue the gold-path hierarchy.
   - MERGE (user_turn_1:Turn {id:3, role:'user'});  # Adds the initial user Turn node, continuing the ID sequence and specifying its role.
   - MATCH (t2:Turn {role: 'system'}), (t3:Turn {role: 'user'}) CREATE (t2)<-[:CHILD_OF]-(t3);  # Attaches the user Turn beneath the system Turn in the conversation chain.

3. tests/test_seed.py
   - from neo4j import GraphDatabase  # Initializes Neo4j driver import for seed tests.
   - import os  # Accesses environment variables so the test is environment-agnostic.
   - import pathlib  # Reads the seed Cypher file from disk.
   - def start_neo4j_session():  # Helper reused across seed-data tests; opens driver + session and loads seed script text.
   - URI = os.getenv("NEO4J_URI", "neo4j://localhost:7687")  # Defaults to local Neo4j if env vars absent.
   - AUTH = os.getenv("NEO4J_USER", "neo4j"), os.getenv("NEO4J_PASSWORD", "test")  # Credentials pattern.
   - driver = GraphDatabase.driver(URI, auth=AUTH)  # Instantiates driver.
   - driver.verify_connectivity()  # Quick connectivity check before running Cypher.
   - session = driver.session()  # Opens a session context.
   - test_path = "docs/scripts/neo4j/002_seed_data.cypher"  # Path to seed script.
   - test_file = pathlib.Path(test_path).read_text()  # Reads entire seed script content.
   - return driver, session, test_file  # Convention: driver & session must be closed by caller.
   - def test_seed_program_node_exists():  # Verifies that seeding inserts at least one `Program` node.
   - driver, session, test_file = start_neo4j_session()  # Starts db session & loads script.
   - test_file = test_file.split(";")[0]  # Executes only the first statement that creates the Program.
   - mig = session.run(test_file)  # Runs seed Cypher.
   - mig.consume()  # Forces transaction commit.
   - result = session.run("""
    MATCH (p:Program)
    RETURN p
    """)  # Queries for Program node.
   - record = result.single()  # Retrieves single row.
   - assert record is not None  # Passes if at least one Program exists.
   - assert record[0]['id'] is not None  # Strengthens test by confirming Program's primary key is populated.
   - session.close()  # Cleans up resources.
   - driver.close()  # Closes driver connection.
   - def test_seed_module_node_exists():  # Verifies that seeding inserts at least one `Module` node.
   - driver, session, test_file = start_neo4j_session()  # Opens Neo4j connection and loads seed script.
   - test_file = test_file.split(";")[1]  # Executes second statement responsible for Module creation.
   - mig = session.run(test_file)  # Runs seed statement.
   - mig.consume()  # Commits changes.
   - result = session.run("""
    MATCH (m:Module)
    RETURN m
    """)  # Queries Module node.
   - record = result.single()  # First row if present.
   - assert record is not None  # Confirms at least one Module node.
   - assert record[0]['id'] is not None  # Verifies Module node carries an `id` property.
   - session.close()  # Clean up.
   - driver.close()
   - def test_seed_day_node_exists():  # Verifies Day node insertion during seeding.
   - driver, session, test_file = start_neo4j_session()  # Opens Neo4j connection and loads seed script.
   - test_file = test_file.split(";")[2]  # Executes third statement responsible for Day creation.
   - mig = session.run(test_file)  # Runs seed statement.
   - mig.consume()  # Commits changes.
   - result = session.run("""
    MATCH (d:Day)
    RETURN d
    """)  # Queries Day node.
   - record = result.single()  # First row if present.
   - assert record is not None  # Day node exists.
   - assert record[0]['id'] is not None  # Ensures Day node has valid id.
   - session.close()  # Clean up.
   - driver.close()
   - def test_seed_module_node_has_day_relationship():  # Ensures `Module` properly links to `Day` via HAS_DAY edge.
   - driver, session, test_file = start_neo4j_session()  # Reloads seed script and opens session.
   - test_file = test_file.split(";")[3]  # Executes fourth statement establishing relationship.
   - mig = session.run(test_file)  # Runs relationship creation Cypher.
   - mig.consume()  # Commits changes.
   - result = session.run("""
    MATCH (m:Module)-[:HAS_DAY]->(d:Day)
    RETURN m
    """)  # Queries for Module → Day edge.
   - record = result.single()  # Gets first match.
   - assert record is not None  # Relationship exists.
   - assert record[0]['id'] is not None  # Module in relationship has valid id.
   - session.close()  # Close session.
   - driver.close()
   - session.run("""
    MATCH (n)
    DETACH DELETE n
    """)  # Idempotency: clears entire graph before running seed statements.
   - for i in range(4):  # Executes the first four seed statements (Program, Module, Day, HAS_DAY edge)
        test_file_output = test_file.split(";")[i]
        session.run(test_file_output)  # Applies each statement sequentially.
   - def test_seed_persona_node_exists():  # Verifies Persona node creation by seed script.
   - driver, session, test_file = start_neo4j_session()
   - test_file = test_file.split(";")[4]  # Fifth statement – Persona MERGE.
   - session.run(test_file)  # Executes Persona creation.
   - result = session.run("""
    MATCH (per:Persona)
    RETURN per
    """)
   - record = result.single()
   - assert record is not None and record[0]['id'] is not None  # Persona exists and has id.
   - session.close(); driver.close()
   - def test_seed_day_node_has_persona_relationship():  # Ensures Day links to Persona via HAS_PERSONA.
   - driver, session, test_file = start_neo4j_session()
   - for i in range(6):  # Executes six statements up to HAS_PERSONA edge.
        stmt = test_file.split(";")[i]
        session.run(stmt)
   - result = session.run("""
    MATCH (d:Day)-[:HAS_PERSONA]->(per:Persona)
    RETURN d
    """)
   - record = result.single()
   - assert record is not None and record[0]['id'] is not None  # Relationship present.
   - session.close(); driver.close()
   - def test_seed_persona_node_has_roots_relationship():  # Ensures each Persona anchors to its root Turn via the ROOTS edge.
   - driver, session, test_file = start_neo4j_session()
   - for i in range(8):  # Executes the first eight seed statements (Program → Persona-ROOTS edge)
        test_file_output = test_file.split(";")[i]
        session.run(test_file_output)  # Applies each statement sequentially.
   - result = session.run("""
    MATCH (t:Turn {role: 'root'}), (per:Persona) WHERE (per)-[:ROOTS]->(t)
    RETURN per, t
    """)  # Queries for the ROOTS relationship, returning both nodes to validate properties.
   - records = result.single()  # Retrieves the single matching record.
   - assert records[0] is not None and records[0]['id'] is not None  # Verifies Persona node exists and has an id.
   - assert records[1] is not None and records[1]['id'] is not None  # Verifies root Turn node exists and has an id.
   - next_record = result.peek()  # Obtains the next record without advancing; should be None if exactly one match.
   - assert next_record is None  # Confirms uniqueness: no additional Persona→ROOTS rows returned.
   - session.close(); driver.close()
   - def test_seed_system_node_has_child_relationship():  # Validates system→user CHILD_OF link without enforcing uniqueness.
   - driver, session, test_file = start_neo4j_session()
   - for i in range(12):  # Executes first 12 seed statements up through user-child-of-system edge.
        stmt = test_file.split(";")[i]
        session.run(stmt)
   - result = session.run("""
    MATCH (t1:Turn {role: 'system'}), (t2:Turn {role: 'user'}) WHERE (t1)<-[:CHILD_OF]-(t2)
    RETURN t1, t2
    """)  # Finds at least one user-child under the system turn.
   - records = result.single()  # Retrieves a matching pair (many may exist, but one is enough to prove link).
   - assert records[0] is not None and records[0]['id'] is not None  # System node exists and has id.
   - assert records[1] is not None and records[1]['id'] is not None  # User child node exists and has id.
   - session.close(); driver.close()
   - def test_seed_user_node_has_child_relationship():  # Validates user→assistant CHILD_OF link.
   - driver, session, test_file = start_neo4j_session()
   - for i in range(14):  # Executes first 14 seed statements up through assistant-child-of-user edge.
        stmt = test_file.split(";")[i]
        session.run(stmt)
   - result = session.run("""
    MATCH (t1:Turn {role: 'user'}), (t2:Turn {role: 'assistant'}) WHERE (t1)<-[:CHILD_OF]-(t2)
    RETURN t1, t2
    """)  # Finds at least one assistant-child under the user turn.
   - records = result.single()
   - assert records[0] is not None and records[0]['id'] is not None  # User node exists and has id.
   - assert records[1] is not None and records[1]['id'] is not None  # Assistant child node exists and has id.
   - session.close(); driver.close()
   - def test_day_by_module_index():  # Validates Day index used for ordered listing in UI.
   - driver, session, test_file = start_neo4j_session()
   - test_file = test_file.split(";")[7]  # Eighth statement – creates day_by_module index.
   - session.run(test_file)
   - result = session.run("""
    SHOW INDEXES YIELD name WHERE name = 'day_by_module' RETURN name
    """)
   - record = result.single()
   - assert record is not None and record["name"] == 'day_by_module'
   - session.close(); driver.close()
   - def test_turn_embedding_index():  # Confirms vector index exists for Turn.embeddings.
   - driver, session, test_file = start_neo4j_session()
   - test_file = test_file.split(";")[8]  # Ninth statement – creates turnEmbedding vector index.
   - session.run(test_file)
   - result = session.run("""
    SHOW INDEXES YIELD name WHERE name = 'turnEmbedding' RETURN name
    """)
   - record = result.single()
   - assert record is not None and record["name"] == 'turnEmbedding'
   - session.close(); driver.close()

4. docs/scripts/neo4j/002_seed_data.cypher
   - MERGE (root_turn:Turn {id: 1, role:'root'});  # Establishes the root Turn node of the conversation DAG; this anchor allows subsequent ROOTS and CHILD_OF relationships to attach correctly while keeping the seed id sequence consistent.
   - MERGE (system_turn:Turn {id:2, role:'system', accepted:true});  # Creates the system Turn node with its acceptance status.
   - MATCH (t1:Turn {role: 'root'}), (t2:Turn {role: 'system'}) CREATE (t1)<-[:CHILD_OF]-(t2);  # Links the system Turn beneath the root.
   - MERGE (user_turn_1:Turn {id:3, role:'user', accepted:true});  # Adds the initial user Turn node, flagged as accepted to be part of the initial gold path.
   - MATCH (t2:Turn {role: 'system'}), (t3:Turn {role: 'user'}) CREATE (t2)<-[:CHILD_OF]-(t3);  # Attaches the user Turn beneath the system Turn.
   - MERGE (assistant_turn_1:Turn {id:4, role:'assistant', accepted:true});  # Adds the assistant Turn node, also accepted to complete the gold path seed.
   - MATCH (t3:Turn {role: 'user'}), (t4:Turn {role: 'assistant'}) CREATE (t3)<-[:CHILD_OF]-(t4);  # Links the assistant Turn beneath the user Turn.

5. tests/test_import_google_docs.py
   - import pydantic  # Brings Pydantic into scope for eventual schema validation of Google-Docs JSON.
   - import pytest  # Testing framework used for TDD and exception assertions.
   - import sys; sys.path.insert(0, './')  # Ensures workspace root is on PYTHONPATH so local packages resolve in CI.
   - from docs.scripts.import_google_docs import import_file  # Imports the CLI helper under test.
   - def test_cli_gdocs_import():  # Happy-path: validates a minimal 1-turn JSON is accepted and returns a UUID.
   - sample_json = [{"seq": 1, "role":"system", "text": "this is the system prompt"}, {"seq": 2, "role":"user", "text": "this is the user reply"}, {"seq": 3, "role":"assistant", "text": "this is the assistant response"}]  # Three-turn canonical payload.
   - job_id = import_file(sample_json)  # Executes helper and captures job identifier.
   - assert isinstance(job_id, str) and len(job_id) == 36  # Confirms UUID string format.
   - def test_path_is_valid():  # Negative-path: payload missing required field must raise ValueError.
   - sample_json = [{"role":"system", "text": "this is the system prompt"}]  # Invalid – no `seq` field.
   - with pytest.raises(ValueError):  # Asserts validation failure.
   -     import_file(sample_json)  # Attempt import – should trigger exception.
   - Updated `test_path_is_valid` to expect successful import when only mandatory fields are present, matching new optional `seq` (lines 20-36).

6. docs/scripts/import_google_docs.py
   - import uuid  # Standard library for generating unique job identifiers (UUIDv1 here for timestamp ordering).
   - import pydantic  # Adds Pydantic to perform robust schema validation on incoming Google-Docs JSON turns.
   - from pydantic import BaseModel  # Imports the Pydantic base class to declare our validation model.
   - class validJSON(BaseModel):  # Schema model describing a single turn in the script.
   -     role: str  # Required role (system/user/assistant etc.).
   -     text: str  # The text content of the turn as written in Google-Docs.
   -     seq: int  # Sequence number denoting ordering inside the script.
   - def import_file(json_file_path):  # Public CLI entry; now accepts a file path rather than raw JSON.
   -     paths_list = pathlib.Path(json_file_path).parts  # Breaks the path into its components so we can grab program/module/day/persona.
   -     program_name, module_folder, day_folder, file_name = paths_list[-4], paths_list[-3], paths_list[-2], paths_list[-1]  # Four catalog clues: Program, Module##, Day##, persona.json.
   -     module_seq = int(module_folder[6:])  # Extract numeric portion from "Module01".
   -     day_seq = int(day_folder[3:])  # Extract numeric portion from "Day03".
   -     persona_name = file_name[:-5]  # Strip ".json" to get persona identifier.
   -     persona_seq = int(''.join(ch for ch in persona_name if ch.isdigit()) or 0)  # Derive a numeric ordering for the persona.
   -     script_contents = json.loads(pathlib.Path(json_file_path).read_text())  # Load the JSON turns for validation.
   -     for item in script_contents:  # Validate every turn via Pydantic – enforces required keys.
   -         validJSON(**item)
   -     session.run("""
        MERGE (p:Program {id: $program_id});
        """, {"program_id": program_name})  # Upserts Program by ID.
   -     session.run("""
        MERGE (m:Module {id: $module_seq, seq: $module_seq});
        MERGE (p)-[:HAS_MODULE]->(m)
        """, {"program_id": program_name, "module_seq": module_seq})  # Ensures Module node and its parent link.
   -     session.run("""
        MERGE (d:Day {id: $day_seq, seq: $day_seq});
        MERGE (m)-[:HAS_DAY]->(d)
        """, {"module_seq": module_seq, "day_seq": day_seq})  # Day node plus HAS_DAY relationship.
   -     session.run("""
        MERGE (per:Persona {id: $persona_id, seq: $persona_seq});
        MERGE (d)-[:HAS_PERSONA]->(per)
        """, {"persona_id": persona_name, "persona_seq": persona_seq, "day_seq": day_seq})  # Persona node with mandatory seq, linked to Day.

7. docs/scripts/import_google_docs.py (latest additions)
   - parent_id = None  # Initializes the cursor that remembers the most recently inserted Turn so we can link CHILD_OF edges correctly.
   - root_id = uuid.uuid1()  # Generates a UUID for the root Turn node that anchors the Script-DAG.
   - session.run("""
    MERGE (root_node:Turn {id: $uuid, role: 'root', ts: timestamp()});
    MATCH (t:Turn {id: $uuid, role: 'root'}), (per:Persona {id: $persona_id, seq: $persona_seq}) MERGE (per)-[:ROOTS]->(t)
    """, {"persona_id": persona_name, "persona_seq": persona_seq, "uuid": root_id})  # Persists the root Turn and wires the Persona → ROOTS edge in one transaction.
   - parent_id = root_id  # Updates the cursor so the very first script turn links back to the root.
   - for turn_item in script_contents:  # Begins iterating over the validated JSON turns in canonical order.
   -     new_turn_id = uuid.uuid4()  # Generates a fresh UUIDv4 for the current Turn to guarantee global uniqueness.
   -     session.run("""
        MERGE (turn_node:Turn {id: $turn_id, role: $turn_role, seq: $turn_seq, text: $turn_text, accepted:true, parent_id: $parent_turn_id, ts: timestamp()});
        MATCH (t1:Turn {id: $parent_turn_id}), (t2:Turn {id: $turn_id}) MERGE (t1)<-[:CHILD_OF]-(t2);
        """, turn_id=new_turn_id, turn_role=turn_item["role"], turn_seq=turn_item["seq"], turn_text=turn_item["text"], parent_turn_id=parent_id)  # Inserts the Turn node, establishes the CHILD_OF edge, and marks it accepted because we're importing the canonical storyline.
   -     parent_id = new_turn_id  # Advances the cursor so the next turn in the JSON array points to this newly created node.

8. docs/neo4j_catalog_schema.md (clarification)
   - • Mandatory for `system`, `user`, and `assistant` roles: `accepted` (bool, default **false** **– except when a canonical script is imported via `import_google_docs.py`, in which case each imported turn starts with `accepted:true` to reflect its gold-path status**); optional for the single `root` node.  # Updated the property description to document canonical import behaviour.

9. docs/scripts/import_google_docs.py (CLI wrapper additions)
   - import argparse  # Standard library helper for building CLI interfaces.
   - if __name__ == "__main__":  # Standard Python guard to ensure code runs only when script is executed directly.
   -     parser = argparse.ArgumentParser(description="Import Google-Docs JSON into Neo4j")  # Constructs the CLI parser with a helpful description.
   -     parser.add_argument("json_path", help="Path to <Program>/<Module##>/<Day##>/<persona##>.json")  # Required positional argument: the script JSON to import.
   -     args = parser.parse_args()  # Parses command-line inputs into a structured namespace.
   -     job_id = import_file(args.json_path)  # Executes the import routine and captures the returned Job-ID.
   -     print(f"Imported script successfully. Job-ID: {job_id}")  # Surface the identifier so callers can track downstream tasks.

10. docs/scripts/import_google_docs.py (path validation + Program.seq)
   - # ----------------------------  ⚠ Path-structure validation  ⚠ ---------------------------  # Guard ensuring path includes <Program>/<Module##>/<Day##>/<persona>.json
   - if len(paths_list) < 4: raise ValueError("json_file_path must contain at least four components: <Program>/<Module##>/<Day##>/<persona>.json")
   - program_seq = int(''.join(ch for ch in program_name if ch.isdigit()) or 0)  # Extract numeric ordering or default to 0.
   - session.run("""MERGE (p:Program {id: $program_id}) SET p.seq = $program_seq""", {"program_id": program_name, "program_seq": program_seq})  # Upserts Program with seq property.

11. tests/test_import_google_docs.py (invalid path test)
   - def test_bad_file_path_structure_raises_value_error(tmp_path):  # Verifies malformed path triggers ValueError.
   - bad_path = tmp_path / "lonely_script.json"  # Path missing required folders.
   - with pytest.raises(ValueError): import_file(str(bad_path))  # Expect guard to raise.

12. apps/api-server/package.json
   - "devDependencies": {"nodemon": "^3.1.10"}  # Adds nodemon for automatic reload on file changes during local development.
   - "dependencies": {"express": "^5.1.0"}  # Introduces Express as the runtime HTTP framework for the API server.
   - "scripts.dev": "nodemon src/index.js"  # Shortcut to launch the server with hot-reload in development.
   - "main": "src/index.js"  # Points Node to the application entrypoint living in the src folder.
   - "scripts.test": "jest --passWithNoTests"  # Switches Jest to pass when no tests are present, keeping CI green before real tests exist.
   - "scripts.start": "node src/index.js"  # Adds an explicit start command used by production and Vercel builds.

13. apps/api-server/src/index.js
   - /** This file is the starting point of our API server. It explains—in everyday words—how we load env-vars, create the Express app, parse JSON requests and start listening. */  # Added full layman-friendly docstring per implementation guidelines.
   - import * as dotenv from 'dotenv'  # Loads variables from .env so configuration lives outside code.
   - dotenv.config()  # Parses the .env file and populates process.env.
   - import express from 'express'  # Brings in the Express web-framework to create the HTTP API.
   - Early imports of `../libs/node-shared/redis.js` and `initNeo4j()` verification ensure Vercel cold-start logs immediately show ✅/❌ for Redis & Neo4j tunnels (lines 15-25).
   - const app = express()  # Instantiates the Express application.
   - const PORT = process.env.PORT || 4000  # Configurable listening port with a sensible default.
   - app.get('/health', (req, res) => res.json({ status: 'ok' }))  # Lightweight health-check endpoint for uptime probes.
   - app.use(express.json());  # Registers the JSON body-parser middleware so every route can read req.body without extra setup.
   - app.listen(PORT, () => console.log(`API listening on port ${PORT}`))  # Starts the server and logs readiness ✔.

14. apps/api-server/.env.example
   - NEO4J_URI=bolt://localhost:7687  # Local Neo4j instance endpoint.
   - NEO4J_USER=neo4j  # Default Neo4j username.
   - NEO4J_PASSWORD=your_db_password  # Replace with the real password in your private .env.
   - REDIS_URL=redis://localhost:6379  # Local Redis instance URL.
   - JWT_SECRET=change_me  # Secret used to sign/verify JWT tokens.
   - PORT=4000  # API listening port; matches index.js fallback.

15. apps/api-server/README.md
   - # API Server – Flow 1 Dataset Editing  # Introduces the new README for the Node backend in plain language.
   - cd apps/api-server          # jump into this folder  # Example command explaining local setup; kept here so future readers can trace when README instructions were added.

16. apps/api-server/libs/node-shared/redis.js
   - import { createClient } from "redis"  # Pulls in Redis v4 client constructor.
   - if (!process.env.REDIS_URL) throw new Error("Environment variable REDIS_URL is undefined!")  # Fail-fast guard ensures env var is set.
   - const redisClient = createClient({ url: process.env.REDIS_URL }); await redisClient.connect();  # Establishes a singleton connection at startup.
   - export default redisClient;  # Makes the client reusable across route handlers.
   - production branch now falls back to stub if Redis connection fails and logs warning instead of crashing; adds error listener.

17. apps/api-server/libs/node-shared/jwt.js
   - const sign_jwt = (payload) => jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: '12h' });  # Helper signs a JWT with 12-hour expiry.
   - const verify_jwt = (token) => jwt.verify(token, process.env.JWT_SECRET);  # Verifies a JWT and returns the decoded payload (throws on error).
   - Fail-fast guard: throws if JWT_SECRET env var is missing. Includes JSDoc example for clarity.

18. apps/api-server/libs/node-shared/db.js
   - function envRequired(key) { /* Ensures required env vars are set; DRYs look-ups. */ }
   - const uri = envRequired('NEO4J_URI'); const username = envRequired('NEO4J_USER'); const password = envRequired('NEO4J_PASSWORD');  # Uses helper to fetch credentials once.
   - async function withSession(callback) { /* Opens session, runs callback, closes */ }  # Convenience wrapper demanded by spec.
   - async function initNeo4j() { /* Lazily verifies connectivity; app calls at startup */ }
   - export { driver, withSession, initNeo4j };  # Named exports enabling fine-grained imports in other modules.

19. apps/api-server/src/middleware/error.js
   - /*** Centralised error-handling middleware for Express with plain-English docstring explaining purpose and usage; always returns JSON with `error` key (status fallback to 500, hides stack trace in production). */
   - const errorHandler = (err, req, res, next) => { /* logs error, picks status from err.status||500, builds payload, conditionally adds stack, sends JSON */ }  # New global error handler fulfilling spec item 2.3 Express skeleton.

20. apps/api-server/src/index.js (update)
   - import errorHandler from './middleware/error.js'  # Brings in the new middleware for use.
   - // Register the global error handler AFTER all routes so Express only reaches it when something goes wrong in the chain above.
   - app.use(errorHandler)  # Mounts middleware at end of chain ensuring consistent JSON errors.

21. apps/api-server/src/routes/auth.js
   - /*** Tiny router handling the login endpoint … demo account, JWT signing. Added full layman docstring lines 1-22. */
   - const DEMO_USER = { email: 'demo@acme.test', password: 'pass123', role: 'editor' };  # New hard-coded credential.
   - if (typeof email !== 'string' || typeof password !== 'string' || !email.trim() || !password.trim()) {  # Extra guard ensuring both credentials are non-empty strings before proceeding. This fulfils validation-layer spec item 2.3.5.
   -     return res.status(400).json({ error: 'Email and password must be non-empty strings' });  # Responds with 400 for any malformed types or blank values.
   - const payload = { email, role: DEMO_USER.role };  # Use role from demo user.

22. apps/api-server/src/index.js (router mount)
   - import authRouter from './routes/auth.js'  # Brings in the new auth router.
   - app.use('/auth', authRouter)  # Exposes POST /auth/login (mount path before error handler).

23. apps/api-server/src/app.js
   - /*** Builds and configures the Express app but does NOT start the server. All routes, middleware, and error handlers are registered here. Exports the app for use in tests or by index.js. */
   - import express, dotenv, errorHandler, authRouter;  # All setup code moved here.
   - app.use(express.json()), app.use('/auth', authRouter), app.use(errorHandler)  # All middleware and routes registered here.
   - export default app;  # Makes the app available for tests and server entrypoint.

24. apps/api-server/src/index.js (refactor)
   - /*** Entry point: imports the app and starts the server. No route/middleware setup here. */
   - import app from './app.js'  # Now only imports the pre-built app.
   - app.listen(port, ...)  # Starts the server for real use only.

25. apps/api-server/tests/auth.test.js (imports fix)
   - import request from 'supertest';  # corrected module name
   - import app from '../src/app.js';  # fixed relative path

26. apps/api-server/package.json (Jest ESM)
   - "test": "NODE_OPTIONS=--experimental-vm-modules jest"  # Allows Jest to run ES-module syntax in tests.

27. apps/api-server/tests/auth.test.js (env secret)
   - process.env.JWT_SECRET = 'testsecret';  # Set a dummy secret before app import so JWT helper doesn't throw.

28. apps/api-server/jest.config.js
   - export default { testEnvironment: 'node', setupFilesAfterEnv: ['./tests/setupEnv.js'] };  # Jest config enabling ESM and env setup.

29. apps/api-server/tests/setupEnv.js (update)
   - Replaced static import with dynamic `await import('../libs/node-shared/db.js')` inside afterAll to avoid env var ordering issue.

30. apps/api-server/tests/auth.test.js (cleanup)
   - removed process.env.JWT_SECRET line; env is now set in setup file.

31. .cursor/rules/implementation.mdc (tests policy expanded)
   - Expanded the "ALL MODES – Tests are always AUTO" bullet to specify writing edge-case tests and always executing the full suite after changes.

32. apps/api-server/src/routes/hierarchy.js
   - /** Defines the /hierarchy endpoint. When a logged-in user calls GET /hierarchy, it returns the full catalog tree (Program → Module → Day → Persona) as a nested JSON object. Example usage: curl -H "Authorization: Bearer <token>" http://localhost:4000/hierarchy */
   - router.get('/', async (req, res, next) => { ... });  # Handler opens a Neo4j session, runs a Cypher query to fetch the full catalog, and transforms the flat result into a nested array structure. All steps are explained in plain language comments. Responds with { data: tree } or passes errors to the global handler.

33. apps/api-server/src/app.js
   - Replaced mistaken `app.use('/hierarchy', authRouter, hierarchyRouter)` with `app.use('/hierarchy', authMiddleware, hierarchyRouter)` to ensure the endpoint is protected by JWT verification.

34. apps/api-server/tests/script.test.js
   - New Jest test file verifying GET /script/:personaId behaviour: ensures auth required, happy path returns gold-path turns for persona id 1 from seed, 404 on missing persona.

35. apps/api-server/src/routes/script.js
   - Implements GET /script/:personaId endpoint: fetches gold-path turns for a persona, returns as JSON, 404 if not found. Added layman docstring and comments throughout.

35b. apps/api-server/src/routes/script.js
    - Replaced APOC-based traversal with plain Cypher variable-length path to avoid plugin requirement in CI.

35c. apps/api-server/src/routes/script.js
    - Added logic to cast numeric personaId path param to integer for Neo4j type-matching.

36. apps/api-server/src/routes/turn.js
   - /*** Router: /turn … ***/   # New fully documented route handling PATCH /turn/:turnId, creates new Turn, emits Redis event.

37. apps/api-server/src/app.js (addition)
   - import turnRouter from './routes/turn.js'  # Adds turn router import.
   - app.use('/turn', authMiddleware, turnRouter);  # Mounts router behind JWT guard.

38. apps/api-server/libs/node-shared/redis.js
   - Introduced environment-aware wrapper: returns in-memory stub when NODE_ENV==='test'; otherwise connects to Redis and exposes xAdd/quit proxy methods.

39. apps/api-server/tests/turn_patch.test.js
   - New Jest + Supertest test covering happy path, missing text, and unauthenticated cases. Also spies on Redis xAdd call to verify event emission.

40. contracts/events/script.turn.updated.yaml
   - Added formal event contract YAML describing field types and examples for the emitted `script.turn.updated` stream entry.

41. apps/api-server/src/routes/export.js
   - /*** Router: /export … file created with TODO markers. Responds 501 Not Implemented until user fills logic. Lines 1-40 new. */

42. apps/api-server/src/app.js (export router mount)
   - import exportRouter from './routes/export.js'  # New import to bring in the route file.
   - app.use('/export', authMiddleware, exportRouter);  # Mounts the route behind the JWT guard.  (lines ~20 and ~40 updated)

43. apps/api-server/tests/export.test.js
   - New Jest test file verifies /export endpoint requires auth and currently returns 501 with placeholder error. Lines 1-25 new.

44. apps/api-server/src/routes/export.js (update)
   - Added `import { withSession } from '../../libs/node-shared/db.js'` at top.
   - Replaced Cypher query with two-step MATCH that includes root turn or accepted turns and removed NULL rows (lines ~30-42 updated).

45. apps/api-server/tests/export.test.js (update)
   - Changed second test to expect 200 OK and verify returned payload is an array after implementing export logic (lines 13-21 updated).

46. apps/api-server/src/routes/export.js (header addition)
   - Added `Content-Disposition` header before `res.json` so browsers treat response as downloadable file. Lines ~50-55 updated.

47. Multi-file refactor – fully removed deprecated Turn.seq property and switched ordering to depth+ts.
   - docs/scripts/import_google_docs.py: class validJSON now treats seq as optional (lines 25-55); Turn creation Cypher no longer writes `seq` (lines 230-250).
   - apps/api-server/src/routes/script.js: query and response shape updated to depth+ts (lines 20-45).
   - apps/api-server/src/routes/export.js: same depth+ts ordering and response schema (lines 35-60).
   - apps/api-server/src/routes/turn.js: new Turn creation no longer copies/bumps seq (lines 60-80).
   - apps/api-server/tests/script.test.js: expectations updated to depth property and role order assertion (lines 48-65).
   - docs/scripts/neo4j/003_remove_turn_seq.cypher: new migration file removing `seq` property from existing turns.

48. tests/test_import_google_docs.py – Updated `test_path_is_valid` to expect successful import when only mandatory fields are present, matching new optional `seq` (lines 20-36).

49. contracts/events/script.turn.diff_reported.yaml
   - name: script.turn.diff_reported  # Declares the event name so queues and dashboards can filter easily.
   - fields.id.type: string           # Every field is string-typed for maximal language interoperability.
   - fields.parent_id.type: string    # Parent Turn identifier.
   - fields.persona_id.type: string   # Persona owning the script.
   - fields.diff_html.type: string    # Rendered HTML diff payload.
   - fields.grade.type: string        # Quick score emitted by the Python worker.

50. tests/test_event_contracts.py
   - def test_diff_reported_contract_shape():  # Ensures YAML contract includes all mandatory keys; fails fast on divergence.
   - expected = {'id', 'parent_id', 'persona_id', 'diff_html', 'grade'}  # Canonical set of keys as per spec.
   - assert expected.issubset(contract['fields'].keys())  # Assertion guarding against accidental contract drift.

51. apps/api-server/src/routes/turn.js
   - Added length validation: if commit_message.length > 120 → 400 Bad Request.    # Ensures server matches front-end cap.

52. apps/api-server/tests/turn_patch.test.js
   - New test 'returns 400 when commit_message exceeds 120 characters' verifies the guard by sending a 121-char string and expecting HTTP 400.

53. apps/api-server/src/routes/auth.js
   - if (typeof email !== 'string' || typeof password !== 'string' || !email.trim() || !password.trim()) {  # Extra guard ensuring both credentials are non-empty strings before proceeding. This fulfils validation-layer spec item 2.3.5.
   -     return res.status(400).json({ error: 'Email and password are required' });  # Responds with 400 for any malformed or blank values while keeping error message consistent.

54. apps/api-server/src/routes/export.js
   - lines 1-28 replaced: outdated TODO/scaffold docstring removed and replaced with final layman-friendly explanation of implemented export logic, including step-by-step outline, error behaviour, and example curl. This brings documentation in sync with code and finalises validation-layer completeness for 2.3.5.

55. .eslintrc.cjs
   - module.exports = { root:true, env:{ node:true, jest:true }, extends:["eslint:recommended","plugin:prettier/recommended"], /* plus layman comments */ }
56. .prettierrc.json
   - { "semi": true, "singleQuote": true, "trailingComma": "none", "printWidth": 100 }
57. apps/api-server/package.json
   - Added scripts: "lint" and "lint:fix".
   - Added devDependencies: eslint, eslint-plugin-prettier, eslint-config-prettier, prettier.

---
# Update – C.I. Neo4j & Export 404 Test (2025-05-12)

1. docker-compose.yml
   - lines 1-31: **New file** – Minimal Compose definition that spins up `neo4j:5.18.0` on ports 7687/7474 with `NEO4J_AUTH=neo4j/test12345`, a named volume, and health-check. Provides a plug-and-play DB for Jest & Github-Actions.

2. apps/api-server/tests/setupEnv.js
   - Added lines 10-36: `beforeAll` retry-loop that waits for Neo4j to accept Bolt connections (up to 10 attempts with back-off) before the first test runs. Prevents race-conditions on slower CI hosts.

3. apps/api-server/tests/export.test.js
   - Added lines 18-30: New test case `"respond with 404 for a non-existent persona"` ensuring the route returns a proper JSON error when the requested persona ID is missing.

58. apps/api-server/tests/setupEnv.js
   - Added Docker Compose auto-start/stop logic with port-open check; avoids race-conditions and multiple starts.
59. apps/api-server/README.md
   - Simplified test instructions: container now started automatically; manual docker commands removed.

60. docs/implementation_plan/user_flow_1_implementation_plan.md
   - Added curl-based endpoint examples under item 2.3.10 Documentation updates, fulfilling the endpoint example requirement (lines ~150-190).

61. .gitignore
   - # .gitignore – lists folders & files we do NOT want in Git so the repository stays small and free of secrets.
   - node_modules/  # Node packages can be re-installed any time; no need to version.
   - venv/          # Python virtual env is machine-specific and bulky.
   - .env           # Contains private keys and passwords – keep out of source control.
   - .cursor/       # AI assistant scratch data; meaningless to other devs.
   - __pycache__/   # Compiled Python byte-code; regenerated automatically.

62. docs/implementation_plan/user_flow_1_implementation_plan.md
   - Renamed item 11 to **Git source control** and marked COMPLETE ✅.
   - Inserted new item 12 **Vercel integration** (moved down unchanged).  # Keeps plan numbering accurate after repository versioning work.

63. .cursor/rules/implementation.mdc
   - Added **MICRO-TASK STEP 10 – Git Commit Convention**: mandates making a Git commit after each micro-task with a descriptive title and body referencing implementation-plan item number and updated code-lines ranges.

64. docs/implementation_plan/user_flow_1_implementation_plan.md
   - Added five bullet points under item 11 (Git source control) detailing branch naming convention, commit message style, micro-task cadence, and push/PR workflow.

65. docs/implementation_plan/user_flow_1_implementation_plan.md
   - Added bullet under item 11 explaining two long-lived branches `dev` and `prod` and promotion flow.

66. .cursor/rules/implementation.mdc
   - Added MICRO-TASK STEP 11 Branching Model: outlines dev → prod two-lane flow and feature branch naming.

67. vercel.json (new file)
   - { "version": 2, "builds": [{ "src": "api/index.mjs", "use": "@vercel/node" }], "routes": [{ "src": "/(.*)", "dest": "api/index.mjs" }], "env": {…} }  # Declarative config telling Vercel how to build and route every request to our Express app, plus env-variable passthrough.

68. api/index.mjs (new file)
   - /** Vercel serverless entrypoint that simply exports the Express app so every request is handled exactly the same as in local dev. */
   - import app from '../apps/api-server/src/app.js';
   - export default app;  # One-liner proxy; Vercel injects req/res so no port listening needed.

69. apps/api-server/env.example (new file)
   - NEO4J_URI=bolt://localhost:7687
   - NEO4J_USER=neo4j
   - NEO4J_PASSWORD=your-db-password
   - REDIS_URL=redis://localhost:6379
   - JWT_SECRET=change-me-in-production
   - PORT=4000  # Sample var list developers copy to .env and to the Vercel dashboard.

70. tests/test_event_contracts.py
   - def test_updated_contract_shape():  # New unit test that ensures the `script.turn.updated` event contract always contains the agreed mandatory fields so future edits cannot silently remove them.
   - contract = _load_contract('contracts/events/script.turn.updated.yaml')  # Loads the YAML file under test.
   - assert contract['name'] == 'script.turn.updated'  # Quick top-level check that the event name never changes.
   - expected = {'id', 'parent_id', 'persona_id', 'editor', 'ts', 'text', 'commit_message'}  # Canonical list of required keys.
   - assert expected.issubset(contract['fields'].keys())  # Passes if YAML lists all keys; fails CI otherwise.

71. docs/implementation_plan/user_flow_1_implementation_plan.md
   - Milestones section (lines ~25-40): updated M4 to "Python diff-worker plus Docker-Compose integration" and added new M7 "Post-MVP infra migration – GPU workstation".
   - Section 2.5 (lines ~140-190) completely rewritten: removed immediate infra-switch, detailed Docker-Compose additions (`redis`, `diff_worker`), memory limits, profile usage, and clarified worker behaviour & tests.
   - Section 2.8 (lines ~250-300) **newly added**: step-by-step guide for migrating Neo4j, Redis, and Python workers to the shared GPU workstation after staging passes, including env-var flips, health checks, and rollback plan.

72. docker-compose.yml (redis & diff_worker services)
   - lines 20-47: **Added `redis` service** (profiles diff, 256 MB mem_limit, health-check, volume).
   - lines 49-61: **Added `diff_worker` service** (builds ./apps/py-ai-service, env vars, depends_on redis).
   - volumes section: added named volume `redis_data`.

73. apps/py-ai-service/Dockerfile (new file)
   - Python 3.10-slim image, installs requirements, copies source, runs `diff_worker.py` under non-root user. (lines 1-30)

74. apps/py-ai-service/requirements.txt (new file)
   - `redis==5.0.4`
   - `neo4j==5.28.0`

75. apps/py-ai-service/diff_worker.py (new file)
   - Added `from neo4j import GraphDatabase` import.
   - Declared new env vars `NEO4J_URI`, `NEO4J_USER`, `NEO4J_PASSWORD` and created a single driver instance in `main()` with connectivity check.
   - Implemented parent text retrieval inside `_process_message` via Cypher `MATCH (t:Turn {id: $id}) RETURN t.text`.
   - Gracefully logs and falls back to empty string on errors so diffs are still published.
   - Added global `_neo4j_driver` reference at bottom for type clarity.

76. apps/py-ai-service/diff_worker.py (previous-text Neo4j lookup)
   - Added `from neo4j import GraphDatabase` import.
   - Declared new env vars `NEO4J_URI`, `NEO4J_USER`, `NEO4J_PASSWORD` and created a single driver instance in `main()` with connectivity check.
   - Implemented parent text retrieval inside `_process_message` via Cypher `MATCH (t:Turn {id: $id}) RETURN t.text`.
   - Gracefully logs and falls back to empty string on errors so diffs are still published.
   - Added global `_neo4j_driver` reference at bottom for type clarity.

77. docker-compose.yml
   - diff_worker environment: added `NEO4J_USER=neo4j`, `NEO4J_PASSWORD=test12345` to match Neo4j service credentials.

78. tests/test_diff_worker.py (new file)
   - Adds fully mocked unit tests for diff_worker ensuring HTML diff contains "diff_add" on new text and worker handles missing `text` safely without raising. Uses dynamic import because of dash in directory name.

79. scripts/start_ngrok_tunnels.sh
   - #!/usr/bin/env bash  # Shebang makes the file executable in any Unix shell.
   - ###############################################################################  # Visual divider explaining purpose in a non-techie style.
   - # start_ngrok_tunnels.sh – Convenience wrapper to expose local Neo4j + Redis via ngrok so Vercel preview builds can reach your laptop.
   - HOW IT WORKS section (lines 5-20) explains the five key steps in everyday language: checks ngrok, opens two tunnels, parses addresses, prints env-vars, keeps tunnels alive.
   - Helper functions `print_ok`, `print_wait`, `print_error` (lines ~35-55) use colourful icons to improve UX and readability, and new `has_ngrok_token` multi-path checker (lines ~60-95) detects the token in ngrok v2, v3, or NGROK_AUTHTOKEN env.
   - Resilient address extraction (lines ~120-135) now matches any `tcp://host:port` pattern instead of relying on `"addr":` JSON key so it works across ngrok versions.
   - Timeout is configurable via `TUNNEL_TIMEOUT` env and debug dumps enabled when `DEBUG_NGROK_TUNNELS=1` (lines ~120-145).
   - Tunnel startup commands (lines ~85-100) run `ngrok tcp 7687` and `ngrok tcp 6379` in the background while streaming JSON logs to temp files so we can parse them.
   - Function `wait_for_tunnel` (lines ~105-125) loops until the forwarding address appears, then extracts `tcp://⟨host⟩:⟨port⟩` with `grep`+`sed`.
   - After parsing, the script echoes ready-to-copy connection strings (NEO4J_URI, REDIS_URL) inside a bold divider (lines ~135-150).
   - Final `wait` call (last line) keeps the script running so the two ngrok tunnels stay alive until the user hits Ctrl-C.

80. package.json (root)
   - Declares monorepo-level dependencies so Vercel's @vercel/node builder installs runtime libs.
   - Lists dotenv, express, jsonwebtoken, neo4j-driver, redis with same versions as apps/api-server to avoid duplication issues.
   - Marked "private": true to prevent accidental npm publish.

81. Front-end scaffold – apps/frontend (multiple new files)
   - apps/frontend/package.json (lines 1-40) – Declares React 18 app, scripts `dev/build/test`, dependencies (react, router, zustand, etc.).
   - apps/frontend/vite.config.js (lines 1-25) – Configures Vite with react plugin.
   - apps/frontend/index.html (lines 1-20) – Single-page HTML shell with <div id="root">.
   - apps/frontend/src/main.jsx (lines 1-35) – Boots React app, adds BrowserRouter and Toaster.
   - apps/frontend/src/App.jsx (lines 1-35) – Defines route switch mapping /login → LoginView.
   - apps/frontend/src/pages/LoginView.jsx (lines 1-100) – Email/password form that POSTs /auth/login; saves JWT via zustand; shows toasts.
   - apps/frontend/src/store/useAuthStore.js (lines 1-35) – zustand store for JWT persisting to localStorage.
   - apps/frontend/tests/LoginView.test.jsx (lines 1-20) – Smoke test: renders LoginView and asserts email input exists.
   - apps/frontend/jest.config.js (lines 1-20) & babel.config.js (lines 1-10) – Jest setup for JSX.
   - apps/frontend/.eslintrc.cjs (lines 1-25) – ESLint rules for browser React code.

82. Front-end dependency fix – apps/frontend/package.json
   - Changed devDependencies.identity-obj-proxy version from ^4.0.0 to ^3.0.0 because npm registry has no 4.x release (lines ~25-30 in file).

83. Front-end dependency fix – apps/frontend/package.json
   - Bumped react-flow-renderer from ^11.8.6 (non-existent) to ^11.10.0 (latest 11.x) so npm install succeeds on Vercel.

84. Front-end dependency fix – apps/frontend/package.json
   - Downgraded react-flow-renderer to ^10.6.13 because 11.x series published under new package name; keeps install working.

85. Front-end dependency switch – apps/frontend/package.json
   - Removed react-flow-renderer and added reactflow ^11.11.4 (new official package name) to avoid ETARGET errors.

86. Front-end API helper and LoginView update
   - apps/frontend/src/lib/api.js (new file) – apiFetch helper prefixes paths with VITE_API_BASE_URL, JSON header default, throws on error.
   - apps/frontend/src/pages/LoginView.jsx – replaced raw fetch with apiFetch and added import.

87. API CORS support – apps/api-server/src/app.js import cors and added middleware; package.json adds dependency.

88. Root package.json update – added cors ^2.8.5 so Vercel builder for api/index.mjs includes the library.

89. apiFetch URL normalization – strip trailing slash from VITE_API_BASE_URL and ensure single leading slash to avoid //auth/login redirect that broke CORS preflight.

90. Added app.options('*', cors(...)) to ensure preflight CORS requests get proper headers.

91. Front-end SPA fallback – added apps/frontend/vercel.json with rewrite to serve index.html for all routes.

92. Improved CORS – app.js now parses CORS_ORIGIN into exact + wildcard patterns and builds dynamic checker allowing *.vercel.app domains.

93. apps/api-server/src/app.js
   - Replaced open CORS debug block (lines ~40-100 removed) with dynamic whitelist function `buildCorsOptions` and Express-5 `/{*splat}` pre-flight handler (new lines ~40-110).

94. apps/api-server/tests/cors.test.js
   - **New file** lines 1-40 – Jest + Supertest test that sends OPTIONS /auth/login and asserts 204 status plus correct CORS headers.

95. apps/api-server/README.md
   - Added new "CORS policy" section (lines 80-115) explaining how to add new domains via `CORS_ORIGIN` env var and wildcard syntax.

96. docs/implementation_plan/user_flow_1_implementation_plan.md
   - Added "CORS hardening – Status: COMPLETE ✅" subsection under 2.3 API-Server.

97. apps/frontend/index.html
   - Added `margin:0; padding:0;` to `html, body` rule inside inline <style> to eliminate residual white gutters around the React root.

98. apps/frontend/src/pages/LoginView.jsx
   - Multiple style adjustments: heading fontSize 48, button colour #131413, button text size 32 & weight 600, placeholder + forgot-password text colour #373639, input border #CCCCCC, font sizes 26, scoped style block sets placeholder colour & letter-spacing.

99. apps/frontend/src/pages/LoginView.jsx
   - lines 1-140 replaced: switched header text to "Login", centred form with flexbox, updated button to black/white design, introduced disabled-until-complete logic, and appended a "Forgot password?" link. Extensive layman comments added for future maintainers.

100. apps/frontend/tests/LoginView.test.jsx
   - Extended smoke-test: now also asserts presence of the forgot-password link and verifies the Login button is disabled when inputs are empty, reflecting new UI behaviour.

101. Global styles: introduced `colours` object inside component for maintainability.

102. apps/frontend/src/pages/LoadView.jsx
   - lines ~310-380 replaced: right-side panel now shows staged helper text (module/topic/script) and floating **Export** button.  Added contextual CTA "Load script" button plus disabled logic and toast stub.

103. apps/frontend/src/App.jsx
   - lines 14-32 added: import of LoadView, CanvasStub placeholder component, and new routes `/load` and `/canvas/:personaId`.

104. apps/frontend/src/pages/LoginView.jsx
   - Added `useNavigate` import and `navigate('/load')` call after successful login (lines ~15 and ~65 new).

105. apps/frontend/tests/LoadView.test.jsx
   - New test file lines 1-80: mocks fetch, renders LoadView, asserts hierarchy rendering and persona selection enables "Load script" button.

106. docs/scripts/neo4j/004_demo_catalog.cypher
   - New file lines 1-40: inserts Program 'Program', Module 'Module 1: Defusion', Topic(=Day) 'Topic 1: Intro', and 22 Persona nodes with seq.

106.1 docs/scripts/neo4j/004_demo_catalog.cypher
    - Replaced WITH topic1 block with MATCH (topic1:Day ...) to ensure variable exists when creating personas.

106.2 docs/scripts/neo4j/004_demo_catalog.cypher
    - Added semicolons and combined persona UNWIND into single statement to prevent variable-scope errors when running via -f.

106.3 docs/scripts/neo4j/004_demo_catalog.cypher
    - Added MATCH statements to create HAS_MODULE and HAS_DAY relationships so hierarchy query returns rows.

107. apps/frontend/src/components/Icons/SearchIcon.jsx (new file)
    - Full file (lines 1-70): Stateless magnifying-glass SVG component accepting `size` & `colour` props so we can swap the text placeholder with a real icon.

108. apps/frontend/src/components/Icons/UserIcon.jsx (new file)
    - Full file (lines 1-75): Minimalist avatar SVG (head + shoulders) used in the TopNavBar; same API as `SearchIcon` for consistency.

109. apps/frontend/src/components/TopNavBar/TopNavBar.jsx
   - lines 1-120 updated: default breadcrumb text now "Mindfulness Program" (was "Data Loop"), search icon moved to right section, both icons set to size 36 px, 24 px spacer added between icons, breadcrumb container given left margin 48 px and explanatory layman comments.

110. apps/frontend/src/components/TopNavBar/TopNavBar.module.css
   - .navBar rule: horizontal padding increased from 24 px to 40 px so breadcrumb no longer hugs the viewport after icon relocation.

111. apps/frontend/src/components/HierarchyGraph.jsx
    - lines 13-20: bumped `fontSize` to **36px** and kept `letterSpacing`

850. apps/frontend/src/lib/viewport.js
   - export function anchorRootToTop(viewport, rootNode, topMargin = 60) {  # Pure helper pans the camera so the Program node sits at a fixed margin.
   - const currentScreenY = rootNode.position.y * viewport.zoom + viewport.y;  # Converts flow coordinates to on-screen Y.
   - const requiredDelta = topMargin - currentScreenY;  # Calculates how much to move the camera.
   - return { ...viewport, y: viewport.y + requiredDelta };  # Returns a new viewport with adjusted translation.

851. apps/frontend/src/components/HierarchyGraph.jsx
   - import { anchorRootToTop } from '../lib/viewport.js';  # Pull in new helper.
   - const reactFlowInstance = useReactFlow();  # Access Flow instance for viewport control.
   - useEffect(() => { /* smart fit & nudge logic */ }, [nodes, nodesInitialised]);  # Automatically fits & pins Program node every time children expand.
   - reactFlowInstance.fitView({ padding: 0.1 });  # Lets React-Flow choose a sane zoom.
   - const nudgedVp = anchorRootToTop(currentVp, programNode, 80);  # Moves camera down so Program sits 80 px from top.
   - reactFlowInstance.setViewport(nudgedVp, { duration: 300 });  # Smooth 300 ms glide.

852. apps/frontend/tests/viewport.test.js
   - import { anchorRootToTop } from '../src/lib/viewport.js';  # Unit-test imports helper.
   - const adjusted = anchorRootToTop(viewport, rootNode, 60);  # Calls helper under test.
   - expect(screenY).toBe(60);  # Asserts node lands exactly 60 px from top.

853. apps/frontend/src/pages/LoadView.jsx
   - import { ReactFlowProvider } from 'reactflow';  # Brings in provider needed by ReactFlow hooks.
   - Wrapped <HierarchyGraph> with <ReactFlowProvider> so zustand store exists before useReactFlow hook; fixes error 001.

854. apps/frontend/tests/LoadView.test.jsx
   - import { ReactFlowProvider } from 'reactflow';  # Added to test helper.
   - Render hierarchy inside provider to satisfy hooks during testing.

855. apps/frontend/src/lib/viewport.js
   - export function clampZoom(viewport, minZoom = 0.4, maxZoom = 1.5) {  # New helper that keeps the `zoom` value between sensible bounds (0.4–1.5) so auto-fit never zooms comically in or out.

856. apps/frontend/src/components/HierarchyGraph.jsx
   - Switched persona placement to a *grid* (max 6 per row, 140 px row-gap).  Added `clampZoom` call after `anchorRootToTop`, so final viewport never passes comfort limits.

857. apps/frontend/tests/viewport.test.js
   - Added three unit-tests for `clampZoom`: leaves zoom unchanged inside range, bumps up when too low, caps when too high.

858. apps/frontend/src/components/HierarchyGraph.jsx
   - Introduced `colGap` 60 px and `rowGap` 160 px constants; increased `baseNodeWidth` to 220 and adjusted grid-centering maths so persona nodes are evenly spaced and no longer crowd each other.

859. apps/frontend/src/lib/viewport.js & HierarchyGraph.jsx
   - Added `anchorRootToCorner` helper to pin Program node 80×80 px from the top-left, ensuring it never drifts off-screen when wide persona grids expand; updated `HierarchyGraph` to use it and reverted grid centring sign bug.

860. apps/frontend/src/lib/viewport.js & tests
   - Added `anchorRootToTopCenter` helper; replaced previous corner logic; updated tests to assert root centres horizontally given wrapper width.