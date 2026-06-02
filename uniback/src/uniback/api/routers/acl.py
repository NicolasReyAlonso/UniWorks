from typing import Any, List, Optional, Union
import uuid
from fastapi import APIRouter, Depends, Request, HTTPException
from sqlalchemy import and_, select, delete, update
from sqlalchemy.orm import Session, joinedload

from uniback.api.dependencies import get_n_session, AppSession, parse_request_params
from uniback.api.schemas.responses import ResponseEnvelope, Issue, IType
from uniback.persistence.models.core import ObjectType, FunctionalObject
from uniback.persistence.models.sysadmin import (
    ACL, ACLDetail, PermissionType, ObjectTypePermissionType, Authorizable
)
from uniback.persistence.query import get_query
from uniback.utils.common import prepare_content

router = APIRouter(tags=["ACLs"])

# --- Object Types ---

@router.get("/object_types/", response_model=ResponseEnvelope)
@router.get("/object_types/{id_or_uuid}", response_model=ResponseEnvelope)
async def get_object_types(
    id_or_uuid: Optional[Union[int, str]] = None,
    request: Request = None,
    sess: AppSession = Depends(get_n_session(read_only=True))
):
    db = sess.db_session
    
    _id = None
    _uuid = None
    if id_or_uuid is not None:
        if isinstance(id_or_uuid, int):
            _id = id_or_uuid
        else:
            try:
                _id = int(id_or_uuid)
            except ValueError:
                _uuid = id_or_uuid

    params = await parse_request_params(request)
    stmt, count = get_query(db, ObjectType, id=_id, uuid=_uuid, **params)
    
    results = db.execute(stmt).scalars().all()
    
    if _id or _uuid or len(results) == 1:
        obj = results[0] if results else None
        if not obj:
             raise HTTPException(status_code=404, detail="Object type not found")
        
        perms_stmt = select(PermissionType).join(ObjectTypePermissionType).where(
            ObjectTypePermissionType.object_type_id == obj.id
        )
        perms = db.execute(perms_stmt).scalars().all()
        
        content = {
            "id": obj.id,
            "uuid": obj.uuid,
            "name": obj.name,
            "permission_types": perms
        }
        return ResponseEnvelope(content=content if _id or _uuid else [content], count=1)
    
    content = []
    for obj in results:
        content.append({
            "id": obj.id,
            "uuid": obj.uuid,
            "name": obj.name,
        })
        
    return ResponseEnvelope(content=content, count=count)

# --- ACLs ---

async def _resolve_object_uuid(db: Session, qparams: dict) -> str:
    if qparams.get('object_uuid'):
        return qparams.get('object_uuid')
    
    native_id = qparams.get('native_id') or qparams.get('chado_id')
    object_type = qparams.get('object_type')
    
    if native_id and object_type:
        # If object_type is a name, resolve it to ID
        if isinstance(object_type, str):
            ot_stmt = select(ObjectType.id).where(ObjectType.name == object_type)
            object_type = db.execute(ot_stmt).scalar()
            if not object_type:
                return None

        stmt = select(FunctionalObject.uuid).where(
            and_(FunctionalObject.native_id == native_id, FunctionalObject.object_type_id == object_type)
        )
        res = db.execute(stmt).scalar()
        if res:
            return res
        
        try:
            # Fallback to direct ID lookup if native_id matches FunctionalObject.id
            stmt = select(FunctionalObject.uuid).where(FunctionalObject.id == int(native_id))
            return db.execute(stmt).scalar()
        except (ValueError, TypeError):
            pass
            
    return None

@router.get("/acls/", response_model=ResponseEnvelope)
@router.get("/acls/{id_or_uuid}", response_model=ResponseEnvelope)
async def get_acls(
    id_or_uuid: Optional[Union[int, str]] = None,
    request: Request = None,
    sess: AppSession = Depends(get_n_session(read_only=True))
):
    db = sess.db_session
    _id = None
    _uuid = None
    if id_or_uuid is not None:
        if isinstance(id_or_uuid, int):
            _id = id_or_uuid
        else:
            try:
                _id = int(id_or_uuid)
            except ValueError:
                _uuid = id_or_uuid

    params = await parse_request_params(request)
    qparams = params.get('values', {}) if params.get('values') else params
    
    if not _id and not _uuid and not qparams.get('object_uuid'):
        resolved_uuid = await _resolve_object_uuid(db, qparams)
        if resolved_uuid:
            qparams['object_uuid'] = resolved_uuid

    if _id or _uuid or qparams.get('object_uuid'):
        stmt = select(ACL).options(joinedload(ACL.details).joinedload(ACLDetail.authorizable))
        if _id:
            stmt = stmt.where(ACL.id == _id)
        elif _uuid:
            stmt = stmt.where(ACL.uuid == _uuid)
        else:
            stmt = stmt.where(ACL.object_uuid == qparams.get('object_uuid'))
            
        acl = db.execute(stmt).unique().scalar_one_or_none()
        if not acl:
            return ResponseEnvelope(issues=[Issue(type=IType.ERROR, message="ACL not found")], count=0)
            
        details = []
        for detail in acl.details:
            details.append({
                "id": detail.id,
                "acl_id": detail.acl_id,
                "authorizable_id": detail.authorizable_id,
                "permission_id": detail.permission_id,
                "validity_start": detail.validity_start,
                "validity_end": detail.validity_end,
                "authorizable": detail.authorizable
            })
            
        content = {
            "id": acl.id,
            "uuid": acl.uuid,
            "object_type": acl.object_type,
            "object_uuid": acl.object_uuid,
            "details": details
        }
        return ResponseEnvelope(content=content, count=1)

    stmt, count = get_query(db, ACL, **params)
    results = db.execute(stmt).scalars().all()
    return ResponseEnvelope(content=results, count=count)

# Example - the ACL and the details are set in a single call
#
# (obtain another UUID and the object_type of that object)
# (also, make sure the authorizable_id and permission_id exist)
# export API_BASE_URL=http://localhost:8000/api
# curl --cookie-jar app-cookies.txt -X PUT "$API_BASE_URL/authn?user=test_user"
# curl --cookie app-cookies.txt -X POST "$API_BASE_URL/acls/" -H "Content-Type: application/json" -d '{"object_uuid": "9967aeba-3c81-4cee-bb93-776c3114c84e","object_type": 52, "details": [{"authorizable_id": 5, "permission_id": 2}]}'
@router.post("/acls/", response_model=ResponseEnvelope)
async def create_acl(
    request: Request,
    sess: AppSession = Depends(get_n_session())
):
    db = sess.db_session
    data = await request.json()
    
    try:
        if not data.get('object_uuid'):
             resolved_uuid = await _resolve_object_uuid(db, data)
             if resolved_uuid:
                 data['object_uuid'] = resolved_uuid
        
        if not data.get('object_uuid'):
             raise ValueError("Missing object_uuid or enough info to resolve it")

        # Resolve object_type if missing
        if not data.get('object_type'):
            ot_stmt = select(FunctionalObject.object_type_id).where(FunctionalObject.uuid == data['object_uuid'])
            obj_type_id = db.execute(ot_stmt).scalar()
            if obj_type_id:
                data['object_type'] = obj_type_id
            else:
                raise ValueError("Could not resolve object_type for the given object_uuid")

        details_data = data.pop('details', [])
        acl = ACL(**{k: v for k, v in data.items() if hasattr(ACL, k)})
        db.add(acl)
        db.flush()
        
        for d in details_data:
            db.add(ACLDetail(acl_id=acl.id, **d))
            
        db.commit()
        db.refresh(acl)
        return ResponseEnvelope(content=prepare_content(acl), count=1, issues=[Issue(type=IType.INFO, message="ACL created successfully")])
    except Exception as e:
        db.rollback()
        return ResponseEnvelope(issues=[Issue(type=IType.ERROR, message=f"Error creating ACL: {str(e)}")], count=0)

@router.put("/acls/{id_or_uuid}", response_model=ResponseEnvelope)
async def update_acl(
    id_or_uuid: Union[int, str],
    request: Request,
    sess: AppSession = Depends(get_n_session())
):
    db = sess.db_session
    data = await request.json()
    
    _id = None
    _uuid = None
    try:
        _id = int(id_or_uuid)
    except ValueError:
        _uuid = id_or_uuid

    stmt = select(ACL)
    if _id:
        stmt = stmt.where(ACL.id == _id)
    else:
        stmt = stmt.where(ACL.uuid == _uuid)
    
    acl = db.execute(stmt).scalar_one_or_none()
    if not acl:
        raise HTTPException(status_code=404, detail="ACL not found")
        
    try:
        details_data = data.pop('details', None)
        for k, v in data.items():
            if hasattr(acl, k):
                setattr(acl, k, v)
        
        if details_data is not None:
            existing_ids = [d.get('id') for d in details_data if d.get('id')]
            db.execute(delete(ACLDetail).where(and_(ACLDetail.acl_id == acl.id, ACLDetail.id.notin_(existing_ids))))
            
            for d in details_data:
                if 'id' in d:
                    detail_id = d.pop('id')
                    db.execute(update(ACLDetail).where(ACLDetail.id == detail_id).values(**d))
                else:
                    db.add(ACLDetail(acl_id=acl.id, **d))
        
        db.commit()
        return ResponseEnvelope(content=acl, count=1, issues=[Issue(type=IType.INFO, message="ACL updated successfully")])
    except Exception as e:
        db.rollback()
        return ResponseEnvelope(issues=[Issue(type=IType.ERROR, message=f"Error updating ACL: {str(e)}")], count=0)

@router.delete("/acls/", response_model=ResponseEnvelope)
@router.delete("/acls/{id_or_uuid}", response_model=ResponseEnvelope)
async def delete_acl(
    id_or_uuid: Optional[Union[int, str]] = None,
    request: Request = None,
    sess: AppSession = Depends(get_n_session())
):
    db = sess.db_session
    
    _id = None
    _uuid = None
    if id_or_uuid is not None:
        try:
            _id = int(id_or_uuid)
        except ValueError:
            _uuid = id_or_uuid

    params = await parse_request_params(request)
    
    if _id or _uuid:
        stmt = select(ACL)
        if _id:
            stmt = stmt.where(ACL.id == _id)
        else:
            stmt = stmt.where(ACL.uuid == _uuid)
        acl = db.execute(stmt).scalar_one_or_none()
        if acl:
            db.delete(acl)
            db.commit()
            return ResponseEnvelope(content={"status": "deleted"}, count=1)
        else:
            raise HTTPException(status_code=404, detail="ACL not found")
    else:
        stmt, count = get_query(db, ACL, **params)
        results = db.execute(stmt).scalars().all()
        for obj in results:
            db.delete(obj)
        db.commit()
        return ResponseEnvelope(content={"deleted_count": len(results)}, count=len(results))
