import { Component } from '@angular/core';
import {FieldType} from "@ngx-formly/core";

export enum InputsTypesRangeFormlyEnum {
  MINIMUM,
  MAXIMUM,
}

@Component({
    selector: 'app-input-range-formly',
    templateUrl: './input-range-formly.component.html',
    styleUrls: ['./input-range-formly.component.sass'],
    standalone: false
})
export class InputRangeFormlyComponent extends FieldType {

  value;
  readonly INPUTS_TYPES = InputsTypesRangeFormlyEnum;
  placeholders = [];
  static readonly DEFAULT_PLACEHOLDER_MIN = 'FORMLY.RANGE.DEFAULT_PLACEHOLDERS.MINIMUM'
  static readonly DEFAULT_PLACEHOLDER_MAX = 'FORMLY.RANGE.DEFAULT_PLACEHOLDERS.MAXIMUM'

  ngOnInit(): void {
    this.checkValidators();
    this.value = this.formControl.value ?? [ null, null ];
    this.formControl.setValue(this.value);
    if (this.props.placeholders) {
      this.placeholders[0] = this.props.placeholders[0] ?? InputRangeFormlyComponent.DEFAULT_PLACEHOLDER_MIN;
      this.placeholders[1] = this.props.placeholders[1] ?? InputRangeFormlyComponent.DEFAULT_PLACEHOLDER_MAX;
    } else {
      this.placeholders = [InputRangeFormlyComponent.DEFAULT_PLACEHOLDER_MIN, InputRangeFormlyComponent.DEFAULT_PLACEHOLDER_MAX]
    }
  }

  valueChangeEvent(event, inputType: InputsTypesRangeFormlyEnum) {
    if (isNaN(event) || event === '') {
      this.value[inputType] = null;
      this.formControl.setValue(this.value);
    } else {
      this.value[inputType] = event;
      this.formControl.setValue(this.value);
    }
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

}
