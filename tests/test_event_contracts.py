import pathlib
import yaml


def _load_contract(path: str):
    """Helper that loads a YAML contract and returns the parsed dict.

    Example
    -------
    >>> contract = _load_contract('contracts/events/script.turn.diff_reported.yaml')
    >>> assert 'fields' in contract
    """
    return yaml.safe_load(pathlib.Path(path).read_text())


def test_diff_reported_contract_shape():
    """Ensure the diff_reported contract file exists and exposes the expected five fields.

    The contract is a simple YAML descriptor that third-party services rely on
    to understand what a *script.turn.diff_reported* message will look like.
    Here we parse the file and assert the presence of the agreed keys so that
    any accidental deviation (e.g. field renaming) fails CI immediately.
    """
    contract = _load_contract('contracts/events/script.turn.diff_reported.yaml')

    # Top-level sanity check.
    assert contract['name'] == 'script.turn.diff_reported'

    # Exact list of required fields, taken straight from the implementation plan.
    expected = {'id', 'parent_id', 'persona_id', 'diff_html', 'grade'}
    assert expected.issubset(contract['fields'].keys())


def test_updated_contract_shape():  # New test confirming the updated-event contract lists every required field.
    contract = _load_contract('contracts/events/script.turn.updated.yaml')

    # The event name must remain fixed so consumers can subscribe with confidence.
    assert contract['name'] == 'script.turn.updated'

    # Required keys as agreed in the implementation plan.
    expected = {
        'id',
        'parent_id',
        'persona_id',
        'editor',
        'ts',
        'text',
        'commit_message'
    }
    # Layman check: our YAML must at least contain all these keys. Supersets are fine.
    assert expected.issubset(contract['fields'].keys()) 