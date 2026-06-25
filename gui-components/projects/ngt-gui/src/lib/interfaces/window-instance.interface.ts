import { Injector, Type } from '@angular/core';

/**
 * Estado visual de una ventana del gestor MDI.
 *  - `normal`   : ventana flotante con su posición y tamaño propios.
 *  - `minimized`: oculta del workspace, presente en la bandeja inferior.
 *  - `maximized`: ocupa todo el workspace (se guarda la geometría previa).
 */
export type WindowState = 'normal' | 'minimized' | 'maximized';

/** Geometría (posición + tamaño) de una ventana flotante, en píxeles. */
export interface WindowGeometry {
  x: number;
  y: number;
  width: number;
  height: number;
}

/**
 * Representa una ventana viva gestionada por {@link WindowManagerService}.
 *
 * El contenido se hospeda dinámicamente con `ngComponentOutlet` a partir de
 * {@link component} (la clase resuelta de la ruta) y un {@link injector} propio
 * por ventana que transporta el snapshot de la ruta (params + datos de los
 * resolvers), de modo que las páginas con `:id`/resolvers siguen funcionando.
 */
export interface ManagedWindow extends WindowGeometry {
  /** Identificador estable de la ventana (uuid corto). */
  id: string;

  /** Título mostrado en la barra de la ventana y en la pestaña acoplada. */
  title: string;

  /** Icono opcional (clase ng-zorro o material) mostrado junto al título. */
  icon?: string;

  /**
   * Ruta de origen (`router.url` al abrirla). Se usa para deduplicar: si ya
   * existe una ventana con la misma ruta, se enfoca en vez de abrir otra.
   */
  route: string;

  /**
   * Clave para recordar la disposición (geometría/acoplado) en localStorage.
   * Suele ser el patrón de ruta (`sequenceDetail/:id`) para que todas las
   * instancias de una misma página compartan disposición. Por defecto, `route`.
   */
  layoutKey: string;

  /** Clase de componente que se hospeda en la ventana. */
  component: Type<unknown>;

  /** Injector por-ventana (ActivatedRoute stand-in con params/data). */
  injector?: Injector;

  /** Estado visual actual. */
  state: WindowState;

  /** Geometría a restaurar al salir de `maximized`. */
  prevGeom?: WindowGeometry;

  /** z-index dinámico: la ventana enfocada es la de valor más alto. */
  zIndex: number;

  /**
   * `true` si la ventana está acoplada como pestaña (tipo navegador) en la
   * barra superior en vez de flotando en el workspace.
   */
  docked: boolean;
}
