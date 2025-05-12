import pydantic
import pytest
import sys
import json
import pathlib
sys.path.insert(0, './')
from docs.scripts.import_google_docs import import_file

def test_cli_gdocs_import(tmp_path):
    full_file_path = tmp_path / "test_program" / "Module01" / "Day01" / "testpersona01.json"
    full_file_path.parent.mkdir(parents=True, exist_ok=True)
    # Three-turn canonical script: system → user → assistant.
    sample_json = [
        {"role": "system", "text": "this is the system prompt"},
        {"role": "user", "text": "this is the user reply"},
        {"role": "assistant", "text": "this is the assistant response"},
    ]
    full_file_path.write_text(json.dumps(sample_json))
    job_id = import_file(str(full_file_path))
    assert isinstance(job_id, str) and len(job_id) == 36

def test_path_is_valid(tmp_path):
    full_file_path = tmp_path / "test_program" / "Module01" / "Day01" / "testpersona01.json"
    full_file_path.parent.mkdir(parents=True, exist_ok=True)
    sample_json = [{"role":"system", "text": "this is the system prompt"}]
    full_file_path.write_text(json.dumps(sample_json))
    # With `seq` no longer mandatory, a single-turn script is perfectly valid.
    # The importer should succeed and return a UUID job ID.
    job_id = import_file(str(full_file_path))
    assert isinstance(job_id, str) and len(job_id) == 36

def test_bad_file_path_structure_raises_value_error(tmp_path):
    """Ensure that a file not nested under <Program>/<Module##>/<Day##>/ raises ValueError."""
    bad_path = tmp_path / "lonely_script.json"
    bad_path.write_text("[]")  # Content irrelevant; the path itself is what we're validating.

    # The function should raise ValueError *before* querying Neo4j because the path is malformed.
    with pytest.raises(ValueError):
        import_file(str(bad_path))