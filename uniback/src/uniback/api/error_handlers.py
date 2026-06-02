from __future__ import annotations

import logging
from typing import Any

from fastapi import FastAPI, Request
from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse
from starlette.exceptions import HTTPException as StarletteHTTPException

from uniback.api.schemas.responses import Issue, IType, ResponseEnvelope

logger = logging.getLogger(__name__)


def _envelope_response(status_code: int, issues: list[Issue]) -> JSONResponse:
    payload = ResponseEnvelope(content=None, count=0, issues=issues).model_dump(mode="json")
    return JSONResponse(status_code=status_code, content=payload)


def _issue_code_for_status(status_code: int) -> str:
    return {
        400: "BAD_REQUEST",
        401: "UNAUTHORIZED",
        403: "FORBIDDEN",
        404: "NOT_FOUND",
        409: "CONFLICT",
        422: "UNPROCESSABLE_ENTITY",
    }.get(status_code, f"HTTP_{status_code}")


def register_exception_handlers(app: FastAPI) -> None:
    @app.exception_handler(StarletteHTTPException)
    async def http_exception_handler(_: Request, exc: StarletteHTTPException) -> JSONResponse:
        detail: Any = exc.detail
        message = detail if isinstance(detail, str) else "Request failed"
        location = None if isinstance(detail, str) else detail
        issue = Issue.error(message=message, code=_issue_code_for_status(exc.status_code), location=location)
        return _envelope_response(exc.status_code, [issue])

    @app.exception_handler(RequestValidationError)
    async def validation_exception_handler(_: Request, exc: RequestValidationError) -> JSONResponse:
        issues = [
            Issue(
                type=IType.ERROR,
                code="VALIDATION_ERROR",
                message=err.get("msg", "Invalid input"),
                location=err.get("loc"),
            )
            for err in exc.errors()
        ]
        return _envelope_response(422, issues)

    @app.exception_handler(Exception)
    async def unhandled_exception_handler(_: Request, exc: Exception) -> JSONResponse:
        logger.exception("Unhandled exception while serving request: %s", exc)
        issue = Issue.error(message="Internal server error", code="INTERNAL_ERROR")
        return _envelope_response(500, [issue])
