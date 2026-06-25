import { Directive, Input, OnDestroy, OnInit, ViewContainerRef } from '@angular/core';
import { ManagedWindow } from '../../interfaces/window-instance.interface';
import { WindowHostService } from '../../services/window-host.service';

/**
 * "Slot" que reclama el host de una ventana: al inicializarse inserta la vista
 * viva de la ventana en su propio `ViewContainerRef`; al destruirse la desancla
 * (sin destruirla) para que pueda re-anclarse en otro slot.
 *
 * Colócalo en un `<ng-container [wmWindowHost]="win">` DENTRO del contenedor
 * destino: la vista se inserta justo tras el ancla, como hija del contenedor.
 *
 * @see WindowHostService
 */
@Directive({
  selector: '[wmWindowHost]',
  standalone: true,
})
export class WindowHostDirective implements OnInit, OnDestroy {
  @Input({ required: true, alias: 'wmWindowHost' }) win!: ManagedWindow;

  constructor(
    private readonly vcr: ViewContainerRef,
    private readonly host: WindowHostService,
  ) {}

  ngOnInit(): void {
    this.host.attach(this.win, this.vcr);
  }

  ngOnDestroy(): void {
    this.host.detach(this.win.id, this.vcr);
  }
}
