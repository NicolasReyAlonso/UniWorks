import { Component, OnInit } from '@angular/core';
import { FieldType } from '@ngx-formly/core';

@Component({
    selector: 'app-select',
    templateUrl: './select.component.html',
    styleUrls: ['./select.component.sass'],
    standalone: false
})
export class SelectComponent extends FieldType implements OnInit {

  value: any;
  nzMode;
  optionsSelect: {label: string, value: any}[] = [];

  ngOnInit(): void {
    this.checkValidators();
    this.value = this.formControl.value ?? ((this.props.nzMode === 'multiple') ? [] : null);
    this.nzMode = this.props.nzMode ? this.props.nzMode : 'default';
    this.optionsSelect = this.getOptions();
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

  changeValueEvent(event) {
    this.formControl.setValue(event);
    if (this.props.onValueChange) {
      this.props.onValueChange(event);
    }
    this.checkValidators();
  }

  checkIfExistErrorByKey(keyParameter) {
    const key = keyParameter as string | number;
    return this.formControl.errors  && this.formControl.errors[key];
  }

  getErrorByKey(keyParameter): string {
    const key = keyParameter as string | number;
    return this.formControl.errors[key];
  }

  getOptions(): {value: any, label: any}[] {
    const options = this.props.options as any[];
    if (this.props.variableLabel && this.props.variableValue) {
      return options.map((item) => {
        return {
          label: item[this.props.variableLabel],
          value: item[this.props.variableValue],
        }
      });
    }
    return options;
  }

}
