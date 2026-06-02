from typing import Any
from fastapi import APIRouter, Depends, Request
from uniback.api.crud_factory import make_simple_rest_crud
from uniback.api.dependencies import AppSession, get_n_session, parse_request_params
from uniback.api.schemas.responses import ResponseEnvelope
from uniback.persistence.models.species import DwcTaxon
from sqlalchemy.orm import Session
from uniback.api.dependencies import get_db

router = APIRouter(tags=["Species"])

# We can reuse the simple REST CRUD factory from uniback
# that provides standard /GET /POST /PUT /DELETE
# 'dwc_taxon' assumes a CRUDIE setup, but if there isn't one, we can define the endpoints directly.

@router.get("/species/", response_model=ResponseEnvelope)
async def get_species(request: Request, db: Session = Depends(get_db)):
    # Very basic list endpoint for species
    taxons = db.query(DwcTaxon).all()
    content = [
        {
            "id": t.id,
            "taxonID": t.taxonID,
            "scientificName": t.scientificName,
            "kingdom": t.kingdom,
            "phylum": t.phylum,
            "class": t.class_,
            "order": t.order,
            "family": t.family,
            "genus": t.genus,
            "specificEpithet": t.specificEpithet,
            "taxonRank": t.taxonRank,
            "vernacularName": t.vernacularName,
        }
        for t in taxons
    ]
    return ResponseEnvelope(content=content, count=len(content), issues=[])

@router.post("/species/", response_model=ResponseEnvelope)
async def create_species(request: Request, db: Session = Depends(get_db)):
    data = await request.json()
    new_taxon = DwcTaxon(
        taxonID=data.get("taxonID"),
        scientificName=data.get("scientificName"),
        kingdom=data.get("kingdom"),
        phylum=data.get("phylum"),
        class_=data.get("class"),
        order=data.get("order"),
        family=data.get("family"),
        genus=data.get("genus"),
        specificEpithet=data.get("specificEpithet"),
        taxonRank=data.get("taxonRank"),
        vernacularName=data.get("vernacularName"),
    )
    db.add(new_taxon)
    db.commit()
    db.refresh(new_taxon)
    content = [{"id": new_taxon.id, "scientificName": new_taxon.scientificName}]
    return ResponseEnvelope(content=content, count=1, issues=[])
