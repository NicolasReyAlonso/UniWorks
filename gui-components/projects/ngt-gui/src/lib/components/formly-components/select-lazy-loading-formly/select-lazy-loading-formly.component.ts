import {Component} from '@angular/core';
import {FieldType} from "@ngx-formly/core";

@Component({
    selector: 'app-select-lazy-loading-formly',
    templateUrl: './select-lazy-loading-formly.component.html',
    styleUrls: ['./select-lazy-loading-formly.component.sass'],
    standalone: false
})
export class SelectLazyLoadingFormlyComponent extends FieldType {

  finishInitComponent = false;

  ngOnInit(): void {
    if (this.props.multiple && !this.formControl.value) {
      this.formControl.setValue([]);
    }
    this.finishInitComponent = true;
    this.checkValidators();
  }

  checkValidators(): void {
    if (this.props.validator) {
      const message = this.props.validator.func(this.props.validator.params);
      const key = this.key as string | number;
      if (message) {
        this.formControl.setErrors({[key]: message});
        return;
      }
    }
  }

  checkIfExistErrorByKey(keyParameter) {
    const key = keyParameter as string | number;
    return this.formControl.errors  && this.formControl.errors[key];
  }

  getErrorByKey(keyParameter): string {
    const key = keyParameter as string | number;
    return this.formControl.errors[key];
  }

  changeValueEvent(event) {
    this.formControl.setValue(event);
    if (this.props.onValueChange) {
      this.props.onValueChange(event);
    }
    this.checkValidators();
  }

}
