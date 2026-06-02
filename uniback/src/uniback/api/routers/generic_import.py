"""
Endpoint generico de importacion de datos.

Acepta:
- JSON body: ``{"rows": [...], "mode": "insert|upsert|dry_run", "stop_on_error": false}``
- Multipart con un fichero: el importer se elige por extension / content-type
  desde ``importer_registry`` (JSON y NDJSON por defecto; los plugins pueden
  registrar CSV, Excel...).

El motor real vive en ``uniback.services.import_service`` para poder reusarse
desde CLI / workers / tests sin pasar por HTTP.
"""

from __future__ import annotations

import io
from typing import Optional

from fastapi import APIRouter, Depends, File, Form, HTTPException, Query, Request, UploadFile

from uniback.api.dependencies import AppSession, get_n_session
from uniback.api.schema_registry import get_entity
from uniback.api.schemas.responses import Issue, ResponseEnvelope
from uniback.plugins.registries import importer_registry
from uniback.services.import_service import VALID_MODES, import_rows


router = APIRouter(tags=["System"])


@router.get("/sys/import/{entity_name}/formats", response_model=ResponseEnvelope)
async def list_supported_formats(entity_name: str):
    """Devuelve los formatos de importacion disponibles para esta entidad."""
    if get_entity(entity_name) is None:
        raise HTTPException(status_code=404, detail=f"Entidad '{entity_name}' no registrada")

    formats = []
    for imp in importer_registry.all():
        formats.append({
            "name": imp.name,
            "formats": list(imp.formats),
            "content_types": list(imp.content_types),
        })
    return ResponseEnvelope.ok(content=formats, count=len(formats))


@router.post("/sys/import/{entity_name}", response_model=ResponseEnvelope)
async def import_into_entity(
    entity_name: str,
    request: Request,
    file: Optional[UploadFile] = File(None),
    mode: Optional[str] = Form(None),
    stop_on_error: Optional[bool] = Form(None),
    importer: Optional[str] = Form(None),
    mode_q: Optional[str] = Query(None, alias="mode"),
    sess: AppSession = Depends(get_n_session()),
):
    """
    Inserta filas en ``entity_name``. Dos modos de invocacion:

    1. ``Content-Type: application/json`` con cuerpo
       ``{"rows": [...], "mode": "...", "stop_on_error": bool}``.
    2. ``multipart/form-data`` con un campo ``file`` y, opcionalmente, ``mode``
       e ``importer`` (nombre del parser a forzar).
    """
    if get_entity(entity_name) is None:
        raise HTTPException(status_code=404, detail=f"Entidad '{entity_name}' no registrada")

    effective_mode: str = "insert"
    stop = bool(stop_on_error) if stop_on_error is not None else False
    rows_iter = None

    if file is not None:
        chosen = None
        if importer:
            chosen = importer_registry.find(name=importer)
            if chosen is None:
                raise HTTPException(status_code=400, detail=f"Importer '{importer}' no registrado")
        else:
            chosen = importer_registry.find(filename=file.filename, content_type=file.content_type)
            if chosen is None:
                raise HTTPException(
                    status_code=415,
                    detail=f"No hay importer para {file.filename!r} ({file.content_type})",
                )
        raw = await file.read()
        stream = io.BytesIO(raw)
        try:
            rows_iter = list(chosen.parse(stream, entity_name=entity_name))
        except Exception as e:
            raise HTTPException(status_code=422, detail=f"Parser '{chosen.name}' fallo: {e}")
        if mode:
            effective_mode = mode
    else:
        try:
            body = await request.json()
        except Exception:
            raise HTTPException(status_code=400, detail="JSON invalido o body vacio")
        if not isinstance(body, dict):
            raise HTTPException(status_code=400, detail="Body debe ser un objeto JSON")
        rows_iter = body.get("rows") or body.get("items") or body.get("content")
        if not isinstance(rows_iter, list):
            raise HTTPException(status_code=400, detail="Falta 'rows' (lista) en el body")
        effective_mode = body.get("mode") or effective_mode
        stop = bool(body.get("stop_on_error", stop))

    if mode_q:
        effective_mode = mode_q

    if effective_mode not in VALID_MODES:
        raise HTTPException(
            status_code=400,
            detail=f"mode invalido: {effective_mode!r}. Validos: {list(VALID_MODES)}",
        )

    try:
        report = import_rows(
            sess.db_session,
            entity_name,
            rows_iter,
            mode=effective_mode,
            stop_on_error=stop,
        )
    except LookupError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))

    issues = []
    if report["errors"]:
        issues.append(Issue.warning(
            message=f"{report['errors']} fila(s) fallaron",
            code="IMPORT_PARTIAL",
        ))
    return ResponseEnvelope(content=report, count=report["ok"], issues=issues)
