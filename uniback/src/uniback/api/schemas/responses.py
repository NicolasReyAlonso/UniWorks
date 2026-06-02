from __future__ import annotations
from pydantic import BaseModel, Field
from typing import Any, List, Optional
from enum import Enum


class IType(str, Enum):
    INFO = "INFO"
    WARNING = "WARNING"
    ERROR = "ERROR"


IssueType = IType


class Issue(BaseModel):
    type: IType
    code: Optional[str] = None
    message: str
    location: Optional[Any] = None

    @classmethod
    def error(cls, message: str, code: Optional[str] = None, location: Optional[Any] = None) -> "Issue":
        return cls(type=IType.ERROR, message=message, code=code, location=location)

    @classmethod
    def warning(cls, message: str, code: Optional[str] = None, location: Optional[Any] = None) -> "Issue":
        return cls(type=IType.WARNING, message=message, code=code, location=location)

    @classmethod
    def info(cls, message: str, code: Optional[str] = None, location: Optional[Any] = None) -> "Issue":
        return cls(type=IType.INFO, message=message, code=code, location=location)


class ResponseEnvelope(BaseModel):
    """Standardized response envelope for all API endpoints."""
    content: Optional[Any] = None
    count: int = 0
    issues: List[Issue] = Field(default_factory=list)

    @classmethod
    def ok(cls, content: Any = None, count: Optional[int] = None, issues: Optional[List[Issue]] = None) -> "ResponseEnvelope":
        if count is None:
            count = len(content) if isinstance(content, list) else (1 if content is not None else 0)
        return cls(content=content, count=count, issues=issues or [])

    @classmethod
    def fail(cls, message: str, code: Optional[str] = None, location: Optional[Any] = None) -> "ResponseEnvelope":
        return cls(content=None, count=0, issues=[Issue.error(message, code=code, location=location)])
