from __future__ import annotations

import uuid
from typing import Any

from sqlalchemy import BigInteger, ForeignKey, Integer, String, LargeBinary
from sqlalchemy.orm import Mapped, mapped_column, relationship, backref

from uniback.persistence.base import GUID, JSONB, ORMBase, get_table_prefix
from uniback.persistence.models.core import FunctionalObject, class_to_object_type_id, data_object_type_id


def _tn(name: str) -> str:
    """Apply global table prefix to a table name."""
    return f"{get_table_prefix()}fs_{name}"


class FileSystemStorage(ORMBase):
    __tablename__ = _tn("storages")

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    uuid: Mapped[uuid.UUID] = mapped_column(GUID, unique=True, default=uuid.uuid4)
    storage_type: Mapped[str | None] = mapped_column(String(10))  # embedded, local, s3, minio
    params: Mapped[dict[str, Any] | None] = mapped_column(JSONB)


class FileSystemObject(FunctionalObject):
    """A file system object is a File or a Folder"""
    __versioned__ = {}
    __tablename__ = _tn("objects")
    __mapper_args__ = {"polymorphic_identity": data_object_type_id["file_system_object"]}

    id: Mapped[int] = mapped_column(
        BigInteger, ForeignKey(FunctionalObject.id), primary_key=True
    )
    full_name: Mapped[str | None] = mapped_column(String(2048))
    
    storage_id: Mapped[int | None] = mapped_column(
        BigInteger, ForeignKey(FileSystemStorage.id), nullable=True
    )
    storage: Mapped[FileSystemStorage | None] = relationship(FileSystemStorage)

    parent_id: Mapped[int | None] = mapped_column(
        BigInteger,
        ForeignKey(
            _tn("folders") + ".id",
            use_alter=True,
            name="fk_fso_parent_folder_id"
        ),
        nullable=True
    )

class Folder(FileSystemObject):
    __versioned__ = {}
    __tablename__ = _tn("folders")
    id: Mapped[int] = mapped_column(
        BigInteger, ForeignKey(FileSystemObject.id), primary_key=True
    )
    
    children: Mapped[list[FileSystemObject]] = relationship(
        "FileSystemObject",
        foreign_keys=[FileSystemObject.parent_id],
        backref=backref("parent", remote_side=[id]),
        cascade="all, delete-orphan",
    )

    __mapper_args__ = {"polymorphic_identity": data_object_type_id["folder"],
                       "inherit_condition": id == FileSystemObject.id,}


class File(FileSystemObject):
    __versioned__ = {}
    __tablename__ = _tn("files")
    id: Mapped[int] = mapped_column(
        BigInteger, ForeignKey(FileSystemObject.id), primary_key=True
    )
    content_type: Mapped[str | None] = mapped_column(String(256))
    embedded_content: Mapped[bytes | None] = mapped_column(LargeBinary)
    content_size: Mapped[int | None] = mapped_column(Integer)
    content_location: Mapped[dict[str, Any] | None] = mapped_column(JSONB)

    __mapper_args__ = {"polymorphic_identity": data_object_type_id["file"],
                       "inherit_condition": id == FileSystemObject.id,}

class_to_object_type_id.update({
    FileSystemObject: data_object_type_id["file_system_object"],
    Folder: data_object_type_id["folder"],
    File: data_object_type_id["file"],
})

class FunctionalObjectInFile(ORMBase):
    __tablename__ = _tn("fos_in_files")
    file_id: Mapped[int] = mapped_column(
        BigInteger, ForeignKey(File.id), primary_key=True
    )
    file: Mapped[File] = relationship(
        File,
        backref=backref("fos_links", cascade="all, delete-orphan"),
        foreign_keys=[file_id],
    )
    fos_id: Mapped[int] = mapped_column(
        BigInteger, ForeignKey(FunctionalObject.id), primary_key=True
    )
    fos: Mapped[FunctionalObject] = relationship(
        FunctionalObject,
        backref=backref("file_links", cascade="all, delete-orphan"),
        foreign_keys=[fos_id],
    )


__all__ = [
    "FileSystemStorage",
    "FileSystemObject",
    "Folder",
    "File",
    "FunctionalObjectInFile",
]
