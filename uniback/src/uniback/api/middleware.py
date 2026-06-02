from __future__ import annotations

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from uniback.api.error_handlers import register_exception_handlers
from uniback.config.settings import APISettings


def add_middlewares(app: FastAPI, settings: APISettings) -> None:
    """Configure common middleware for the FastAPI application."""

    origins = settings.cors_origins or ["*"]

    app.add_middleware(
        CORSMiddleware,
        allow_origins=origins,
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )

    register_exception_handlers(app)