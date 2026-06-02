import { Component, OnInit } from '@angular/core';
import {FieldType} from '@ngx-formly/core';

@Component({
    selector: 'app-annotation-text-field',
    templateUrl: './annotation-text-field.component.html',
    styleUrls: ['./annotation-text-field.component.sass'],
    standalone: false
})
export class AnnotationTextFieldComponent extends FieldType implements OnInit  {


  ngOnInit(): void {
    if (!this.formControl.value) {
      if (!this.props.multiple) {
        this.formControl.setValue('');
      } else {
        this.formControl.setValue([]);
      }
    }
  }

  changeValueEvent(event) {
    if (!this.props.multiple) {
      this.formControl.setValue(event);
      if (this.props.onValueChange) {
        this.props.onValueChange(event);
      }
    }
  }

  keyupEnter(event) {
    if (this.props.multiple) {
      const value = event.target.value;
      if (value && value !== '') {
        this.formControl.setValue([...this.formControl.value, value]);
        event.target.value = '';
      }
    }
  }

  removeValue(index): any {
    const newArray = [...this.formControl.value];
    newArray.splice(index, 1);
    this.formControl.setValue(newArray);
  }

}
