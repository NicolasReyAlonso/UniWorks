# BcsGui

## Desarrollo:
Detalles importantes para desarrollar con la librería:
- **IMPORTANTE** Angular cachea las librerías, de forma que si se van a hacer cambios respecto a injecciones o código en la librería es necesario parar el servidor, y hacer lo siguiente:
```bash
ng cache clean
#En caso de que sea código de la librería lo que se ha modificado
ng build ngt-gui
ng serve
```
- Es posible que tambien sea necesario limpiar la caché del navegador ya que hay aspectos como el html que el navegador también cachea
## Lanzamiento
Para ejecutar el proyecto por primera vez es necesario construir primero la librería
```bash
ng build ngt-gui
```