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

## Pruebas
Los tests de la librería importan de `ngt-gui/*` (el paquete compilado), así que
hay que construirla antes:
```bash
ng build ngt-gui
ng test ngt-gui --watch=false --browsers=ChromeHeadless   # librería
ng test bcs-gui --watch=false --browsers=ChromeHeadless   # aplicación de demostración
```
Para probar un campo Formly propio (`FieldType`) de forma aislada, la librería
publica un arnés en `ngt-gui/testing`:
```ts
import { configureFieldTestBed, createField } from 'ngt-gui/testing';

await configureFieldTestBed(MiCampoComponent);
const fixture = createField(MiCampoComponent, { label: 'Nombre' });
```

## Tiempo real
`SocketService.entityChangedSubject` emite `{entity, created, updated, deleted}`
(solo ids) cada vez que el backend confirma una escritura. Una página que
muestra datos se suscribe, filtra por su entidad y vuelve a pedir el listado
(véase `src/app/pages/plants/plants-map.component.ts`).

## Configuración privada (opcional)
La configuración web de Firebase vive fuera del repositorio, en
`private-conf/ngd-firebase.json` (junto a la carpeta del repositorio). Los
`environment*.ts` la importan a través del alias `@private-conf/ngd-firebase.json`
de `tsconfig.json`, que cae en `src/environments/firebase.disabled.json` cuando
la carpeta no existe. Sin ella la aplicación compila y arranca igual: el login
ofrece solo los proveedores que anuncia el backend (usuario y contraseña).

## Ámbito global (zona, proyecto, caso de estudio...)
La cabecera muestra un selector por cada ámbito que declare el backend
(`GET /gui/scopes`); sin ámbitos declarados no muestra ninguno.
`GlobalScopeService` (`ngt-gui/core`) guarda la selección y responde, para
cualquier entidad, qué implica:
```ts
scope.filterFor('/plants');    // { zone_id: 3 }  → filtro del listado
scope.defaultsFor('/plants');  // { zone_id: 3 }  → valores de un alta nueva
scope.changes$;                // avisa cuando hay que volver a pedir datos
```
Las pantallas dinámicas (`/d/...`) ya lo aplican solas. Una página propia lo
aplica con esas tres llamadas y muestra `<ngt-scope-chips entityPath="/plants">`
para que el filtro sea visible y se pueda quitar ahí mismo. Solo se siguen
claves foráneas directas; la selección se recuerda en el navegador.

## Servicios del núcleo: una sola instancia
`CoreModule` se registra UNA vez, en la configuración de la aplicación
(`importProvidersFrom(CoreModule)`), y no en los `imports` de componentes
standalone: Angular daría a ese árbol de componentes su propio juego de
servicios y, por ejemplo, un login hecho en uno no lo vería el otro.

## Licencia
GPL-3.0-or-later; véase [LICENSE](LICENSE). La librería incluye CKEditor 5
(GPL-2.0-or-later), por lo que cualquier redistribución debe mantener una
licencia compatible con la GPL.
