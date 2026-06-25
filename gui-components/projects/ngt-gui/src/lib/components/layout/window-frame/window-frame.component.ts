import {
  ChangeDetectionStrategy,
  Component,
  Input,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import {
  CdkDrag,
  CdkDragEnd,
  CdkDragHandle,
  Point,
} from '@angular/cdk/drag-drop';

import { ManagedWindow } from '../../../interfaces/window-instance.interface';
import { WindowManagerService } from '../../../services/window-manager.service';

/** Dirección de un tirador de redimensionado. */
type ResizeDir = 'n' | 's' | 'e' | 'w' | 'ne' | 'nw' | 'se' | 'sw';

/** Tamaño mínimo de una ventana al redimensionar (px). */
const MIN_WIDTH = 280;
const MIN_HEIGHT = 160;

/**
 * Una ventana flotante del gestor MDI.
 *
 * Responsabilidades:
 *  - Pintar la barra de título con acciones (minimizar, maximizar/restaurar,
 *    acoplar como pestaña, cerrar).
 *  - Mover la ventana arrastrando la barra de título (CDK DragDrop).
 *  - Redimensionar desde los 8 tiradores de borde/esquina.
 *  - Hospedar el contenido con `ngComponentOutlet` + el injector por-ventana.
 *
 * Todo el estado vive en {@link WindowManagerService}; este componente sólo
 * traduce gestos de usuario en llamadas al servicio.
 */
@Component({
  selector: 'app-window-frame',
  standalone: true,
  imports: [CommonModule, CdkDrag, CdkDragHandle],
  templateUrl: './window-frame.component.html',
  styleUrls: ['./window-frame.component.sass'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class WindowFrameComponent {
  @Input({ required: true }) win!: ManagedWindow;
  /** `true` si es la ventana enfocada (borde resaltado). */
  @Input() active = false;

  constructor(private readonly wm: WindowManagerService) {}

  /** Posición que CDK aplica como transform. En maximizado, fija a (0,0). */
  get dragPosition(): Point {
    return this.win.state === 'maximized'
      ? { x: 0, y: 0 }
      : { x: this.win.x, y: this.win.y };
  }

  /** El arrastre se desactiva cuando la ventana está maximizada. */
  get dragDisabled(): boolean {
    return this.win.state === 'maximized';
  }

  /** Trae la ventana al frente al interactuar con ella. */
  onFocus(): void {
    if (!this.active) {
      this.wm.focus(this.win.id);
    }
  }

  onDragEnded(event: CdkDragEnd): void {
    const pos = event.source.getFreeDragPosition();
    this.wm.setGeometry(this.win.id, { x: pos.x, y: pos.y });
  }

  minimize(): void {
    this.wm.minimize(this.win.id);
  }

  toggleMaximize(): void {
    this.wm.toggleMaximize(this.win.id);
  }

  dock(): void {
    this.wm.dock(this.win.id);
  }

  close(): void {
    this.wm.close(this.win.id);
  }

  // ── Redimensionado ──────────────────────────────────────────────────

  /**
   * Inicia un redimensionado desde un tirador. Se escuchan los eventos de
   * puntero en `document` hasta soltar, actualizando la geometría en vivo.
   */
  startResize(event: PointerEvent, dir: ResizeDir): void {
    if (this.win.state === 'maximized') {
      return;
    }
    event.preventDefault();
    event.stopPropagation();
    this.wm.focus(this.win.id);

    const startX = event.clientX;
    const startY = event.clientY;
    const start = {
      x: this.win.x,
      y: this.win.y,
      width: this.win.width,
      height: this.win.height,
    };

    const onMove = (e: PointerEvent) => {
      const dx = e.clientX - startX;
      const dy = e.clientY - startY;
      let { x, y, width, height } = start;

      if (dir.includes('e')) {
        width = Math.max(MIN_WIDTH, start.width + dx);
      }
      if (dir.includes('s')) {
        height = Math.max(MIN_HEIGHT, start.height + dy);
      }
      if (dir.includes('w')) {
        width = Math.max(MIN_WIDTH, start.width - dx);
        x = start.x + (start.width - width);
      }
      if (dir.includes('n')) {
        height = Math.max(MIN_HEIGHT, start.height - dy);
        y = start.y + (start.height - height);
      }

      this.wm.setGeometry(this.win.id, { x, y, width, height });
    };

    const onUp = () => {
      document.removeEventListener('pointermove', onMove);
      document.removeEventListener('pointerup', onUp);
    };

    document.addEventListener('pointermove', onMove);
    document.addEventListener('pointerup', onUp);
  }
}
