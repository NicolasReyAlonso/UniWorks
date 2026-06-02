from __future__ import annotations
import traceback
import json
from datetime import datetime
from typing import Any, Dict, List, Optional, Tuple, Type, Union, Callable
from urllib.parse import unquote

from sqlalchemy import and_, or_, func, select, String, DateTime, inspect
from sqlalchemy.orm import Session, Query
from sqlalchemy.sql import Select, Alias

from uniback.utils.common import listify

def get_orm_pk(orm):
    return inspect(orm).primary_key[0]

def get_orm_pk_value(target):
    pk = inspect(target.__class__).primary_key_from_instance(target)
    return pk[0] if len(pk) == 1 else pk

def chew_data(param: Any) -> Any:
    """Ported from biobarcoding.rest.chew_data"""
    if isinstance(param, bytes):
        try:
            param = param.decode()
        except Exception:
            pass
    if isinstance(param, str):
        try:
            import ast
            param = ast.literal_eval(param)
        except Exception:
            pass
        if isinstance(param, str):
            try:
                param = unquote(param)
            except Exception:
                pass
            try:
                param = json.loads(param)
            except Exception:
                pass
    return param

def decode_request_params(data: Any) -> Dict[str, Any]:
    """Ported from biobarcoding.rest.decode_request_params"""
    res = {}
    params = chew_data(data) or []
    if isinstance(params, (list, tuple)):
        for obj in params:
            if isinstance(obj, dict):
                for key in obj:
                    obj[key] = chew_data(obj[key])
        return params
    elif isinstance(params, dict):
        for key in params:
            res[key] = chew_data(params[key])
    return res

def parse_request_params(request_data: Any = None, default_kwargs: Dict = None) -> Dict[str, Any]:
    """Ported and adapted from biobarcoding.rest.parse_request_params"""
    kwargs = {'filter': [], 'order': [], 'pagination': {}, 'values': {}, 'searchValue': ''}
    
    if request_data:
        input_data = decode_request_params(request_data)
        if isinstance(input_data, dict):
            for key in ('filter', 'order', 'pagination', 'values', 'searchValue'):
                if key in input_data:
                    val = input_data.pop(key)
                    kwargs[key] = val if val is not None else kwargs[key]
            if input_data:
                if isinstance(kwargs['values'], dict):
                    kwargs['values'].update(input_data)
                else:
                    kwargs['values'] = input_data
                    
    if isinstance(default_kwargs, dict):
        for k, v in default_kwargs.items():
            if k in kwargs:
                curr_v = kwargs[k]
                if curr_v is None or (isinstance(curr_v, list) and len(curr_v) == 0) or (isinstance(curr_v, str) and curr_v == ''):
                    kwargs[k] = default_kwargs[k]
    return kwargs

def filter_parse(model: Type, filters: Any, aux_filter: Optional[Callable] = None, session: Session = None):
    """Ported from biobarcoding.rest.filter_parse and adapted for SQLAlchemy 2.0"""
    
    def get_condition(model, field, condition):
        obj = getattr(model, field)

        def clarify(arg):
            if hasattr(obj, 'property') and hasattr(obj.property, 'columns') and isinstance(obj.property.columns[0].type, DateTime):
                _t = (' %H:%M', ':%S', '.%f')
                for _f in ('%Y-%m-%d', '%m-%d-%Y', '%d-%m-%Y',
                           '%Y/%m/%d', '%m/%d/%Y', '%d/%m/%Y',
                           '%y-%m-%d', '%m-%d-%y', '%d-%m-%y',
                           '%y/%m/%d', '%m/%d/%y', '%d/%m/%y', ):
                    try:
                        return datetime.strptime(arg, _f)
                    except:
                        for i in range(len(_t)):
                            try:
                                return datetime.strptime(arg, _f + ''.join(_t[:i+1]))
                            except:
                                continue
            return arg

        if isinstance(condition, (list, tuple, set, Query, Alias, Select)):
            return obj.in_(clarify(condition))

        if not isinstance(condition, dict) or 'op' not in condition:
            return obj == clarify(condition)

        op = condition["op"]
        value, left, right = condition.get("unary"), condition.get("left"), condition.get("right")
        
        if op == "out":
            return obj.notin_(clarify(value))
        if op == "in":
            return obj.in_(clarify(value))
        if op == "eq":
            return obj == clarify(value)
        if op == "ne":
            return obj != clarify(value)
        if op == "between":
            left, right = clarify(left), clarify(right)
            if left is not None and right is not None:
                return obj.between(left, right)
            elif left is not None:
                return obj >= left
            elif right is not None:
                return obj <= right
        if op == "le":
            return obj <= clarify(value)
        if op == "ge":
            return obj >= clarify(value)
        if op == "lt":
            return obj < clarify(value)
        if op == "gt":
            return obj > clarify(value)
        if op == "contains":
            return clarify(value).in_(obj)
        if op == "like":
            return func.lower(func.cast(obj, String)).like(func.lower(clarify(value)))
        if op == "ilike":
            return func.lower(func.cast(obj, String)).ilike(func.lower(clarify(value)))

        return True

    try:
        or_clause = []
        for clause in listify(filters):
            if not isinstance(clause, dict):
                continue
            and_clause = []
            for field, condition in clause.items():
                if hasattr(model, field):
                    and_clause.append(get_condition(model, field, condition))
                else:
                    print(f'Warning: Unknown column "{field}" for model {model}.')
            
            if aux_filter:
                try:
                    lst = aux_filter(clause, session)
                except:
                    lst = aux_filter(clause)
                if lst:
                    and_clause.extend(lst)

            if and_clause:
                or_clause.append(and_(*and_clause))
        
        if or_clause:
            return or_(*or_clause)
        return None
    except Exception:
        traceback.print_exc()
        return None

def order_parse(model: Type, sort: List[Dict], aux_order: Optional[Callable] = None):
    """Ported from biobarcoding.rest.order_parse"""
    order_clause = []
    for item in listify(sort):
        if not isinstance(item, dict):
            continue
        field = item.get("field")
        order = item.get("order", "asc").lower()
        if hasattr(model, field):
            col = getattr(model, field)
            if order == "desc":
                order_clause.append(col.desc())
            else:
                order_clause.append(col.asc())
    
    if aux_order:
        order_clause.extend(aux_order(sort))
        
    return order_clause

def get_query(
    session: Session,
    model: Type,
    stmt: Optional[Select] = None,
    id: Optional[Any] = None,
    aux_filter: Optional[Callable] = None,
    preselection: Optional[Dict] = None,
    aux_order: Optional[Callable] = None,
    **kwargs
) -> Tuple[Select, int]:
    """Ported and adapted from biobarcoding.services.get_query for SQLAlchemy 2.0"""
    
    if stmt is None:
        stmt = select(model)
        
    if id:
        stmt = stmt.where(model.id == id)
        # For single ID, count is usually 1 if found
        count = session.scalar(select(func.count()).select_from(stmt.subquery()))
    else:
        if not kwargs.get('values'):
            kwargs['values'] = {}
            
        if preselection:
            clause = filter_parse(model, preselection, aux_filter, session)
            if clause is not None:
                stmt = stmt.where(clause)
                
        # Handle extra kwargs as 'values'
        reserved = ['values', 'filter', 'order', 'pagination', 'searchValue']
        for k, v in kwargs.items():
            if k not in reserved and v is not None:
                kwargs['values'][k] = v
                
        if kwargs.get('values'):
            for k, v in kwargs['values'].items():
                if hasattr(model, k):
                    stmt = stmt.where(getattr(model, k) == v)
                    
        if kwargs.get('filter'):
            clause = filter_parse(model, kwargs['filter'], aux_filter, session)
            if clause is not None:
                stmt = stmt.where(clause)
                
        if kwargs.get('searchValue'):
            if hasattr(model, "ts_vector"):
                # Simplified full text search adaptation
                search_val = " & ".join(kwargs['searchValue'].strip().split())
                stmt = stmt.where(model.ts_vector.match(search_val))
                
        if kwargs.get('order'):
            clauses = order_parse(model, kwargs['order'], aux_order)
            if clauses:
                stmt = stmt.order_by(*clauses)
        
        # Get count before pagination
        count = session.scalar(select(func.count()).select_from(stmt.subquery()))
        
        pagination = kwargs.get('pagination')
        if pagination and 'pageIndex' in pagination and 'pageSize' in pagination:
            page = pagination['pageIndex']
            page_size = pagination['pageSize']
            stmt = stmt.offset((page - 1) * page_size).limit(page_size)
            
    return stmt, count
