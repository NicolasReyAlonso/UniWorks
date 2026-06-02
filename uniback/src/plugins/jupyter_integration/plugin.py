from typing import List, Any
from fastapi import APIRouter, FastAPI, BackgroundTasks
from sqlalchemy.orm import Session

from uniback.plugins.base import UnibackPlugin
from uniback.api.schemas.responses import ResponseEnvelope

# Creamos un router específico para el plugin
jupyter_router = APIRouter(prefix="/jupyter", tags=["Jupyter Plugin"])

@jupyter_router.get("/status")
async def get_jupyter_status():
    """Endpoint de ejemplo para verificar el estado de integración."""
    return ResponseEnvelope(content={"status": "running", "active_kernels": 0})


class JupyterIntegrationPlugin(UnibackPlugin):
    name = "JupyterIntegration"
    description = "Integra la ejecución y estado de los kernels de Jupyter notebook"
    version = "1.0.0"

    def on_init(self, settings: Any) -> None:
        print(f"[JupyterIntegration] Iniciando plugin con configuraciones de la app...")

    def get_routers(self) -> List[APIRouter]:
        # Exponemos el router que creamos arriba
        return [jupyter_router]

    def on_seed(self, db: Session) -> None:
        """
        Aquí podrías insertar automáticamente entradas en tu tabla de `Menus`
        para que cuando Angular cargue, vea que existe una sección "Jupyter".
        Ejemplo conceptual:
        
        from uniback.persistence.models.screens import Menu
        if not db.query(Menu).filter_by(name='Jupyter').first():
            db.add(Menu(name='Jupyter', path='/dynamic-generic/jupyter-browse'))
        """
        print("[JupyterIntegration] Verificando semilla de base de datos...")
        pass

    def on_app_ready(self, app: FastAPI) -> None:
        print("[JupyterIntegration] FastAPI App está lista. Plugin montado con éxito.")
