import {
  ComponentRef,
  EnvironmentInjector,
  Injectable,
  ViewContainerRef,
  createComponent,
} from '@angular/core';
import { ManagedWindow } from '../interfaces/window-instance.interface';

/**
 * Hospeda el componente de cada ventana creándolo UNA sola vez y moviendo su
 * `hostView` entre contenedores (`ViewContainerRef.insert`, que reubica la vista
 * sin destruirla). Así, mover una ventana entre el workspace flotante y la barra
 * de pestañas acopladas —o minimizarla— conserva su estado vivo.
 *
 * Es la alternativa a `ngComponentOutlet`, que destruye/recrea la instancia al
 * cambiar de contenedor en el DOM.
 *
 * @see WindowHostDirective  el "slot" que reclama el host de una ventana
 * @see WindowManagerService  estado lógico de las ventanas
 */
@Injectable({ providedIn: 'root' })
export class WindowHostService {
  /** Instancia viva por ventana (creada una vez, reutilizada al mover). */
  private readonly refs = new Map<string, ComponentRef<unknown>>();
  /** Contenedor (slot) que aloja actualmente la vista de cada ventana. */
  private readonly slots = new Map<string, ViewContainerRef>();

  constructor(private readonly envInjector: EnvironmentInjector) {}

  /**
   * Inserta la vista de la ventana en `vcr`, creándola la primera vez. Si ya
   * estaba en otro contenedor, la desancla de allí primero (una vista sólo puede
   * vivir en un `ViewContainerRef`).
   */
  attach(win: ManagedWindow, vcr: ViewContainerRef): void {
    let ref = this.refs.get(win.id);

    // Si la instancia cacheada fue destruida por Angular (p. ej. el slot que la
    // alojaba se desmontó en una carrera de re-render/re-navegación), descártala
    // y vuelve a crearla: nunca insertes una vista muerta (lanza "Cannot insert
    // a destroyed View in a ViewContainer!").
    if (ref && ref.hostView.destroyed) {
      this.refs.delete(win.id);
      this.slots.delete(win.id);
      ref = undefined;
    }

    if (!ref) {
      ref = createComponent(win.component, {
        environmentInjector: this.envInjector,
        elementInjector: win.injector,
      });
      this.refs.set(win.id, ref);
    }

    // Una vista sólo puede vivir en un contenedor: desánclala del anterior.
    const prev = this.slots.get(win.id);
    if (prev && prev !== vcr) {
      const pi = prev.indexOf(ref.hostView);
      if (pi !== -1) {
        prev.detach(pi);
      }
    }

    if (vcr.indexOf(ref.hostView) === -1) {
      vcr.insert(ref.hostView);
    }
    this.slots.set(win.id, vcr);
    ref.changeDetectorRef.markForCheck();
  }

  /**
   * Desancla (sin destruir) la vista de `vcr` si es quien la aloja. Lo llama el
   * slot al destruirse, para que la ventana sobreviva y pueda re-anclarse en
   * otro contenedor (p. ej. al acoplar/desacoplar).
   */
  detach(winId: string, vcr: ViewContainerRef): void {
    const ref = this.refs.get(winId);
    if (!ref) {
      return;
    }
    const i = vcr.indexOf(ref.hostView);
    if (i !== -1) {
      vcr.detach(i);
    }
    if (this.slots.get(winId) === vcr) {
      this.slots.delete(winId);
    }
  }

  /** Destruye definitivamente la instancia de una ventana (al cerrarla). */
  destroy(winId: string): void {
    const ref = this.refs.get(winId);
    if (ref) {
      const vcr = this.slots.get(winId);
      if (vcr) {
        const i = vcr.indexOf(ref.hostView);
        if (i !== -1) {
          vcr.detach(i);
        }
      }
      ref.destroy();
      this.refs.delete(winId);
    }
    this.slots.delete(winId);
  }

  /** Destruye todas las instancias (al cerrar todo). */
  destroyAll(): void {
    this.refs.forEach((ref) => ref.destroy());
    this.refs.clear();
    this.slots.clear();
  }
}
