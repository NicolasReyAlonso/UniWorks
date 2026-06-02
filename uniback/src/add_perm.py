from uniback.config.settings import Settings
from uniback.persistence.session import create_session_factory
from uniback.persistence.models.sysadmin import PermissionType, Role

settings = Settings()
session_manager = create_session_factory(settings.database.url)
with session_manager.session_scope() as db:
    roles = db.query(Role).all()
    admin_role = next((r for r in roles if "admin" in r.name.lower() or "root" in r.name.lower()), None)
    if not admin_role and roles: admin_role = roles[0]
    perm = db.query(PermissionType).filter_by(name="gui-organisms").first()
    if not perm:
        perm = PermissionType(name="gui-organisms")
        db.add(perm)
        db.commit()
    if perm not in admin_role.permissions:
        admin_role.permissions.append(perm)
        db.commit()
    print("Done adding permission gui-organisms.")
