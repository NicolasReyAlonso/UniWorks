import gzip
import binascii
import io
import logging
import mimetypes
import os
import tarfile
import urllib
import zipfile
from typing import Union, List, Tuple

import fsspec
import filetype

from uniback.contrib.files.models import File, FileSystemObject, Folder, FileSystemStorage
from uniback.persistence.models.core import FunctionalObject

# Add more mime types
mimetypes.init()
mimetypes.add_type('application/x-ipynb+json', '.ipynb')
mimetypes.add_type('application/sql', '.sql')


def prepare_path(path: str):
    """ Process path as String """
    p = clean_path(path)
    parts = p.split("/")
    if p.endswith("/"):
        file_name = None
    else:
        file_name = parts[-1]
        parts = parts[:-1]
    return parts, file_name


def is_text_content(c_type: str):
    return c_type and (c_type.startswith("text/") or c_type in ("application/json", "application/xml", "application/x-ipynb+json", "application/sql"))


def decode_text_in_bytes(c_type: str, content: bytes):
    if isinstance(content, bytes):
        # 1. Try UTF-8 first as it is the most common and robust
        try:
            return content.decode("utf-8")
        except UnicodeDecodeError:
            # 2. If UTF-8 fails, try to detect the encoding
            try:
                import chardet
                detected = chardet.detect(content)
                encoding = detected.get("encoding")
                if encoding:
                    return content.decode(encoding)
            except Exception:
                pass

        # 3. Final fallback to ISO-8859-1 with replacement characters
        return content.decode("iso-8859-1", errors="replace")
    return content


def highlight_content(content: str, content_type: str) -> str:
    """
    Applies syntax highlighting to the given content based on its type.
    Returns an HTML string.
    """
    if content_type == "application/x-ipynb+json":
        import nbformat
        from nbconvert import HTMLExporter
        # Load the notebook and export to HTML
        notebook = nbformat.reads(content, as_version=4)
        html_exporter = HTMLExporter()
        (html_output, _) = html_exporter.from_notebook_node(notebook)
        return html_output
    else:
        from pygments import highlight
        from pygments.lexers import guess_lexer, TextLexer
        from pygments.formatters.html import HtmlFormatter

        try:
            lexer = guess_lexer(content)
        except Exception:
            lexer = TextLexer()

        # Matches bcs-backend style: line numbers, inline styles, colorful theme
        formatter = HtmlFormatter(linenos=True, noclasses=True, style="colorful")
        code_html = highlight(content, lexer, formatter)

        # Wrap in a basic HTML structure with meta charset
        return (
            f"<!DOCTYPE html><html><head><meta charset='utf-8'></head>"
            f"<body>{code_html}</body></html>"
        )


def clean_path(path: str):
    return path.strip().replace(' ', '_'). \
        replace(u'\u201d', '').replace(u'\u201c', ''). \
        replace(u'\u2018', "").replace(u'\u2019', ""). \
        replace('€', 'eur'). \
        replace('$', 'usd')


def process_folder(session, parts: List[str]):
    """
    Given a path as a list of folders, CREATE or GET folders.
    Returns the accumulated path and the deepest Folder.
    """
    accum_name = "/"
    parent = session.query(Folder).filter(Folder.full_name == accum_name).first()
    if not parent:
        parent = Folder()
        parent.name = ""
        parent.full_name = accum_name
        parent.parent = None
        session.add(parent)

    for part in parts:
        if not part: continue
        accum_name += part + "/"
        fso = session.query(Folder).filter(Folder.full_name == accum_name).first()
        if not fso:
            fso = Folder()
            fso.name = part
            fso.full_name = accum_name
            fso.parent = parent
            session.add(fso)
        parent = fso

    return accum_name, parent


def get_file_system_object(session, fso_path: str):
    """
    Given a full path, obtain the object and optional internal path if archive.
    """
    internal_path = None
    # Assuming id is passed as "i123"
    if fso_path.startswith("i") and fso_path[1:].isdigit():
        fso = session.query(FileSystemObject).get(int(fso_path[1:]))
    else:
        for archive_ext in [".gz", ".zip"]:
            _ = f"{archive_ext}/"
            if _ in fso_path:
                if fso_path.endswith(_):
                    fso_path = fso_path[:-1]
                    internal_path = "/"
                else:
                    pos = fso_path.find(archive_ext)
                    internal_path = fso_path[pos + len(archive_ext):]
                    fso_path = fso_path[:pos + len(archive_ext)]
                break
        query_path = fso_path if fso_path.startswith("/") else "/" + fso_path
        fso = session.query(FileSystemObject).filter(FileSystemObject.full_name == query_path).first()
    return fso, internal_path


def get_or_create_file(session, file_name, name, parent) -> File:
    file = session.query(File).filter(File.full_name == name).first()
    if not file:
        file = File()
        file.name = file_name
        file.full_name = name
        session.add(file)
    file.parent = parent
    return file


def obtain_default_storage_for_fso(fso: FileSystemObject) -> Tuple[FileSystemStorage | None, Folder | None]:
    curr = fso
    while curr is not None:
        if curr.storage_id is not None:
            return curr.storage, curr
        curr = curr.parent
    return None, None


def obtain_fs(storage: FileSystemStorage):
    kwargs = storage.params or {}
    if storage.storage_type == "file":
        kwargs.setdefault("path", storage.params.get("base_path", "/"))
    return fsspec.filesystem(storage.storage_type, **kwargs)


def obtain_name_for_fs(storage: FileSystemStorage, fs, full_name: str, partial_name: str):
    if storage.storage_type == "file":
        base = storage.params.get("base_path", "/")
        return os.path.join(base, partial_name.lstrip("/"))
    return partial_name


def download_content(session, file: File) -> bytes:
    def retrieve_from_large_object(session, oid):
        conn = session.bind.raw_connection()
        try:
            with conn.cursor() as cursor:
                conn.autocommit = False
                lobject = conn.lobject(oid, 'rb')
                data = lobject.read()
                lobject.close()
                conn.commit()
                return data
        finally:
            conn.close()

    if file.content_location:
        if "oid" in file.content_location:
            return retrieve_from_large_object(session, file.content_location["oid"])
        else:
            storage, parent = obtain_default_storage_for_fso(file) if file.storage is None else (file.storage, file)
            if not storage:
                return file.embedded_content or b""
            fs = obtain_fs(storage)
            fs_dependant_name = file.content_location["fs_dependant_name"]
            with fs.open(fs_dependant_name, 'rb') as f:
                return f.read()
    else:
        return file.embedded_content or b""


def get_file_contents(session, fso_or_path, decode_text=False, internal_path=None):
    def guess_content_type(bts, path):
        kind = filetype.guess(bts)
        content_type = kind.mime if kind else None
        if content_type is None:
            content_type = mimetypes.guess_type(path)[0]
        return content_type or "application/octet-stream"

    def obtain_sub_items(items, in_path):
        sub_items = set()
        for name in items:
            t1 = name[len(in_path):].split("/", 1)
            if len(t1) == 1:
                if t1[0] != "":
                    sub_items.add(t1[0])
            else:
                sub_items.add(t1[0] + "/")
        return list(sub_items)

    def extract_or_list_from_zip(content, in_path):
        with io.BytesIO(content) as buffer:
            with zipfile.ZipFile(buffer) as zf:
                if in_path.endswith('/'):
                    items = [f"/{name}" for name in zf.namelist() if f"/{name}".startswith(in_path)]
                    return obtain_sub_items(items, in_path), "dir-list"
                else:
                    with zf.open(in_path.lstrip("/")) as f:
                        b = f.read()
                        return b, guess_content_type(b, in_path)

    def extract_or_list_from_gz(content, in_path):
        with io.BytesIO(content) as buffer:
            with gzip.open(buffer, 'rb') as gf:
                if in_path.endswith('/'):
                    with tarfile.open(fileobj=gf, mode='r|*') as tar:
                        items = [f"/{m.name}" for m in tar.getmembers() if f"/{m.name}".startswith(in_path)]
                        return obtain_sub_items(items, in_path), "dir-list"
                else:
                    with tarfile.open(fileobj=gf, mode='r|*') as tar:
                        member = tar.getmember(in_path.lstrip("/"))
                        if member and member.isfile():
                            b = tar.extractfile(member).read()
                            return b, guess_content_type(b, in_path)
                        raise FileNotFoundError(in_path)

    if isinstance(fso_or_path, File):
        fso = fso_or_path
    else:
        fso, _ = get_file_system_object(session, fso_or_path)
        if not isinstance(fso, File):
            raise ValueError("Not a file")

    content = download_content(session, fso)
    content_type = fso.content_type

    if internal_path:
        if fso.full_name.endswith(".gz"):
            content, content_type = extract_or_list_from_gz(content, internal_path)
        elif fso.full_name.endswith(".zip"):
            content, content_type = extract_or_list_from_zip(content, internal_path)

    if decode_text and is_text_content(content_type):
        content = decode_text_in_bytes(content_type, content)

    return content_type, content


def store_content(session, file: File, contents: bytes):
    def store_as_large_object(sess, content):
        conn = sess.bind.raw_connection()
        try:
            conn.autocommit = False
            lobject = conn.lobject(0, 'wb', 0)
            lobject.write(content)
            lobject.close()
            oid = lobject.oid
            conn.commit()
            return oid
        finally:
            conn.close()

    storage, parent = obtain_default_storage_for_fso(file) if file.storage is None else (file.storage, file)
    if storage is None or storage.storage_type == "embedded":
        file.embedded_content = contents
        if len(contents) > 10000000:
            oid = store_as_large_object(session, contents)
            file.embedded_content = None
            file.content_location = {"oid": oid}
    else:
        fs = obtain_fs(storage)
        rel_path = file.full_name[len(parent.full_name):] if parent else file.name
        fs_dependant_name = obtain_name_for_fs(storage, fs, file.full_name, partial_name=rel_path)
        with fs.open(fs_dependant_name, 'wb') as f:
            f.write(contents)
        file.content_location = {"fs_dependant_name": fs_dependant_name}


def put_file_and_its_contents(session, fso_path: str, contents: bytes, content_type: str):
    parts, file_name = prepare_path(fso_path)
    accum_name, parent = process_folder(session, parts)
    if file_name and file_name.endswith(".content"):
        file_name = file_name[:-len(".content")]
        accum_name += file_name
        file = get_or_create_file(session, file_name, accum_name, parent)
        file.content_type = content_type
        file.content_size = len(contents)
        store_content(session, file, contents)
        return True
    return False
