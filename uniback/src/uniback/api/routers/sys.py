from typing import Any
from fastapi import APIRouter, Depends, Request
from ..crudie import getCRUDIE, make_crudie_rest_crud
from ..dependencies import AppSession, get_n_session, parse_request_params
from ..schemas.responses import ResponseEnvelope

router = APIRouter(tags=["Browser Filters"])

# Standard CRUD for browser filters if needed at /browser_filter
router.include_router(make_crudie_rest_crud('browser_filter', tags=["Browser Filters"]))

# Specialized paths for browser filters to match bcs-backend
@router.get("/browser/{object_type}/filters/", response_model=ResponseEnvelope)
async def list_browser_filters(object_type: str, request: Request, sess: AppSession = Depends(get_n_session(read_only=True))):
    crudie = getCRUDIE('browser_filter', sess)
    params = await parse_request_params(request)
    params['object_type'] = object_type
    issues, content, count, status = crudie.read(**params)
    return ResponseEnvelope(content=content, count=count, issues=issues)

@router.post("/browser/{object_type}/filters/", response_model=ResponseEnvelope)
async def create_browser_filter(object_type: str, request: Request, sess: AppSession = Depends(get_n_session())):
    crudie = getCRUDIE('browser_filter', sess)
    params = await parse_request_params(request)
    values = params.get('values', {})
    values['object_type'] = object_type
    issues, content, count, status = crudie.create(**values)
    return ResponseEnvelope(content=content, count=count, issues=issues)

@router.get("/browser/{object_type}/filters/schema", response_model=ResponseEnvelope)
async def get_browser_filter_schema(object_type: str, sess: AppSession = Depends(get_n_session(read_only=True))):
    crudie = getCRUDIE('browser_filter_form', sess)
    issues, content, count, status = crudie.read(object_type=object_type)
    return ResponseEnvelope(content=content, count=count, issues=issues)

@router.get("/browser/{object_type}/filters/{id}", response_model=ResponseEnvelope)
async def get_browser_filter(object_type: str, id: Any, sess: AppSession = Depends(get_n_session(read_only=True))):
    crudie = getCRUDIE('browser_filter', sess)
    issues, content, count, status = crudie.read(id=id, object_type=object_type)
    return ResponseEnvelope(content=content, count=count, issues=issues)

@router.put("/browser/{object_type}/filters/{id}", response_model=ResponseEnvelope)
async def update_browser_filter(object_type: str, id: Any, request: Request, sess: AppSession = Depends(get_n_session())):
    crudie = getCRUDIE('browser_filter', sess)
    params = await parse_request_params(request)
    values = params.get('values', {})
    values['object_type'] = object_type
    issues, content, count, status = crudie.update(id=id, **values)
    return ResponseEnvelope(content=content, count=count, issues=issues)

@router.delete("/browser/{object_type}/filters/{id}", response_model=ResponseEnvelope)
async def delete_browser_filter(object_type: str, id: Any, sess: AppSession = Depends(get_n_session())):
    crudie = getCRUDIE('browser_filter', sess)
    issues, content, count, status = crudie.delete(id=id, object_type=object_type)
    return ResponseEnvelope(content=content, count=count, issues=issues)
