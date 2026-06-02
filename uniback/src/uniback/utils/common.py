"""
Common utility functions for Uniback.
"""
import collections
import json
import uuid
from datetime import datetime, timezone
from pathlib import Path
from typing import Any, Dict, List, Optional, Type, Union
from pydantic import BaseModel, Field, create_model
from sqlalchemy import inspect
from sqlalchemy import types as sqltypes

import bcrypt
from multidict import MultiDict, CIMultiDict


def generate_uuid() -> uuid.UUID:
    """
    Generate a new UUID4.

    Returns:
        A new UUID4 instance
    """
    return uuid.uuid4()


def utc_now() -> datetime:
    """
    Get the current UTC datetime.

    Returns:
        Current datetime in UTC timezone
    """
    return datetime.now(timezone.utc)

JSON_INDENT = 4
ENSURE_ASCII = False
ROOT = str(Path(__file__).parent.parent.parent)

def generate_json(obj: Any, indent: int | None = None) -> str:
    """
    Generate JSON string from an object, handling special types.

    Args:
        obj: Object to serialize
        indent: Optional indentation for pretty printing

    Returns:
        JSON string representation
    """
    return json.dumps(obj,
                      default=_json_serializer,
                      sort_keys=True,
                      indent=indent,
                      ensure_ascii=ENSURE_ASCII,
                      separators=(',', ': ')) if obj else None


def _json_serializer(obj: Any) -> Any:
    """
    Custom JSON serializer for objects not serializable by default.
    Mirroring bcs-backend's _json_serial logic.

    Args:
        obj: Object to serialize

    Returns:
        Serializable representation of the object

    Raises:
        TypeError: If object is not serializable
    """
    from uniback.persistence import ORMBase

    if isinstance(obj, datetime):
        return obj.isoformat()
    if isinstance(obj, uuid.UUID):
        return str(obj)
    if isinstance(obj, CaseInsensitiveDict):
        return obj.get_data()
    if hasattr(obj, "Schema"):
        return getattr(obj, "Schema")().dump(obj)  # Marshmallow support
    if isinstance(obj, ORMBase) or hasattr(obj, "__table__"):
        return orm2json(obj)
    if hasattr(obj, "__dict__"):
        return obj.__dict__

    # Handle numpy/pandas types if they exist (parity with bcs-backend)
    try:
        import numpy as np
        if isinstance(obj, (np.int64, np.integer)):
            return int(obj)
        if isinstance(obj, (np.float64, np.floating)):
            return float(obj)
        if isinstance(obj, np.ndarray):
            return obj.tolist()
    except ImportError:
        pass

    try:
        import pandas as pd
        if isinstance(obj, pd.DataFrame):
            return obj.to_dict("records")
        if isinstance(obj, pd.Series):
            return obj.to_dict()
    except ImportError:
        pass

    raise TypeError(f"Object of type {type(obj).__name__} is not JSON serializable")


def prepare_content(obj: Any) -> Any:
    """
    Recursively prepares content for ResponseEnvelope by converting
    non-serializable objects (like ORM models) into serializable primitives.
    """
    if obj is None:
        return None

    if isinstance(obj, list):
        return [prepare_content(item) for item in obj]

    if isinstance(obj, dict):
        return {k: prepare_content(v) for k, v in obj.items()}

    # Try to use the _json_serializer logic to "jsonify" the object
    try:
        # Check if it's already a basic type to avoid unnecessary overhead
        if isinstance(obj, (str, int, float, bool)) or obj is None:
            return obj
        return _json_serializer(obj)
    except TypeError:
        # If it's already a primitive or we don't know how to serialize it,
        # return it as is and let Pydantic/JSON encoder handle it or fail later.
        return obj


def parse_json(json_str: str) -> Any:
    """
    Parse a JSON string.

    Args:
        json_str: JSON string to parse

    Returns:
        Parsed Python object
    """
    return json.loads(json_str)


def hash_password(password: str) -> str:
    """
    Hash a password using bcrypt.

    Args:
        password: Plain text password

    Returns:
        Hashed password string
    """
    # bcrypt.hashpw expects bytes, so we encode the password
    password_bytes = password.encode("utf-8")
    # Generate salt and hash the password
    hashed = bcrypt.hashpw(password_bytes, bcrypt.gensalt())
    # Return as a decoded string for storage
    return hashed.decode("utf-8")


def verify_password(plain_password: str, hashed_password: str) -> bool:
    """
    Verify a password against a hash.

    Args:
        plain_password: Plain text password to verify
        hashed_password: Hashed password to compare against

    Returns:
        True if password matches, False otherwise
    """
    # Both inputs to checkpw must be bytes
    return bcrypt.checkpw(plain_password.encode("utf-8"), hashed_password.encode("utf-8"))


def to_snake_case(name: str) -> str:
    """
    Convert a CamelCase string to snake_case.

    Args:
        name: CamelCase string

    Returns:
        snake_case string
    """
    result = []
    for i, char in enumerate(name):
        if char.isupper() and i > 0:
            result.append("_")
        result.append(char.lower())
    return "".join(result)


def to_camel_case(name: str) -> str:
    """
    Convert a snake_case string to CamelCase.

    Args:
        name: snake_case string

    Returns:
        CamelCase string
    """
    components = name.split("_")
    return components[0] + "".join(x.title() for x in components[1:])


def to_pascal_case(name: str) -> str:
    """
    Convert a snake_case string to PascalCase.

    Args:
        name: snake_case string

    Returns:
        PascalCase string
    """
    return "".join(x.title() for x in name.split("_"))


def truncate_string(s: str, max_length: int, suffix: str = "...") -> str:
    """
    Truncate a string to a maximum length.

    Args:
        s: String to truncate
        max_length: Maximum length including suffix
        suffix: Suffix to append if truncated

    Returns:
        Truncated string
    """
    if len(s) <= max_length:
        return s
    return s[: max_length - len(suffix)] + suffix


def deep_merge(base: dict[str, Any], override: dict[str, Any]) -> dict[str, Any]:
    """
    Deep merge two dictionaries.

    Args:
        base: Base dictionary
        override: Dictionary with values to override

    Returns:
        Merged dictionary
    """
    result = base.copy()
    for key, value in override.items():
        if key in result and isinstance(result[key], dict) and isinstance(value, dict):
            result[key] = deep_merge(result[key], value)
        else:
            result[key] = value
    return result


def listify(arg: Any) -> list[Any]:
    """
    Ensure the argument is a list.

    Args:
        arg: Any object

    Returns:
        A list containing the object, or the object itself if it's already a list, tuple or set.
    """
    if arg is None:
        return []
    return list(arg) if isinstance(arg, (tuple, list, set)) else [arg]


##
# EXECUTIONS
##

def exec_cmds(*args):
    import subprocess
    out = err = []
    for cmd in args:
        print(cmd)
        process = subprocess.Popen(cmd,
                                   stdout=subprocess.PIPE,
                                   stderr=subprocess.PIPE,
                                   shell=True)
        o, e = process.communicate()
        out.append(o)
        print(f'OUT: \n{o.decode("utf-8")}\n')
        if e:
            print(f'ERROR: \n{e.decode("utf-8")}')
            err.append(e)
    return out, err


##
# VISUALIZATIONS
##

def unfolded_print(obj, level=2):
    try:
        d = obj if isinstance(obj, dict) else obj.__dict__
        for key in d.keys():
            val = d.get(key)
            print(f"{level * ' '}{key} ({type(val)}):")
            unfolded_print(val, level=level + 2)
    except Exception as e:
        if isinstance(obj, (tuple, list, set)):
            print(f"{level * ' '}[")
            for i in obj:
                unfolded_print(i, level=level + 2)
                print(f"{level * ' '} ,")
            print(f"{level * ' '}]")
        else:
            print(f"{level*' '} {obj}")


##
# CONVERSIONS
##

def secure_url(url: str) -> str:
    from urllib.parse import urlparse
    u = urlparse(url)   # trying to block code injection
    r = '%s://' % u.scheme if u.scheme else ''
    r += '%s:%s@' % (u.username, u.password) if u.username or u.password else ''
    r += u.hostname if u.hostname else ''
    r += ':%s' % u.port if u.port else ''
    r += '/%s' % u.path if u.path else ''   # TODO: maybe without path ?
    return r


def secure_text(text: str, underscore: bool = False):
    _txt = ' '.join(text.strip().split())
    return force_underscored(_txt) if underscore else _txt


def force_underscored(text: str, replace: str = " ,.-") -> str:     # replace: str = "[, -]"
    if not replace:
        replace = "".join(set(c for c in text if not c.isalnum()))
    return text.translate({ord(i): "_" for i in replace})


def orm2json(row):
    """
    Convert an ORM object to a serializable dictionary.
    Handles columns, including those that need special serialization (datetime, UUID).
    """
    if row is None:
        return None
    
    d = {}
    try:
        # If it has a to_dict method (like our ORMBase via BaseMixin), use it
        if hasattr(row, "to_dict"):
            d = row.to_dict()
        else:
            # Fallback to manual column iteration
            for column in row.__table__.columns:
                value = getattr(row, column.name)
                if isinstance(value, (datetime, uuid.UUID)):
                    d[column.name] = _json_serializer(value)
                else:
                    d[column.name] = value
                    
        # Parity with bcs-backend: handle hybrid properties if we can
        # but for now, we'll stick to what to_dict or basic column iteration provides.
    except Exception:
        pass
    return d


class Encodable:
    """
    Abstract class with the method encode() that should be implemented by a subclass to be encoded into JSON
    using the json.dumps() method together with the option cls=CustomEncoder.
    """

    def encode(self) -> Dict[str, Any]:
        raise NotImplementedError("users must define encode() to use this base class")

    @staticmethod
    def parents_encode(obj: "Encodable", cls: type) -> Dict[str, Any]:
        """
        Get the state of all "cls" parent classes for the selected instance "obj"
        :param obj: The instance. Use "self".
        :param cls: The base class which parents we want to get. Use "__class__".
        :return: A dictionary with the state of the instance "obj" for all inherited classes.

        """
        d = {}
        for parent in cls.__bases__:
            if issubclass(parent, Encodable) and parent is not Encodable:
                d.update(parent.encode(obj))
        return d


class CaseInsensitiveDict(collections.abc.MutableMapping, Encodable):
    """
    A dictionary with case insensitive Keys.
    Prepared also to support TUPLES as keys, required because compound keys are required
    """

    def __init__(self, data=None, **kwargs):
        from collections import OrderedDict
        self._store = OrderedDict()
        if data is None:
            data = {}
        self.update(data, **kwargs)

    def encode(self):
        return self.get_data()

    def get_original_data(self):
        return {casedkey: mappedvalue for casedkey, mappedvalue in self._store.values()}

    def get_data(self):
        return {key: self._store[key][1] for key in self._store}

    def __setitem__(self, key, value):
        # Use the lowercased key for lookups, but store the actual
        # key alongside the value.
        if not isinstance(key, tuple):
            self._store[key.lower()] = (key, value)
        else:
            self._store[tuple([k.lower() for k in key])] = (key, value)

    def __getitem__(self, key):
        if not isinstance(key, tuple):
            return self._store[key.lower()][1]
        else:
            return self._store[tuple([k.lower() for k in key])][1]

    def __delitem__(self, key):
        if not isinstance(key, tuple):
            del self._store[key.lower()]
        else:
            del self._store[tuple([k.lower() for k in key])]

    def __iter__(self):
        return (casedkey for casedkey, mappedvalue in self._store.values())

    def __len__(self):
        return len(self._store)

    def lower_items(self):
        """Like iteritems(), but with all lowercase keys."""
        return (
            (lowerkey, keyval[1])
            for (lowerkey, keyval)
            in self._store.items()
        )

    def __contains__(self, key):  # "in" operator to check if the key is present in the dictionary
        if not isinstance(key, tuple):
            return key.lower() in self._store
        else:
            return tuple([k.lower() for k in key]) in self._store

    def __eq__(self, other):
        if isinstance(other, collections.Mapping):
            other = CaseInsensitiveDict(other)
        else:
            return NotImplemented
        # Compare insensitively
        return dict(self.lower_items()) == dict(other.lower_items())

    # Copy is required
    def copy(self):
        return CaseInsensitiveDict(self._store.values())

    def __repr__(self):
        return str(dict(self.items()))


def create_dictionary(case_sens=True, multi_dict=False, data=dict()):
    """
    Factory to create dictionaries

    :param case_sens: True to create a case sensitive dictionary, False to create a case insensitive one
    :param multi_dict: True to create a "MultiDict", capable of storing several values
    :param data: Dictionary with which the new dictionary is initialized
    :return:
    """

    if not multi_dict:
        if case_sens:
            tmp = {}
            tmp.update(data)
            return tmp  # Normal, "native" dictionary
        else:
            return CaseInsensitiveDict(data)
    else:
        if case_sens:
            return MultiDict(data)
        else:
            return CIMultiDict(data)


def _ui_hints_for_column(column) -> Dict[str, Any]:
    """
    Derive UI hints (the `x-*` keywords consumed by the Formly converter on the
    frontend) from a SQLAlchemy column. Hints baked here travel inside the JSON
    Schema so the dynamic form generator can pick richer widgets without having
    to know about the ORM.

    Manual overrides take precedence: any key under ``column.info["ui"]`` or any
    ``column.info["x_*"]`` entry is copied verbatim into the result.
    """
    hints: Dict[str, Any] = {}

    col_type = column.type
    type_str = str(col_type).upper()

    if isinstance(col_type, sqltypes.Boolean):
        hints["x-ui-widget"] = "checkbox"
    elif isinstance(col_type, sqltypes.DateTime):
        hints["x-ui-widget"] = "datepicker"
        hints["x-formly-props"] = {"showTime": True}
    elif isinstance(col_type, sqltypes.Date):
        hints["x-ui-widget"] = "date"
    elif isinstance(col_type, sqltypes.Time):
        hints["x-ui-widget"] = "time"
    elif isinstance(col_type, sqltypes.Enum):
        hints["x-ui-widget"] = "select"
    elif isinstance(col_type, sqltypes.String):
        length = getattr(col_type, "length", None) or 0
        if length and length > 500:
            hints["x-ui-widget"] = "textarea"
    elif "JSON" in type_str:
        hints["x-ui-widget"] = "json"
    elif "GUID" in type_str or "UUID" in type_str:
        hints["x-ui-widget"] = "uuid"

    if column.foreign_keys:
        fk = next(iter(column.foreign_keys))
        try:
            ref_table = fk.column.table.name
        except Exception:
            ref_table = None
        if ref_table:
            hints["x-ui-widget"] = "select-lazy-loading"
            hints["x-options-endpoint"] = f"/{ref_table}/"
            hints["x-options-label"] = "name"
            hints["x-options-value"] = fk.column.name or "id"

    info = getattr(column, "info", None) or {}
    ui_info = info.get("ui") if isinstance(info, dict) else None
    if isinstance(ui_info, dict):
        for k, v in ui_info.items():
            key = k if k.startswith("x-") else f"x-{k}"
            hints[key] = v
    if isinstance(info, dict):
        for k, v in info.items():
            if k.startswith("x-"):
                hints[k] = v

    return hints


def sqlalchemy_to_pydantic(db_model: Type, exclude: List[str] = None, **kwargs) -> Type[BaseModel]:
    """
    Dynamically create a Pydantic model from a SQLAlchemy model.
    Basic implementation for Pydantic v2 and SQLAlchemy 2.

    Per-column ``x-*`` UI hints are attached via ``Field(json_schema_extra=...)``
    so they appear on the JSON Schema exposed at ``/<entity>/schema.json``.
    """
    try:
        # Inject docstring as model description if not explicitly provided
        if "__doc__" not in kwargs and db_model.__doc__:
            kwargs["__doc__"] = db_model.__doc__.strip()

        mapper = inspect(db_model)
        if mapper is None:
            return None

        exclude = exclude or []
        fields = {}
        for column in mapper.columns:
            if column.key in exclude:
                continue
            try:
                python_type = column.type.python_type
            except (NotImplementedError, AttributeError):
                # Fallback for types that don't implement python_type (like GUID, JSONB)
                column_type_str = str(column.type).upper()
                if "JSON" in column_type_str:
                    python_type = Any
                elif "GUID" in column_type_str or "UUID" in column_type_str:
                    python_type = uuid.UUID
                elif "BINARY" in column_type_str or "BLOB" in column_type_str:
                    python_type = bytes
                else:
                    python_type = Any

            if column.nullable:
                python_type = Optional[python_type]

            default = None
            if column.default is not None:
                arg = getattr(column.default, "arg", None)
                if getattr(column.default, "is_callable", False) or callable(arg):
                    # Python-side callable default (e.g. ``lambda:
                    # datetime.now()``) is resolved by the ORM/DB at insert
                    # time. Embedding the callable in the schema would leak a
                    # function object into payloads (and break drivers like
                    # SQLite that validate input types), so treat the column
                    # as optional instead.
                    default = None
                    if python_type is not Any and not column.nullable:
                        python_type = Optional[python_type]
                else:
                    default = arg
            elif column.nullable:
                default = None
            else:
                default = ...

            field_kwargs: Dict[str, Any] = {}
            doc = column.doc or (column.comment if hasattr(column, "comment") else None)
            if doc:
                field_kwargs["description"] = doc

            hints = _ui_hints_for_column(column)
            if hints:
                field_kwargs["json_schema_extra"] = hints

            if field_kwargs:
                fields[column.key] = (python_type, Field(default, **field_kwargs))
            else:
                fields[column.key] = (python_type, default)

        return create_model(db_model.__name__, **fields, **kwargs)
    except Exception:
        return None


_LABEL_FIELD_CANDIDATES = ("name", "title", "label", "code", "slug", "key")


def _deduce_label_field(target_class: Type) -> str:
    for candidate in _LABEL_FIELD_CANDIDATES:
        if hasattr(target_class, candidate):
            return candidate
    return "id"


def _enrich_property_with_fk(prop: Dict[str, Any], column, orm_class: Type) -> None:
    """
    Sobrepone metadatos FK en ``prop`` resolviendo la entidad destino contra
    ``schema_registry``. Si la tabla destino esta registrada, usa su ``path``
    como ``x-options-endpoint``; si no, cae al nombre de tabla (comportamiento
    anterior).
    """
    if not column.foreign_keys:
        return
    fk = next(iter(column.foreign_keys))
    try:
        ref_table = fk.column.table.name
    except Exception:
        return

    # Resolvemos la clase ORM destino para deducir el campo label.
    target_class = None
    try:
        mapper = inspect(orm_class)
        for m in mapper.registry.mappers:
            if m.local_table is fk.column.table:
                target_class = m.class_
                break
    except Exception:
        pass

    # Buscamos la entidad registrada en schema_registry (opcional).
    endpoint = None
    entity_name = None
    try:
        from uniback.api.schema_registry import all_entities
        for name, reg in all_entities().items():
            if reg.orm_class is target_class:
                endpoint = reg.path
                entity_name = name
                break
    except Exception:
        pass

    if endpoint is None:
        endpoint = f"/{ref_table}/"
    if entity_name is None:
        entity_name = ref_table

    label_field = _deduce_label_field(target_class) if target_class is not None else "name"
    prop.setdefault("x-ui-widget", "select-lazy-loading")
    prop["x-foreign-key"] = {
        "entity": entity_name,
        "endpoint": endpoint,
        "value": fk.column.name or "id",
        "label": label_field,
    }
    # Mantenemos las claves "planas" anteriores por compatibilidad con clientes
    # que ya las consumen.
    prop["x-options-endpoint"] = endpoint
    prop["x-options-value"] = fk.column.name or "id"
    prop["x-options-label"] = label_field


def _apply_field_widget_registry(prop: Dict[str, Any], column_name: str, column_info: Dict[str, Any]) -> None:
    """Deja que los plugins registrados anaden ``x-*`` extras a la propiedad."""
    try:
        from uniback.plugins.registries import field_widget_registry
    except Exception:
        return
    extras = field_widget_registry.enrichments_for(column_name, prop, column_info)
    for extra in extras:
        for k, v in extra.items():
            # Solo prefijos ``x-`` evitan colisionar con campos JSON Schema standard.
            if k.startswith("x-"):
                prop[k] = v


def enrich_schema_with_ui(schema: Dict[str, Any], orm_class: Type) -> Dict[str, Any]:
    """
    Recorre ``schema['properties']`` y enriquece cada campo con:

    * ``x-foreign-key`` resuelto contra ``schema_registry`` si procede.
    * ``x-required`` (deducido del array ``required`` JSON Schema).
    * ``x-readonly`` para PK / columnas con ``server_default``.
    * Lo que aporten los plugins via ``field_widget_registry``.

    Idempotente: no pisa metadatos ya presentes (los plugins ganan sobre el
    nucleo solo si la clave aun no existia).
    """
    if not isinstance(schema, dict):
        return schema
    props = schema.get("properties")
    if not isinstance(props, dict):
        return schema

    required = set(schema.get("required") or [])

    try:
        mapper = inspect(orm_class)
    except Exception:
        mapper = None

    columns_by_name = {}
    if mapper is not None:
        for col in mapper.columns:
            columns_by_name[col.key] = col

    for prop_name, prop in props.items():
        if not isinstance(prop, dict):
            continue
        if prop_name in required and "x-required" not in prop:
            prop["x-required"] = True

        column = columns_by_name.get(prop_name)
        if column is not None:
            _enrich_property_with_fk(prop, column, orm_class)

            # x-readonly heuristico: PK o columnas con server_default temporal.
            if column.primary_key and "x-readonly" not in prop:
                prop["x-readonly"] = True
            if getattr(column, "server_default", None) is not None and "x-readonly" not in prop:
                # No marcamos readonly automatico aqui para no impedir update;
                # solo dejamos constancia para que la UI lo deduzca si quiere.
                prop.setdefault("x-server-default", True)

        col_info = dict(column.info) if column is not None and isinstance(getattr(column, "info", None), dict) else {}
        _apply_field_widget_registry(prop, prop_name, col_info)

    return schema


def _polymorphic_variants(orm_class: Type):
    """
    Si ``orm_class`` es la raiz de una jerarquia polimorfica de SQLAlchemy
    (``polymorphic_on`` definido y sin mapper padre), devuelve el nombre del
    campo discriminador en el schema y la lista ordenada de
    ``(identity, subclase)``. En cualquier otro caso devuelve ``(None, [])``,
    de modo que solo la clase raiz emite ``oneOf``; las subclases quedan planas.
    """
    try:
        mapper = inspect(orm_class)
    except Exception:
        return None, []

    poly_on = getattr(mapper, "polymorphic_on", None)
    if poly_on is None or mapper.inherits is not None:
        return None, []

    disc_name = None
    poly_key = getattr(poly_on, "key", None)
    poly_col_name = getattr(poly_on, "name", None)
    try:
        for col in mapper.columns:
            if col is poly_on or col.key == poly_key or col.name == poly_col_name:
                disc_name = col.key
                break
    except Exception:
        disc_name = poly_key
    if disc_name is None:
        disc_name = poly_key or getattr(orm_class, "__disc_field__", None)
    if disc_name is None:
        return None, []

    variants = []
    seen = set()
    for sub in mapper.self_and_descendants:
        if sub is mapper:
            continue
        identity = sub.polymorphic_identity
        if identity is None:
            continue
        cls = sub.class_
        if cls in seen:
            continue
        seen.add(cls)
        variants.append((identity, cls))

    variants.sort(key=lambda pair: str(pair[0]))
    return disc_name, variants


def _attach_polymorphism(schema: Dict[str, Any], orm_class: Type) -> None:
    """
    Para una entidad raiz polimorfica, anade ``oneOf`` con el schema enriquecido
    de cada subclase y un ``x-discriminator`` (``propertyName`` + ``mapping``
    valor-de-discriminador -> nombre de subclase).

    Las variantes se insertan completas (no via ``$ref``) para que el documento
    sea autocontenido tanto en ``/<entity>/schema.json`` como dentro del bundle
    agregado, donde un ``#/$defs`` no resolveria desde la raiz del bundle.
    Las ``properties`` base se conservan, asi un consumidor que no entienda
    ``oneOf`` (p. ej. el conversor Formly actual) sigue viendo las columnas
    comunes sin romperse.
    """
    disc_name, variants = _polymorphic_variants(orm_class)
    if not disc_name or not variants:
        return

    one_of: List[Dict[str, Any]] = []
    mapping: Dict[str, str] = {}
    for identity, sub in variants:
        sub_pyd = sqlalchemy_to_pydantic(sub)
        if sub_pyd is None:
            continue
        sub_schema = {"type": "object", "title": sub.__name__}
        sub_schema.update(sub_pyd.model_json_schema())
        enrich_schema_with_ui(sub_schema, sub)
        _attach_relationships(sub_schema, sub)
        one_of.append(sub_schema)
        mapping[str(identity)] = sub.__name__

    if not one_of:
        return

    schema["oneOf"] = one_of
    schema["x-discriminator"] = {
        "propertyName": disc_name,
        "mapping": mapping,
    }


def _relationship_descriptor(rel, orm_class: Type) -> Optional[Dict[str, Any]]:
    target_cls = rel.mapper.class_

    endpoint = None
    entity_name = None
    try:
        from uniback.api.schema_registry import all_entities
        for name, reg in all_entities().items():
            if reg.orm_class is target_cls:
                endpoint = reg.path
                entity_name = name
                break
    except Exception:
        pass
    if entity_name is None:
        entity_name = getattr(target_cls, "__name__", str(target_cls))

    direction = getattr(getattr(rel, "direction", None), "name", None)

    try:
        local_columns = sorted(
            {c.key for c in rel.local_columns if c is not None and c.key}
        )
    except Exception:
        local_columns = []

    descriptor: Dict[str, Any] = {
        "name": rel.key,
        "target": entity_name,
        "direction": direction,
        "collection": bool(getattr(rel, "uselist", False)),
    }
    if endpoint:
        descriptor["endpoint"] = endpoint
    if local_columns:
        descriptor["local_columns"] = local_columns
    return descriptor


def _attach_relationships(schema: Dict[str, Any], orm_class: Type) -> None:
    """
    Refleja las ``relationship()`` del ORM como extension ``x-relationships``
    (lista ordenada por nombre). Complementa el ``x-foreign-key`` por columna:
    aqui se expone la relacion logica completa (destino, direccion, si es
    coleccion, columnas FK locales y endpoint si la entidad esta registrada).
    """
    try:
        mapper = inspect(orm_class)
    except Exception:
        return

    relationships = []
    for rel in mapper.relationships:
        try:
            descriptor = _relationship_descriptor(rel, orm_class)
        except Exception:
            descriptor = None
        if descriptor is not None:
            relationships.append(descriptor)

    if relationships:
        schema["x-relationships"] = sorted(relationships, key=lambda r: r["name"])


def get_enriched_json_schema(
    schema_model: Type[BaseModel],
    url: str,
    title: str = None,
    description: str = None,
    orm_class: Optional[Type] = None,
) -> Dict[str, Any]:
    """
    Enriches a Pydantic model's JSON schema with standard metadata fields.

    Args:
        schema_model: The Pydantic model to generate schema from.
        url: The URL for the $id field.
        title: Optional custom title.
        description: Optional custom description.
        orm_class: SQLAlchemy class de la que se derivo ``schema_model``. Si se
            pasa, aplicamos ``enrich_schema_with_ui`` para resolver FKs contra
            ``schema_registry`` y permitir que los plugins inyecten widgets.

    Returns:
        A dictionary containing the enriched JSON schema.
    """
    schema = schema_model.model_json_schema()
    enriched_schema = {
        "$schema": "https://json-schema.org/draft/2020-12/schema",
        "$id": url,
        "title": title or schema.get("title"),
        "description": description or schema.get("description"),
        "type": "object"
    }
    enriched_schema.update(schema)
    if orm_class is not None:
        enrich_schema_with_ui(enriched_schema, orm_class)
        _attach_relationships(enriched_schema, orm_class)
        _attach_polymorphism(enriched_schema, orm_class)
    return enriched_schema

