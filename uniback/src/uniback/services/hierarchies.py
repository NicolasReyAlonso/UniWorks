from __future__ import annotations
from typing import Any, Dict, List, Optional, Tuple, Union
from sqlalchemy import and_, select
from sqlalchemy.orm import Session

from uniback.persistence.models.hierarchies import Hierarchy, HierarchyNode, HierarchyLevel
from uniback.persistence.query import get_query

def list_hierarchies(session: Session, **kwargs) -> List[Hierarchy]:
    """Enumeration of hierarchies."""
    stmt, count = get_query(session, Hierarchy, **kwargs)
    return session.execute(stmt).scalars().all()

def get_just_hierarchy(session: Session, h_id: Any) -> Optional[Hierarchy]:
    if isinstance(h_id, Hierarchy):
        return h_id
    
    if isinstance(h_id, int):
        return session.get(Hierarchy, h_id)
    
    # Assume UUID string or uuid.UUID
    from uuid import UUID
    if isinstance(h_id, str):
        try:
            h_id = UUID(h_id)
        except ValueError:
            # Maybe it's a name?
            return session.execute(select(Hierarchy).where(Hierarchy.name == h_id)).scalar_one_or_none()
            
    return session.execute(select(Hierarchy).where(Hierarchy.uuid == h_id)).scalar_one_or_none()

def get_children_of_node(session: Session, node_id: int) -> List[Dict[str, Any]]:
    children = session.execute(
        select(HierarchyNode).where(HierarchyNode.parent_node_id == node_id)
    ).scalars().all()
    
    result = []
    for child in children:
        d = {
            "id": child.id,
            "uuid": str(child.uuid),
            "name": child.name,
            "level_id": child.level_id,
            "reference_node_id": child.reference_node_id,
            "attributes": child.attributes,
            "children": get_children_of_node(session, child.id)
        }
        result.append(d)
    return result

def get_hierarchy(session: Session, h_id: Any, format_: str = "flat") -> Optional[Dict[str, Any]]:
    """Obtain the full hierarchy, either flat or nested."""
    h = get_just_hierarchy(session, h_id)
    if not h:
        return None
        
    d = {
        "id": h.id,
        "uuid": str(h.uuid),
        "type_id": h.h_type_id,
        "name": h.name,
        "attributes": h.attributes,
        "nodes": [],
        "levels": []
    }
    
    # Port levels
    levels = session.execute(
        select(HierarchyLevel).where(HierarchyLevel.hierarchy_id == h.id)
    ).scalars().all()
    for level in levels:
        d["levels"].append({
            "id": level.id,
            "uuid": str(level.uuid),
            "name": level.name,
            "attributes": level.attributes
        })

    if format_ == "flat":
        h_nodes = session.execute(
            select(HierarchyNode).where(HierarchyNode.hierarchy_id == h.id)
        ).scalars().all()
        for n in h_nodes:
            d["nodes"].append({
                "id": n.id,
                "uuid": str(n.uuid),
                "name": n.name,
                "parent_id": n.parent_node_id,
                "level_id": n.level_id,
                "reference_node_id": n.reference_node_id,
                "attributes": n.attributes
            })
    elif format_ == "nested":
        h_nodes = session.execute(
            select(HierarchyNode).where(
                and_(HierarchyNode.hierarchy_id == h.id, HierarchyNode.parent_node_id == None)
            )
        ).scalars().all()
        for n in h_nodes:
            node_dict = {
                "id": n.id,
                "uuid": str(n.uuid),
                "name": n.name,
                "level_id": n.level_id,
                "reference_node_id": n.reference_node_id,
                "attributes": n.attributes,
                "children": get_children_of_node(session, n.id)
            }
            d["nodes"].append(node_dict)
            
    return d

def create_or_update_hierarchy(
    session: Session, 
    uuid: Optional[Any] = None, 
    name: str = "undefined", 
    type_id: Optional[int] = None, 
    attributes: Optional[Dict] = None
) -> Hierarchy:
    from uuid import UUID
    
    h = None
    if uuid:
        if isinstance(uuid, str):
            uuid = UUID(uuid)
        h = session.execute(select(Hierarchy).where(Hierarchy.uuid == uuid)).scalar_one_or_none()
    
    if not h:
        h = Hierarchy(uuid=uuid or UUID(int=0) if uuid else None) # let it auto-generate if None
        if uuid: h.uuid = uuid
        session.add(h)
    
    if name is not None: h.name = name
    if type_id is not None: h.h_type_id = type_id
    if attributes is not None:
        if h.attributes:
            h.attributes.update(attributes)
        else:
            h.attributes = attributes
            
    session.flush()
    return h

def create_update_or_delete_hierarchy_nodes(session: Session, h_id: Any, node_list: List[Dict]):
    h = get_just_hierarchy(session, h_id)
    if not h:
        raise ValueError(f"Hierarchy {h_id} not found")
        
    from uuid import UUID
    
    objs = {} # uuid -> HierarchyNode
    
    for node_data in node_list:
        operation = node_data.get("operation", "cu").lower()
        node_uuid = node_data.get("uuid")
        if isinstance(node_uuid, str):
            node_uuid = UUID(node_uuid)
            
        if operation == "cu":
            node = None
            if node_uuid:
                node = session.execute(select(HierarchyNode).where(HierarchyNode.uuid == node_uuid)).scalar_one_or_none()
            
            if not node:
                node = HierarchyNode(hierarchy_id=h.id)
                if node_uuid: node.uuid = node_uuid
                session.add(node)
            
            if "name" in node_data: node.name = node_data["name"]
            if "attributes" in node_data:
                if node.attributes:
                    node.attributes.update(node_data["attributes"])
                else:
                    node.attributes = node_data["attributes"]
            
            # Handling relationships by UUID or ID
            # Parent
            parent_uuid = node_data.get("parent_uuid")
            if parent_uuid:
                if isinstance(parent_uuid, str): parent_uuid = UUID(parent_uuid)
                parent = session.execute(select(HierarchyNode).where(HierarchyNode.uuid == parent_uuid)).scalar_one_or_none()
                if parent: node.parent_node_id = parent.id
            elif "parent_id" in node_data:
                node.parent_node_id = node_data["parent_id"]
                
            # Level
            level_uuid = node_data.get("level_uuid")
            if level_uuid:
                if isinstance(level_uuid, str): level_uuid = UUID(level_uuid)
                level = session.execute(select(HierarchyLevel).where(HierarchyLevel.uuid == level_uuid)).scalar_one_or_none()
                if level: node.level_id = level.id
            elif "level_id" in node_data:
                node.level_id = node_data["level_id"]
                
            # Reference Node
            ref_uuid = node_data.get("reference_node_uuid")
            if ref_uuid:
                if isinstance(ref_uuid, str): ref_uuid = UUID(ref_uuid)
                ref = session.execute(select(HierarchyNode).where(HierarchyNode.uuid == ref_uuid)).scalar_one_or_none()
                if ref: node.reference_node_id = ref.id
            elif "reference_node_id" in node_data:
                node.reference_node_id = node_data["reference_node_id"]
                
            session.flush()
            if node.uuid: objs[node.uuid] = node
            
        elif operation == "d":
            node = None
            if node_uuid:
                node = session.execute(select(HierarchyNode).where(HierarchyNode.uuid == node_uuid)).scalar_one_or_none()
            elif "id" in node_data:
                node = session.get(HierarchyNode, node_data["id"])
            
            if node:
                session.delete(node)
                
    session.flush()
