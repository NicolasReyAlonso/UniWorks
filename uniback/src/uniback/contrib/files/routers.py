from typing import Optional, Any
from fastapi import APIRouter, Depends, Request, Response, Header, HTTPException
from fastapi.responses import HTMLResponse

from uniback.api.crud_factory import make_simple_rest_crud
from uniback.api.dependencies import get_n_session, AppSession
from uniback.contrib.files import service as files_service
from uniback.contrib.files.models import File, Folder, FileSystemStorage

router = APIRouter(prefix="/files", tags=["Files and File stores"])

def _get_fso_dict(o: Any, internal_path: Optional[str] = None):
    if isinstance(o, File):
        if internal_path:
            if internal_path.endswith("/"):
                return dict(id=o.id, full_name=f"{o.full_name}{internal_path}", type="folder", n_children=0)
            else:
                return dict(id=o.id, full_name=f"{o.full_name}{internal_path}", type="file",
                            content_type=None, content_size=None)
        else:
            return dict(id=o.id, full_name=o.full_name, type="file", content_type=o.content_type,
                        content_size=o.content_size)
    else:
        return dict(id=o.id, full_name=o.full_name, type="folder", n_children=len(o.children))


@router.put("/{fso_path:path}")
async def put_file(
    fso_path: str,
    request: Request,
    content_type: Optional[str] = Header(None),
    sess: AppSession = Depends(get_n_session(read_only=False))
):
    session = sess.db_session
    contents = await request.body()
    
    # Check if it is a content update
    if fso_path.endswith(".content"):
        success = files_service.put_file_and_its_contents(session, fso_path, contents, content_type)
        if success:
            return {"status": "success"}
        raise HTTPException(status_code=400, detail="Could not store file contents")
    
    # Otherwise, it might be a folder creation or metadata update
    parts, file_name = files_service.prepare_path(fso_path)
    if not file_name:
        accum_name, folder = files_service.process_folder(session, parts)
        return {"status": "success", "folder": _get_fso_dict(folder)}
    
    # Generic FSO creation (metadata)
    # ... logic for .fos, etc. can be added here
    
    return {"status": "error", "message": "Method not fully implemented for this path"}


@router.get("/{fso_path:path}")
async def get_file(
    fso_path: str,
    request: Request,
    accept: Optional[str] = Header(None),
    format: Optional[str] = None,
    sess: AppSession = Depends(get_n_session(read_only=True))
):
    session = sess.db_session
    
    # Handle suffixes
    is_content = False
    if fso_path.endswith(".content"):
        is_content = True
        fso_path = fso_path[:-len(".content")]
    
    fso, internal_path = files_service.get_file_system_object(session, fso_path)
    
    if not fso:
        raise HTTPException(status_code=404, detail="File system object not found")
    
    if is_content:
        if not isinstance(fso, File):
            raise HTTPException(status_code=400, detail="Object is not a file")
        
        wants_html = (accept and "text/html" in accept.lower()) or format == "html"

        c_type, content = files_service.get_file_contents(
            session, fso, 
            decode_text=True, 
            internal_path=internal_path
        )
        if isinstance(content, list): # Directory listing from archive
            return {"items": content}
        
        if wants_html and files_service.is_text_content(c_type):
            content = files_service.highlight_content(content, c_type)
            return HTMLResponse(content=content)
        elif files_service.is_text_content(c_type):
            # Recommended: also add it for plain text/json/sql files
            if "; charset=" not in c_type:
                c_type = f"{c_type}; charset=utf-8"

        return Response(content=content, media_type=c_type)
    
    # Return metadata
    if isinstance(fso, Folder) or (internal_path and internal_path.endswith("/")):
        if internal_path:
             # Archive directory listing
             _, items = files_service.get_file_contents(session, fso, internal_path=internal_path)
             return {"items": items}
        
        # Regular directory listing
        return {
            "metadata": _get_fso_dict(fso),
            "children": [_get_fso_dict(c) for c in fso.children]
        }
    
    return _get_fso_dict(fso, internal_path)


router_file_stores = make_simple_rest_crud(FileSystemStorage, "file_stores", tags=["Files and File stores"])
