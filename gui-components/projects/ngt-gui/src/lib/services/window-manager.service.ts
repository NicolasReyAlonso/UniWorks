import { Injectable, Injector, Type, computed, signal } from '@angular/core';
import {
  ManagedWindow,
  WindowGeometry,
} from '../interfaces/window-instance.interface';

/** Opciones para abrir (o re-enfocar) una ventana en el gestor MDI. */
export interface OpenWindowOptions {
  route: string;
  title: string;
  component: Type<unknown>;
  icon?: string;
  injector?: Injector;
  /** Si `true`, la ventana nace acoplada como pestaña en vez de flotando. */
  docked?: boolean;
}

/** Geometría por defecto de una ventana flotante recién abierta. */
const DEFAULT_WIDTH = 720;
const DEFAULT_HEIGHT = 480;
/** Desplazamiento en cascada para que las ventanas nuevas no se solapen. */
const CASCADE_STEP = 28;
const CASCADE_ORIGIN = 24;

/**
 * Estado central del gestor de ventanas MDI.
 *
 * Mantiene la lista de ventanas vivas con signals para que el layout reaccione
 * de forma granular. El contenido de cada ventana se hospeda con
 * `ngComponentOutlet`; este servicio sólo gestiona identidad, geometría,
 * z-index, estado (normal/min/max) y acoplado (flotante/pestaña).
 *
 * Es deliberadamente agnóstico al router: el {@link MdiLayoutComponent} es quien
 * traduce la navegación en llamadas a {@link open}.
 */
@Injectable({ providedIn: 'root' })
export class WindowManagerService {
  private readonly _windows = signal<ManagedWindow[]>([]);
  private readonly _activeId = signal<string | null>(null);

  /** Contador monótono para asignar z-index al enfocar. */
  private zCounter = 100;
  /** Contador para la posición en cascada de ventanas nuevas. */
  private cascadeIndex = 0;
  /** Secuencia para ids estables. */
  private idSeq = 0;

  /** Todas las ventanas, en orden de apertura. */
  readonly windows = this._windows.asReadonly();
  /** Id de la ventana enfocada (la de mayor z-index), o `null`. */
  readonly activeId = this._activeId.asReadonly();

  /**
   * Todas las ventanas no acopladas (flotantes), INCLUIDAS las minimizadas.
   * Se renderizan siempre en el workspace (las minimizadas ocultas por CSS)
   * para mantener vivo su componente y no perder estado al minimizar.
   */
  readonly nonDockedWindows = computed(() =>
    this._windows().filter((w) => !w.docked),
  );

  /** Ventanas flotantes visibles (no minimizadas). */
  readonly floatingWindows = computed(() =>
    this._windows().filter((w) => !w.docked && w.state !== 'minimized'),
  );

  /** Ventanas acopladas como pestañas (barra superior tipo navegador). */
  readonly dockedWindows = computed(() => this._windows().filter((w) => w.docked));

  /** Ventanas minimizadas (van a la bandeja inferior). */
  readonly minimizedWindows = computed(() =>
    this._windows().filter((w) => !w.docked && w.state === 'minimized'),
  );

  /** Ventana enfocada actualmente, o `undefined`. */
  readonly activeWindow = computed(() =>
    this._windows().find((w) => w.id === this._activeId()),
  );

  /**
   * Abre una ventana nueva o, si ya hay una con la misma ruta, la enfoca
   * (restaurándola si estaba minimizada). Devuelve el id de la ventana.
   */
  open(opts: OpenWindowOptions): string {
    const existing = this._windows().find((w) => w.route === opts.route);
    if (existing) {
      if (existing.state === 'minimized') {
        this.patch(existing.id, { state: 'normal' });
      }
      this.focus(existing.id);
      return existing.id;
    }

    const id = `win-${++this.idSeq}`;
    const offset = CASCADE_ORIGIN + (this.cascadeIndex % 8) * CASCADE_STEP;
    this.cascadeIndex++;

    const win: ManagedWindow = {
      id,
      title: opts.title,
      icon: opts.icon,
      route: opts.route,
      component: opts.component,
      injector: opts.injector,
      state: 'normal',
      docked: opts.docked ?? false,
      x: offset,
      y: offset,
      width: DEFAULT_WIDTH,
      height: DEFAULT_HEIGHT,
      zIndex: ++this.zCounter,
    };

    this._windows.update((list) => [...list, win]);
    this._activeId.set(id);
    return id;
  }

  /** Cierra una ventana y reasigna el foco a la de mayor z-index restante. */
  close(id: string): void {
    this._windows.update((list) => list.filter((w) => w.id !== id));
    if (this._activeId() === id) {
      this.focusTopMost();
    }
  }

  /** Trae una ventana al frente y la marca como enfocada. */
  focus(id: string): void {
    const win = this.byId(id);
    if (!win) {
      return;
    }
    this.patch(id, { zIndex: ++this.zCounter });
    this._activeId.set(id);
  }

  /** Minimiza una ventana flotante a la bandeja inferior. */
  minimize(id: string): void {
    this.patch(id, { state: 'minimized' });
    if (this._activeId() === id) {
      this.focusTopMost();
    }
  }

  /** Restaura una ventana minimizada y la enfoca. */
  restore(id: string): void {
    const win = this.byId(id);
    if (!win) {
      return;
    }
    this.patch(id, { state: 'normal', docked: false });
    this.focus(id);
  }

  /** Alterna entre maximizado y normal, conservando la geometría previa. */
  toggleMaximize(id: string): void {
    const win = this.byId(id);
    if (!win) {
      return;
    }
    if (win.state === 'maximized') {
      const prev = win.prevGeom;
      this.patch(id, {
        state: 'normal',
        x: prev?.x ?? win.x,
        y: prev?.y ?? win.y,
        width: prev?.width ?? win.width,
        height: prev?.height ?? win.height,
        prevGeom: undefined,
      });
    } else {
      this.patch(id, {
        state: 'maximized',
        prevGeom: { x: win.x, y: win.y, width: win.width, height: win.height },
      });
    }
    this.focus(id);
  }

  /** Acopla una ventana flotante como pestaña (tipo navegador). */
  dock(id: string): void {
    this.patch(id, { docked: true, state: 'normal' });
    this.focus(id);
  }

  /** Devuelve una pestaña acoplada al workspace como ventana flotante. */
  undock(id: string): void {
    this.patch(id, { docked: false, state: 'normal' });
    this.focus(id);
  }

  /** Alterna acoplado/flotante. */
  toggleDock(id: string): void {
    const win = this.byId(id);
    if (win) {
      win.docked ? this.undock(id) : this.dock(id);
    }
  }

  /** Persiste un cambio de geometría (mover o redimensionar). */
  setGeometry(id: string, geom: Partial<WindowGeometry>): void {
    this.patch(id, geom);
  }

  /** Actualiza el título de una ventana (p. ej. tras resolverse la ruta). */
  setTitle(id: string, title: string): void {
    this.patch(id, { title });
  }

  /** Cierra todas las ventanas. */
  closeAll(): void {
    this._windows.set([]);
    this._activeId.set(null);
  }

  // ── Helpers internos ────────────────────────────────────────────────

  private byId(id: string): ManagedWindow | undefined {
    return this._windows().find((w) => w.id === id);
  }

  private patch(id: string, change: Partial<ManagedWindow>): void {
    this._windows.update((list) =>
      list.map((w) => (w.id === id ? { ...w, ...change } : w)),
    );
  }

  /** Enfoca la ventana visible de mayor z-index (al cerrar/minimizar). */
  private focusTopMost(): void {
    const candidates = this._windows().filter(
      (w) => w.state !== 'minimized',
    );
    if (candidates.length === 0) {
      this._activeId.set(null);
      return;
    }
    const top = candidates.reduce((a, b) => (b.zIndex > a.zIndex ? b : a));
    this._activeId.set(top.id);
  }
}
