"""Unit tests for the pure helper functions in ``uniback.utils.common``.

These exercise the framework's string/dict/serialization utilities in
isolation (no database or external services required).
"""
import uuid
from datetime import datetime, timezone

import pytest

from uniback.utils import common


# --- identifiers / time -------------------------------------------------

def test_generate_uuid_is_unique_uuid():
    a = common.generate_uuid()
    b = common.generate_uuid()
    assert isinstance(a, uuid.UUID)
    assert a != b


def test_utc_now_is_timezone_aware_utc():
    now = common.utc_now()
    assert now.tzinfo is not None
    assert now.utcoffset() == timezone.utc.utcoffset(now)


# --- json helpers -------------------------------------------------------

def test_generate_json_roundtrips_dict():
    data = {"b": 2, "a": 1, "nested": {"x": [1, 2, 3]}}
    encoded = common.generate_json(data)
    assert isinstance(encoded, str)
    assert common.parse_json(encoded) == data


def test_generate_json_sorts_keys():
    encoded = common.generate_json({"b": 1, "a": 2})
    assert encoded.index('"a"') < encoded.index('"b"')


def test_generate_json_returns_none_for_falsy():
    assert common.generate_json({}) is None
    assert common.generate_json(None) is None


def test_generate_json_serializes_datetime_and_uuid():
    uid = uuid.uuid4()
    dt = datetime(2026, 1, 2, 3, 4, 5, tzinfo=timezone.utc)
    decoded = common.parse_json(common.generate_json({"id": uid, "t": dt}))
    assert decoded["id"] == str(uid)
    assert decoded["t"] == dt.isoformat()


# --- prepare_content ----------------------------------------------------

def test_prepare_content_passthrough_primitives():
    assert common.prepare_content(None) is None
    assert common.prepare_content(5) == 5
    assert common.prepare_content("x") == "x"
    assert common.prepare_content(True) is True


def test_prepare_content_recurses_containers():
    uid = uuid.uuid4()
    out = common.prepare_content({"a": [1, uid], "b": {"c": uid}})
    assert out["a"][0] == 1
    assert out["a"][1] == str(uid)
    assert out["b"]["c"] == str(uid)


# --- passwords ----------------------------------------------------------

def test_password_hash_and_verify_roundtrip():
    hashed = common.hash_password("s3cr3t")
    assert hashed != "s3cr3t"
    assert common.verify_password("s3cr3t", hashed) is True
    assert common.verify_password("wrong", hashed) is False


def test_password_hash_uses_random_salt():
    assert common.hash_password("same") != common.hash_password("same")


# --- case conversions ---------------------------------------------------

@pytest.mark.parametrize("src,expected", [
    ("CamelCase", "camel_case"),
    ("MyVar", "my_var"),
    ("already_snake", "already_snake"),
    ("A", "a"),
])
def test_to_snake_case(src, expected):
    assert common.to_snake_case(src) == expected


@pytest.mark.parametrize("src,expected", [
    ("snake_case", "snakeCase"),
    ("my_var_name", "myVarName"),
    ("single", "single"),
])
def test_to_camel_case(src, expected):
    assert common.to_camel_case(src) == expected


@pytest.mark.parametrize("src,expected", [
    ("snake_case", "SnakeCase"),
    ("my_var", "MyVar"),
])
def test_to_pascal_case(src, expected):
    assert common.to_pascal_case(src) == expected


def test_snake_camel_roundtrip():
    assert common.to_camel_case(common.to_snake_case("myVarName")) == "myVarName"


# --- truncate_string ----------------------------------------------------

def test_truncate_string_short_unchanged():
    assert common.truncate_string("hi", 8) == "hi"


def test_truncate_string_truncates_with_suffix():
    assert common.truncate_string("hello world", 8) == "hello..."
    assert len(common.truncate_string("hello world", 8)) == 8


def test_truncate_string_custom_suffix():
    assert common.truncate_string("abcdef", 4, suffix="!") == "abc!"


# --- deep_merge ---------------------------------------------------------

def test_deep_merge_combines_nested():
    base = {"a": {"x": 1}, "k": 1}
    override = {"a": {"y": 2}, "z": 3}
    merged = common.deep_merge(base, override)
    assert merged == {"a": {"x": 1, "y": 2}, "k": 1, "z": 3}


def test_deep_merge_override_wins_for_scalars():
    assert common.deep_merge({"a": 1}, {"a": 2}) == {"a": 2}


def test_deep_merge_does_not_mutate_base():
    base = {"a": {"x": 1}}
    common.deep_merge(base, {"a": {"y": 2}})
    assert base == {"a": {"x": 1}}


# --- listify ------------------------------------------------------------

def test_listify_none_gives_empty():
    assert common.listify(None) == []


def test_listify_preserves_sequences():
    assert common.listify([1, 2]) == [1, 2]
    assert common.listify((1, 2)) == [1, 2]
    assert sorted(common.listify({1, 2})) == [1, 2]


def test_listify_wraps_scalars_and_strings():
    assert common.listify(5) == [5]
    assert common.listify("abc") == ["abc"]


# --- text conversions ---------------------------------------------------

def test_force_underscored_default_replaces():
    assert common.force_underscored("a b,c.d-e") == "a_b_c_d_e"


def test_secure_text_collapses_whitespace():
    assert common.secure_text("  a    b  ") == "a b"


def test_secure_text_underscore_option():
    assert common.secure_text("a b", underscore=True) == "a_b"


def test_secure_url_keeps_host_drops_query():
    out = common.secure_url("http://example.com/path?token=secret")
    assert out.startswith("http://example.com")
    assert "token=secret" not in out
    assert "?" not in out


# --- CaseInsensitiveDict ------------------------------------------------

def test_case_insensitive_dict_basic_access():
    d = common.CaseInsensitiveDict()
    d["Key"] = "value"
    assert d["key"] == "value"
    assert d["KEY"] == "value"
    assert "kEy" in d
    assert len(d) == 1


def test_case_insensitive_dict_preserves_original_key_on_iter():
    d = common.CaseInsensitiveDict({"MyKey": 1})
    assert list(iter(d)) == ["MyKey"]
    assert d.get_data() == {"mykey": 1}


def test_case_insensitive_dict_delete():
    d = common.CaseInsensitiveDict({"A": 1})
    del d["a"]
    assert "a" not in d


# --- create_dictionary --------------------------------------------------

def test_create_dictionary_case_sensitive_is_plain_dict():
    d = common.create_dictionary(case_sens=True, data={"a": 1})
    assert type(d) is dict
    assert d == {"a": 1}


def test_create_dictionary_case_insensitive():
    d = common.create_dictionary(case_sens=False, data={"Foo": 1})
    assert isinstance(d, common.CaseInsensitiveDict)
    assert d["foo"] == 1
