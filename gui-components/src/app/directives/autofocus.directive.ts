import {AfterViewInit, ChangeDetectorRef, Directive, ElementRef, inject} from '@angular/core';

@Directive({
  selector: '[appAutofocus]',
  standalone: true
})
export class AutofocusDirective {

  private readonly _elementRef = inject(ElementRef)
  private readonly _changeDetectorRef = inject(ChangeDetectorRef)

  constructor() {
    requestAnimationFrame(() => {
      this._elementRef.nativeElement.focus();
    });
  }

}
