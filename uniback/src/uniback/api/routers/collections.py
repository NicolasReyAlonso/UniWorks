from fastapi import APIRouter
from ..crudie import make_crudie_rest_crud

router = APIRouter(tags=["Collections"])

# This generates GET, POST, GET {id}, PUT {id}, DELETE {id} for collections
router.include_router(make_crudie_rest_crud('collection', prefix='/collections', tags=["Collections"]))
