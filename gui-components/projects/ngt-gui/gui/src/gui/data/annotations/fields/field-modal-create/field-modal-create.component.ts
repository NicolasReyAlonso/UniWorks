import { Component, EventEmitter, OnInit, Output } from '@angular/core';
import {
  AbstractControl,
  FormsModule,
  ReactiveFormsModule,
  UntypedFormBuilder,
  UntypedFormGroup,
  ValidationErrors
} from '@angular/forms';
import {BackendService} from 'ngt-gui/core';import { MessageLogService } from 'src/app/services/message-log.service';
import {NotificationService, TypeNotificationEnum} from 'src/app/services/notification.service';
import { forkJoin } from 'rxjs';
import { viewTypes, IViewTypes, TYPE_RANGE } from '../field-view-types';
import { CommonModule } from '@angular/common';
import {SharedModule} from "../../../../../shared-module/shared.module";
import {NzSelectModule} from "ng-zorro-antd/select";
import {NzFormModule} from "ng-zorro-antd/form";
import {NzInputModule} from "ng-zorro-antd/input";
import {NzButtonModule} from "ng-zorro-antd/button";
import {NzTagModule} from "ng-zorro-antd/tag";
import {NzSpinModule} from "ng-zorro-antd/spin";
import {NzModalModule} from "ng-zorro-antd/modal";

@Component({
    selector: 'app-field-modal-create',
    imports: [
        CommonModule,
        SharedModule,
        NzSelectModule,
        NzFormModule,
        NzInputModule,
        NzButtonModule,
        NzTagModule,
        FormsModule,
        ReactiveFormsModule,
        NzSpinModule,
        NzModalModule,
    ],
    templateUrl: './field-modal-create.component.html',
    styleUrls: ['./field-modal-create.component.sass']
})
export class FieldModalCreateComponent implements OnInit {

  loading = false;
  showModal = false;
  formGroup: UntypedFormGroup;
  typeRange;
  typeRangeOptions = TYPE_RANGE;
  @Output() createSuccessEvent = new EventEmitter<any>();

  objectTypesOptions = [];
  props = [];

  viewTypeOptions = viewTypes;

  constructor(
    private readonly fb: UntypedFormBuilder,
    private readonly backendService: BackendService,
    private readonly messageLogService: MessageLogService,
    private readonly notificationService: NotificationService,
  ) { }

  ngOnInit(): void {
    this.formGroup = this.fb.group({
      name: [''],
      object_type: [[]],
      template_id: [[]],
      view_type: [null],
      multiple: [false],
      range: [{}],
      standard: [''],
      unique: [false],
    }, {
      validators: [
        this.nameValidator.bind(this),
        this.viewTypeValidator.bind(this),
        this.objectTypeValidator.bind(this),
        this.rangeValidator.bind(this),
      ]
    });
    this.formGroup.get('view_type').valueChanges.subscribe(async (newValue) => {
      this.typeRange = null;
      if (newValue && newValue != '') {
        const viewTypeOption = this.viewTypeOptions.find((value) => {
          return value.value === newValue;
        });
        if (viewTypeOption) this.viewTypeValueChage(viewTypeOption);
      }
    });
  }

  viewTypeValueChage(viewType: IViewTypes) {
    switch(viewType.typeRange) {
      case this.typeRangeOptions.TEXT_OPTIONS:
        this.formGroup.get('range').setValue({
          options: [],
        });
        break;
    }
    this.typeRange = !viewType.typeRange ?  null : viewType.typeRange;
  }

  async openModal(): Promise<void> {
    this.clearForm();
    this.loading = true;
    try {
      const observables = {
        objectTypes: this.backendService.getObjectTypes(),
        templates: this.backendService.getAnnotationsTemplates(),
      };
      const response: any = await forkJoin(observables).toPromise();
      this.objectTypesOptions = response.objectTypes.content;
      this.props = response.templates.content;
      this.showModal = true;
    } catch (e) {
      this.showModal = false;
    }
    this.loading = false;
  }

  async createField(): Promise<void> {
    this.loading = true;
    const value = {
      name: this.formGroup.get('name').value,
      unique: this.formGroup.get('unique').value,
      standard: this.formGroup.get('standard').value,
      object_type: this.formGroup.get('object_type').value,
      template_id: this.formGroup.get('template_id').value,
      view_type: this.formGroup.get('view_type').value,
      multiple: this.getMultipleValue(),
      range: this.getRangeValue(),
    };
    try {
      const response: any = await this.backendService.postAnnotationField(value).toPromise();
      this.clearForm();
      this.createSuccessEvent.emit();
      this.messageLogService.addIssues(response.issues);
    } catch (e) {
      await this.notificationService.createNotificationWithType(TypeNotificationEnum.error, 'ANNOTATIONS.FIELDS.CREATE_MODAL.ERROR_UNKNOWN_ERROR.TITLE', 'ANNOTATIONS.FIELDS.CREATE_MODAL.ERROR_UNKNOWN_ERROR.CONTENT', 'bottomRight');
      this.loading = false;
    }
  }

  async cancelModal(): Promise<void> {
    this.showModal = false;
    this.loading = false;
  }

  clearForm() {
    this.formGroup.get('name').setValue('');
    this.formGroup.get('unique').setValue(false);
    this.formGroup.get('standard').setValue('');
    this.formGroup.get('object_type').setValue([]);
    this.formGroup.get('view_type').setValue(null);
    this.formGroup.get('multiple').setValue(false);
    this.formGroup.get('template_id').setValue([]);
    this.formGroup.get('range').setValue({});
  }

  getMultipleValue(): boolean {
    const viewType = this.formGroup.get('view_type').value;
    if (!viewType) {
      return false;
    }
    const viewTypeOption = this.viewTypeOptions.find((value) => {
      return value.value === viewType;
    });
    if (!viewTypeOption) {
      return false;
    }
    return this.formGroup.get('multiple').value;
  }

  showMultipleInput(): boolean {
    const viewType = this.formGroup.get('view_type').value;
    if (!viewType) {
      return false;
    }
    const viewTypeOption = this.viewTypeOptions.find((value) => {
      return value.value === viewType;
    });
    if (!viewTypeOption) {
      return false;
    }
    return viewTypeOption.canMultiple;
  }

  getRangeValue() {
    if (!this.typeRange) {
      return {
        multiple: this.getMultipleValue(),
      };
    }
    const range = this.formGroup.get('range').value;
    range.multiple = this.getMultipleValue();
    return range;
  }

  // Name
  private nameValidator(control: AbstractControl): ValidationErrors | null {
    let error = false;
    let emptyError = false;
    const name = control.get('name').value;
    if (!name || name === '') {
      error = true;
      emptyError = true;
    }
    return error ? {
      nameError: {
        empty: emptyError,
      }
    } : null;
  }

  showNameError(): boolean {
    if (!this.formGroup.errors || !this.formGroup.errors.nameError) {
      return false;
    }
    return true;
  }

  getMessageNameError(): string[] {
    const message = [];
    if (!this.formGroup.errors || !this.formGroup.errors.nameError) {
      return null;
    }
    if (this.formGroup.errors.nameError.empty) {
      message.push('ANNOTATIONS.FIELDS.CREATE_MODAL.NAME_INPUT.ERROR_EMPTY');
    }
    return message;
  }

  // View type
  private viewTypeValidator(control: AbstractControl): ValidationErrors | null {
    let error = false;
    let emptyError = false;
    const viewTYpe = control.get('view_type').value;
    if (!viewTYpe || viewTYpe === '') {
      error = true;
      emptyError = true;
    }
    return error ? {
      view_type: {
        empty: emptyError,
      }
    } : null;
  }

  showViewTypeError(): boolean {
    if (!this.formGroup.errors || !this.formGroup.errors.view_type) {
      return false;
    }
    return true;
  }

  getMessageViewTypeError(): string[] {
    const message = [];
    if (!this.formGroup.errors || !this.formGroup.errors.view_type) {
      return null;
    }
    if (this.formGroup.errors.view_type.empty) {
      message.push('ANNOTATIONS.FIELDS.CREATE_MODAL.VIEW_TYPE_INPUT.ERROR_EMPTY');
    }
    return message;
  }

  // Object type
  private objectTypeValidator(control: AbstractControl): ValidationErrors | null {
    let error = false;
    let emptyError = false;
    const objectType = control.get('object_type').value;
    if (!objectType || objectType.length === 0) {
      error = true;
      emptyError = true;
    }
    return error ? {
      object_type: {
        empty: emptyError,
      }
    } : null;
  }

  showObjectTypeError(): boolean {
    if (!this.formGroup.errors || !this.formGroup.errors.object_type) {
      return false;
    }
    return true;
  }

  getMessageObjectTypeError(): string[] {
    const message = [];
    if (!this.formGroup.errors || !this.formGroup.errors.object_type) {
      return null;
    }
    if (this.formGroup.errors.object_type.empty) {
      message.push('ANNOTATIONS.FIELDS.CREATE_MODAL.OBJECT_TYPE_INPUT.ERROR_EMPTY');
    }
    return message;
  }

  //Range
  getRangeControlValue() {
    return this.formGroup.get('range').value.options;
  }

  keyEnterTextOptionsRange(event) {
    const input = event.target
    const value = input.value;
    if (value && value !== '') {
      const controlRange = this.formGroup.get('range');
      controlRange.setValue({
        options: [...controlRange.value.options, value],
      });
      input.value = '';
    }
  }

  removeTextOptionsRange(index) {
    const controlRange = this.formGroup.get('range');
    const newArray = [...controlRange.value.options];
    newArray.splice(index, 1);
    controlRange.setValue({
      options: newArray,
    });
  }

  rangeValidator(control: AbstractControl): ValidationErrors | null {
    if (!this.typeRange) {
      return null;
    }
    switch (this.typeRange) {
      case this.typeRangeOptions.TEXT_OPTIONS:
        return this.rangeTextOptionsValidator(control);
    }
    return null;
  }

  rangeTextOptionsValidator(control: AbstractControl): ValidationErrors | null {
    const range = control.get('range').value;
    let error = false;
    let emptyError = false;
    if (!range || !range.options || range.options.length === 0) {
      error = true;
      emptyError = true;
    }
    return error ? {
      range: {
        empty: emptyError,
      }
    } : null;
  }

  showRangeError(): boolean {
    if (!this.formGroup.errors || !this.formGroup.errors.range) {
      return false;
    }
    return true;
  }

  getMessageRangeError(): string[] {
    const message = [];
    if (!this.formGroup.errors || !this.formGroup.errors.range) {
      return null;
    }
    switch(this.typeRange) {
      case this.typeRangeOptions.TEXT_OPTIONS:
        if (this.formGroup.errors.range.empty) {
          message.push('ANNOTATIONS.FIELDS.CREATE_MODAL.RANGE_INPUT.TEXT_OPTIONS.ERROR_EMPTY');
        }
        break;
    }
    return message;
  }
}

