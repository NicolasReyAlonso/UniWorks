import json
import zlib
import base64
from typing import Any

def serialize_from_object(obj: Any) -> str:
    """Serialize an object to a string. Using JSON for now."""
    # This is a simplified version of what jsonpickle does
    if hasattr(obj, "__dict__"):
        return json.dumps(obj.__dict__)
    return json.dumps(obj)

def deserialize_to_object(s: str, cls: type = None) -> Any:
    """Deserialize an object from a string."""
    data = json.loads(s)
    if cls and isinstance(data, dict):
        obj = cls.__new__(cls)
        obj.__dict__.update(data)
        return obj
    return data

def compress_session(s: str) -> bytes:
    """Compress a serialized session."""
    return zlib.compress(s.encode("utf-8"))

def decompress_session(b: bytes) -> str:
    """Decompress a serialized session."""
    return zlib.decompress(b).decode("utf-8")
