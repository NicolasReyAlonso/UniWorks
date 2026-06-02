import { Component, OnInit } from '@angular/core';
import {FieldType} from "@ngx-formly/core";

@Component({
    selector: 'app-input-formly',
    templateUrl: './input-formly.component.html',
    styleUrls: ['./input-formly.component.sass'],
    standalone: false
})
export class InputFormlyComponent extends FieldType implements OnInit {

  value: any;

  ngOnInit(): void {
    this.checkValidators();
  }

  checkValidators(): void {
    if (this.props.validator) {
      const message = this.props.validator.func(this.props.validator.params);
      const key = this.key as string | number;
      if (message) {
        this.formControl.setErrors({ [key]: message });
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

  getValue() {
    return this.props.value ?? this.formControl.value
  }

}
