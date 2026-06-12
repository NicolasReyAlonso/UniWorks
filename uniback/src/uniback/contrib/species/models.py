from sqlalchemy import Column, Integer, String, BigInteger
from sqlalchemy.orm import Mapped, mapped_column

from uniback.persistence.base import ORMBase, get_table_prefix

__all__ = ["DwcTaxon"]


class DwcTaxon(ORMBase):
    __tablename__ = f"{get_table_prefix()}dwc_taxons"

    id: Mapped[int] = mapped_column(BigInteger, primary_key=True, autoincrement=True)
    
    # Darwin Core terms
    taxonID: Mapped[str | None] = mapped_column(String(255), unique=True, index=True)
    scientificName: Mapped[str | None] = mapped_column(String(255), index=True)
    kingdom: Mapped[str | None] = mapped_column(String(100))
    phylum: Mapped[str | None] = mapped_column(String(100))
    class_: Mapped[str | None] = mapped_column("class", String(100)) # 'class' es reservada en Python
    order: Mapped[str | None] = mapped_column(String(100))
    family: Mapped[str | None] = mapped_column(String(100))
    genus: Mapped[str | None] = mapped_column(String(100))
    specificEpithet: Mapped[str | None] = mapped_column(String(100))
    taxonRank: Mapped[str | None] = mapped_column(String(50))
    vernacularName: Mapped[str | None] = mapped_column(String(255))
