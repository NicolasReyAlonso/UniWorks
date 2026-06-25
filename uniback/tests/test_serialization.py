"""Unit tests for ``uniback.utils.serialization`` (JSON + zlib helpers)."""

from uniback.utils import serialization


class _Sample:
    def __init__(self):
        self.a = 1
        self.b = "two"


def test_serialize_object_with_dict():
    out = serialization.serialize_from_object(_Sample())
    assert serialization.deserialize_to_object(out) == {"a": 1, "b": "two"}


def test_serialize_plain_value():
    assert serialization.serialize_from_object([1, 2, 3]) == "[1, 2, 3]"


def test_deserialize_into_class_instance():
    payload = '{"a": 5, "b": "x"}'
    obj = serialization.deserialize_to_object(payload, cls=_Sample)
    assert isinstance(obj, _Sample)
    assert obj.a == 5
    assert obj.b == "x"


def test_deserialize_without_class_returns_data():
    assert serialization.deserialize_to_object('{"k": 1}') == {"k": 1}


def test_compress_decompress_roundtrip():
    text = "session-payload-" * 50
    blob = serialization.compress_session(text)
    assert isinstance(blob, bytes)
    assert serialization.decompress_session(blob) == text


def test_compression_actually_shrinks_repetitive_text():
    text = "a" * 10000
    assert len(serialization.compress_session(text)) < len(text)
