from typing import Optional, Any
from fastapi import APIRouter, Depends, Request, HTTPException
from uniback.api.dependencies import get_n_session, AppSession, parse_request_params
from uniback.api.schemas.responses import ResponseEnvelope, Issue, IType
from uniback.persistence.models.hierarchies import Hierarchy
from uniback.services import hierarchies as service

router = APIRouter(prefix="/hierarchies", tags=["Hierarchies"])

@router.get("/", response_model=ResponseEnvelope)
@router.get("/{id_}", response_model=ResponseEnvelope)
async def get_hierarchies(
    id_: Optional[int] = None,
    format: str = "flat",
    request: Request = None,
    sess: AppSession = Depends(get_n_session(read_only=True))
):
    db = sess.db_session
    if id_ is None:
        params = parse_request_params(request.query_params if request else None)
        from uniback.persistence.query import get_query
        stmt, count = get_query(db, Hierarchy, **params)
        results = db.execute(stmt).scalars().all()
        return ResponseEnvelope(content=results, count=count)
    else:
        content = service.get_hierarchy(db, id_, format)
        if content is None:
            raise HTTPException(status_code=404, detail="Hierarchy not found")
        return ResponseEnvelope(content=content, count=1)

@router.post("/", response_model=ResponseEnvelope)
async def create_hierarchy(
    request: Request,
    sess: AppSession = Depends(get_n_session())
):
    db = sess.db_session
    data = await request.json()
    
    try:
        h = service.create_or_update_hierarchy(
            db,
            uuid=data.get("uuid"),
            name=data.get("name", "undefined"),
            type_id=data.get("type_id", 0),
            attributes=data.get("attributes", {})
        )
        
        if data.get("nodes"):
            service.create_update_or_delete_hierarchy_nodes(db, h, data["nodes"])
            
        db.commit()
        db.refresh(h)
        
        return ResponseEnvelope(
            content=h,
            issues=[Issue(type=IType.INFO, message=f"Hierarchy created correctly. (ID: {h.id})")]
        )
    except Exception as e:
        db.rollback()
        return ResponseEnvelope(
            issues=[Issue(type=IType.ERROR, message=f"Error creating hierarchy: {str(e)}")],
            count=0
        )

@router.put("/{id_}", response_model=ResponseEnvelope)
async def update_hierarchy(
    id_: int,
    request: Request,
    sess: AppSession = Depends(get_n_session())
):
    db = sess.db_session
    data = await request.json()
    
    try:
        h = service.get_just_hierarchy(db, id_)
        if not h:
             raise HTTPException(status_code=404, detail=f"Hierarchy {id_} not found")
             
        h = service.create_or_update_hierarchy(
            db,
            uuid=data.get("uuid") or h.uuid,
            name=data.get("name", h.name),
            type_id=data.get("type_id", h.h_type_id),
            attributes=data.get("attributes", h.attributes)
        )
        
        if data.get("nodes"):
            service.create_update_or_delete_hierarchy_nodes(db, h, data["nodes"])
            
        db.commit()
        db.refresh(h)
        return ResponseEnvelope(content=h, count=1)
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        return ResponseEnvelope(
            issues=[Issue(type=IType.ERROR, message=f"Error updating hierarchy: {str(e)}")],
            count=0
        )
