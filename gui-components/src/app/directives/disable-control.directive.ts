import { Directive, Input } from '@angular/core';
import { NgControl } from '@angular/forms';

@Directive({
  selector: '[disableControl]',
  standalone: true
})
export class DisableControlDirective {

  @Input() set disableControl(condition: boolean) {
    if (this.disabled !== undefined) {
      this.toggleForm(condition);
    }
    this.disabled = condition;
  }

  disabled: boolean;

  constructor(private ngControl: NgControl) {}

  ngOnInit() {
    this.toggleForm(this.disabled);
  }

  toggleForm(condition: boolean) {
    const action = condition ? 'disable' : 'enable';
    this.ngControl.control[action]();
  }

}
