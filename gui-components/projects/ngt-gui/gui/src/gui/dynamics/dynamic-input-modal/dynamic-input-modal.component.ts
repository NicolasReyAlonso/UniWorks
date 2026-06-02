import { Component, EventEmitter, Input, Output } from '@angular/core';
import {FormlyFieldConfig, FormlyModule} from '@ngx-formly/core';
import {FormsModule, ReactiveFormsModule, UntypedFormGroup} from "@angular/forms";
import {CommonModule} from "@angular/common";
import {SharedModule} from "../../../modules/shared.module";
import {NzModalModule} from "ng-zorro-antd/modal";
import {NzButtonModule} from "ng-zorro-antd/button";

@Component({
    imports: [
        CommonModule,
        FormsModule,
        ReactiveFormsModule,
        SharedModule,
        FormlyModule,
        NzModalModule,
        NzButtonModule
    ],
    selector: 'app-dynamic-input-modal',
    templateUrl: './dynamic-input-modal.component.html',
    styleUrls: ['./dynamic-input-modal.component.sass']
})
export class DynamicInputModalComponent {

  @Input() title = "";
  @Input() fields: FormlyFieldConfig[];
  @Output() acceptInput = new EventEmitter<{}>();
  @Output() isVisibleChange = new EventEmitter<boolean>();

  form = new UntypedFormGroup({});
  model = {};
  _isVisible: boolean;

  set isVisible(val) {
    this._isVisible = val;
    this.isVisibleChange.emit(this._isVisible);
  }

  @Input()
  get isVisible() {
    return this._isVisible;
  }

  status = []
  constructor() { }


  acceptButton() {
    if (this.form.valid) {
      this.acceptInput.emit(this.model);
      this.changeIsVisible(false);
    }
  }

  changeIsVisible(value: boolean) {
    this.isVisible = value;
  }

}
