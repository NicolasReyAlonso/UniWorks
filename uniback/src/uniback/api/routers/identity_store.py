from datetime import datetime, timezone
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, Request
from sqlalchemy import and_, select

from uniback.api.dependencies import get_n_session, AppSession, parse_request_params
from uniback.api.schemas.responses import ResponseEnvelope, Issue, IType
from uniback.persistence.models.sysadmin import IdentityStoreEntry
from uniback.persistence.query import get_query

router = APIRouter(tags=["Identity Stores"], prefix="/identity_store")

@router.get("/", response_model=ResponseEnvelope)
@router.get("/{key}", response_model=ResponseEnvelope)
async def get_identity_store(
    key: Optional[str] = None,
    request: Request = None,
    sess: AppSession = Depends(get_n_session(read_only=True))
):
    db = sess.db_session
    ident_id = sess.identity_id
    
    if not ident_id:
        raise HTTPException(status_code=401, detail="Not identified, login first")
        
    if key is None:
        stmt = select(IdentityStoreEntry).where(IdentityStoreEntry.identity_id == ident_id)
        results = db.execute(stmt).scalars().all()
        return ResponseEnvelope(content=[e.key for e in results], count=len(results))
    else:
        stmt = select(IdentityStoreEntry).where(
            and_(IdentityStoreEntry.identity_id == ident_id, IdentityStoreEntry.key == key)
        )
        entry = db.execute(stmt).scalar_one_or_none()
        if entry is None:
            return ResponseEnvelope(issues=[Issue(type=IType.ERROR, message=f"Key {key} not found")], count=0)
        
        return ResponseEnvelope(content=entry.value, count=1)

@router.put("/{key}", response_model=ResponseEnvelope)
async def put_identity_store(
    key: str,
    request: Request,
    sess: AppSession = Depends(get_n_session())
):
    db = sess.db_session
    ident_id = sess.identity_id
    
    if not ident_id:
        raise HTTPException(status_code=401, detail="Not identified, login first")
        
    data = await request.json()
    
    stmt = select(IdentityStoreEntry).where(
        and_(IdentityStoreEntry.identity_id == ident_id, IdentityStoreEntry.key == key)
    )
    entry = db.execute(stmt).scalar_one_or_none()
    
    if entry is None:
        entry = IdentityStoreEntry(identity_id=ident_id, key=key)
        db.add(entry)
    
    entry.value = data
    entry.update_time = datetime.now(timezone.utc)
    
    db.commit()
    db.refresh(entry)
    return ResponseEnvelope(content=entry.value, count=1)

@router.delete("/{key}", response_model=ResponseEnvelope)
async def delete_identity_store(
    key: str,
    sess: AppSession = Depends(get_n_session())
):
    db = sess.db_session
    ident_id = sess.identity_id
    
    if not ident_id:
        raise HTTPException(status_code=401, detail="Not identified, login first")
        
    stmt = select(IdentityStoreEntry).where(
        and_(IdentityStoreEntry.identity_id == ident_id, IdentityStoreEntry.key == key)
    )
    entry = db.execute(stmt).scalar_one_or_none()
    
    if entry:
        db.delete(entry)
        db.commit()
        return ResponseEnvelope(content={"status": "deleted"}, count=1)
    else:
        raise HTTPException(status_code=404, detail=f"Key {key} not found")
