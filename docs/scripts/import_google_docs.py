"""
Command-line utility to import Google-Docs-exported JSON scripts into a Neo4j graph.

This script parses a JSON file representing a conversational script (e.g., between a
user and an AI assistant) and persists its structure and content into a Neo4j
database. It derives catalog information (Program, Module, Day, Persona) from the
input file's path, which must adhere to the pattern:
    <ProgramName>/<Module##>/<Day##>/<persona##>.json

Upon successful import, it prints a unique Job ID (UUID string) to the console.

Environment Variables:
    NEO4J_URI:      The Bolt URI for the Neo4j instance (e.g., "neo4j://localhost:7687").
    NEO4J_USER:     Username for Neo4j authentication (e.g., "neo4j").
    NEO4J_PASSWORD: Password for Neo4j authentication.

Example CLI Usage:
    $ python docs/scripts/import_google_docs.py \
        path/to/your/MyProgram/Module01/Day01/Therapist01.json
    Imported script successfully. Job-ID: <UUID_STRING_HERE>
"""
import uuid
import pydantic
from pydantic import BaseModel
from neo4j import GraphDatabase
import os
import pathlib
import json
import argparse  # Standard library helper for building CLI interfaces.
from typing import Optional


class validJSON(BaseModel):
    """Pydantic model for a single turn row coming from Google-Docs JSON.

    We only *require* the conversational role and text content. The previous
    integer `seq` field is no longer mandatory because the DAG depth + the
    `ts` timestamp now give us deterministic ordering (see docs/good-bye-seq).

    The field remains **optional** so legacy JSON exports that still carry a
    `seq` number continue to validate without hard failures – the value is
    simply ignored downstream.

    Example valid payload after the change::

        {
            "role": "assistant",
            "text": "Thanks for using our app!"
        }
    """
    role: str  # e.g. "system", "user", "assistant"
    text: str  # Markdown or plain-text content.
    seq: Optional[int] = None  # Legacy field – accepted but unused.

    class Config:
        extra = "ignore"  # Allows future fields without breaking validation.

def start_neo4j_session():
    """
    Initializes and verifies a Neo4j database connection using environment variables.

    This helper establishes a session with the Neo4j instance specified by
    `NEO4J_URI`, `NEO4J_USER`, and `NEO4J_PASSWORD` environment variables.
    If these are not set, it defaults to typical local development values.
    It also performs a connectivity check to ensure the database is reachable.

    The calling function (`import_file`) is responsible for ensuring that
    both the returned session and driver are closed, typically via a
    `try...finally` block, to prevent resource leaks.

    Returns:
        tuple: A (neo4j.Session, neo4j.Driver) pair.
    """
    URI = os.getenv("NEO4J_URI", "neo4j://localhost:7687")
    # Default to the canonical local/CI password "test12345" if not supplied.
    AUTH = os.getenv("NEO4J_USER", "neo4j"), os.getenv("NEO4J_PASSWORD", "test12345")

    driver = GraphDatabase.driver(URI, auth=AUTH)
    driver.verify_connectivity()
    session = driver.session()
    return session, driver

def import_file(json_file_path):
    """
    Imports a single Google-Docs-exported JSON script into Neo4j.

    This function orchestrates the entire import process:
    1.  Parses catalog information (Program, Module, Day, Persona, and their
        sequence numbers) from the `json_file_path`. The path *must* conform to
        the structure: `<Program>/<Module##>/<Day##>/<persona##>.json`.
    2.  Validates that each turn in the JSON script contains the required fields
        `role` (str) and `text` (str).  The legacy numeric `seq` key is still
        *accepted* so older exports don't break, but it is no longer stored in
        Neo4j or used for ordering.
    3.  Connects to Neo4j using `start_neo4j_session()`.
    4.  Upserts Program, Module, Day, and Persona nodes, creating necessary
        relationships (`HAS_MODULE`, `HAS_DAY`, `HAS_PERSONA`).
    5.  Creates a root `Turn` node for the script and links the Persona to it
        via a `ROOTS` relationship.
    6.  Iterates through each turn in the JSON, creating a `Turn` node in Neo4j
        and linking it to its parent turn via a `CHILD_OF` relationship.
        All imported turns are marked with `accepted:true`.
    7.  Ensures Neo4j `id` properties for `Turn` nodes (UUIDs) are stored as strings.
    8.  Closes Neo4j session and driver connections reliably.

    Args:
        json_file_path (str): Absolute or relative path to the JSON file.
                              Example: "data/MyProgram/Module01/Day01/persona01.json"

    Returns:
        str: A string representation of a UUIDv1, serving as the Job ID for this import.

    Raises:
        ValueError: (a) The file path does not follow the required
                    `<Program>/<Module##>/<Day##>/<persona>.json` schema,
                    (b) the `Module##` / `Day##` components are malformed, or
                    (c) any turn in the JSON is missing the mandatory `role` or
                        `text` keys.
        neo4j.exceptions.*: Various Neo4j exceptions can propagate if database
                            operations fail (e.g., connection issues, Cypher errors).

    Example Usage (from another Python script, like a test):
        ```python
        from docs.scripts.import_google_docs import import_file
        job_id = import_file("path/to/MyProgram/Module01/Day01/persona01.json")
        print(f"Import job completed: {job_id}")
        ```
    """
    session, driver = start_neo4j_session()
    paths_list = pathlib.Path(json_file_path).parts

    # ----------------------------  ⚠ Path-structure validation  ⚠ ---------------------------
    # We require **at least** four trailing components that map to:
    #   <Program>/<Module##>/<Day##>/<persona##>.json
    # Anything shorter (or malformed prefixes) produces an opaque IndexError later in the
    # function.  To surface a *predictable* and *testable* failure mode we proactively
    # validate the structure here and raise `ValueError` with a clear, actionable message.
    if len(paths_list) < 4:
        raise ValueError(
            "json_file_path must contain at least four components: <Program>/<Module##>/<Day##>/<persona>.json"
        )

    program_name, module_folder, day_folder, file_name = (
        paths_list[-4],
        paths_list[-3],
        paths_list[-2],
        paths_list[-1],
    )

    # Extract a numeric ordering for Program if one exists in its folder name; default to 0.
    # Example: "Mindfulness101" → 101.  Non-digit strings become 0 so we always store an int.
    program_seq = int(''.join(ch for ch in program_name if ch.isdigit()) or 0)

    # Verify `Module##` and `Day##` prefixes and that the numeric suffixes are valid integers.
    if not (module_folder.startswith("Module") and module_folder[6:].isdigit()):
        raise ValueError(
            f"Expected folder name in the form 'Module##' but got '{module_folder}'."
        )
    if not (day_folder.startswith("Day") and day_folder[3:].isdigit()):
        raise ValueError(
            f"Expected folder name in the form 'Day##' but got '{day_folder}'."
        )

    # At this point we know the prefixes are correct and the numeric parts are composed purely
    # of digits, so the `int()` casts below will not raise `ValueError` unexpectedly.
    module_seq = int(module_folder[6:])
    day_seq = int(day_folder[3:])

    # Persona filename *must* end in `.json`.
    if not file_name.endswith(".json"):
        raise ValueError("persona file must have a .json extension (e.g., therapist01.json)")

    persona_name = file_name[:-5]  # Strip ".json" to get the persona id.
    # Derive numeric sequence for the persona by extracting any digits from the filename stem. This keeps ordering consistent with Module and Day sequencing.
    persona_seq = int(''.join(ch for ch in persona_name if ch.isdigit()) or 0)
    script_contents = json.loads(pathlib.Path(json_file_path).read_text())
    for item in script_contents:
        try:
            validJSON(**item)
        except pydantic.ValidationError:
            raise ValueError("One of the required keys is missing")
    uuid1 = uuid.uuid1()

    parent_id = None
    uuid2 = str(uuid.uuid1())  # Cast to string so Bolt driver can serialise it.
    
    try:
        # Upsert the Program node and always ensure it carries a `seq` property for predictable ordering.
        session.run(
            """
            MERGE (p:Program {id: $program_id})
            SET p.seq = $program_seq
            """,
            {"program_id": program_name, "program_seq": program_seq},
        )
        
        session.run("""
        MERGE (m:Module {id: $module_id, seq: $module_seq})
        """, {"module_id": module_seq, "module_seq": module_seq})  # Upsert the Module node itself.
        # Now connect Program → Module in a second Cypher statement to comply with the one-statement rule.
        session.run("""
        MATCH (m:Module {id: $module_id}), (p:Program {id: $program_id})
        MERGE (p)-[:HAS_MODULE]->(m)
        """, {"module_id": module_seq, "program_id": program_name})
        
        # --- Day node and its HAS_DAY edge ---
        session.run("""
        MERGE (d:Day {id: $day_id, seq: $day_seq})
        """, {"day_id": day_seq, "day_seq": day_seq})
        session.run("""
        MATCH (d:Day {id: $day_id, seq: $day_seq}), (m:Module {id: $module_id})
        MERGE (m)-[:HAS_DAY]->(d)
        """, {"day_id": day_seq, "day_seq": day_seq, "module_id": module_seq})
        
        # --- Persona node and its HAS_PERSONA edge ---
        session.run("""
        MERGE (per:Persona {id: $persona_id, seq: $persona_seq})
        """, {"persona_id": persona_name, "persona_seq": persona_seq})
        session.run("""
        MATCH (per:Persona {id: $persona_id, seq: $persona_seq}), (d:Day {id: $day_id, seq: $day_seq})
        MERGE (d)-[:HAS_PERSONA]->(per)
        """, {"day_id": day_seq, "day_seq": day_seq, "persona_id": persona_name, "persona_seq": persona_seq})
        
        # --- Root Turn node anchoring the script DAG ---
        session.run("""
        MERGE (root_node:Turn {id: $uuid, role: 'root', ts: timestamp()})
        """, {"uuid": uuid2})
        session.run("""
        MATCH (t:Turn {id: $uuid, role: 'root'}), (per:Persona {id: $persona_id, seq: $persona_seq})
        MERGE (per)-[:ROOTS]->(t)
        """, {"uuid": uuid2, "persona_id": persona_name, "persona_seq": persona_seq})
        parent_id = uuid2  # Root is now the parent for the first real script turn.

        # Insert each validated turn and wire CHILD_OF edges in two separate statements per turn.
        for turn_item in script_contents:
            new_turn_id = str(uuid.uuid4())  # Convert UUID object to string for Neo4j parameter packing.
            # Persist the Turn node.
            session.run("""
            MERGE (turn_node:Turn {
                id: $turn_id,
                role: $turn_role,
                text: $turn_text,
                accepted: true,
                parent_id: $parent_turn_id,
                ts: timestamp()
            })
            """, {
                "turn_id": new_turn_id,
                "turn_role": turn_item["role"],
                "turn_text": turn_item["text"],
                "parent_turn_id": parent_id,
            })
            # Add the CHILD_OF relationship.
            session.run("""
            MATCH (parent:Turn {id: $parent_turn_id}), (child:Turn {id: $turn_id})
            MERGE (parent)<-[:CHILD_OF]-(child)
            """, {"parent_turn_id": parent_id, "turn_id": new_turn_id})

            parent_id = new_turn_id  # Advance the cursor for the next iteration.

    finally:
        session.close()
        driver.close()
    return str(uuid1)

if __name__ == "__main__":  # This part runs only if you execute this script directly from the command line (not if it's imported by another Python script).
    parser = argparse.ArgumentParser(description="Import Google-Docs JSON into Neo4j")  # Set up a helper to understand command-line arguments, with a short explanation of what the script does.
    parser.add_argument("json_path", help="Path to <Program>/<Module##>/<Day##>/<persona##>.json")  # Tell the helper to expect one argument: the path to the JSON file we want to import.
    args = parser.parse_args()  # Read the actual command-line arguments provided by the user.
    job_id = import_file(args.json_path)  # Call our main import function with the file path given by the user, and get back the Job ID.
    print(f"Imported script successfully. Job-ID: {job_id}")  # Tell the user that the import worked and show them the Job ID.