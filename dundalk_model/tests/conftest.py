import sys
from pathlib import Path

import pytest

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from dundalk import data, synth  # noqa: E402


@pytest.fixture(scope="session")
def raw():
    return synth.generate(years=2, seed=3)


@pytest.fixture(scope="session")
def prepared(raw):
    return data.prepare(raw)
