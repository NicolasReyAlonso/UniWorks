import {Component, EventEmitter, OnInit, Output} from '@angular/core';
import {
  AbstractControl,
  FormsModule,
  ReactiveFormsModule,
  UntypedFormBuilder,
  UntypedFormGroup,
  ValidationErrors
} from '@angular/forms';
import {BackendService} from 'ngt-gui/core';import {MessageLogService} from 'src/app/services/message-log.service';
import {NotificationService, TypeNotificationEnum} from 'src/app/services/notification.service';
import { forkJoin } from 'rxjs';
import { CommonModule } from '@angular/common';
import {SharedModule} from "../../../../../shared-module/shared.module";
import {NzButtonModule} from "ng-zorro-antd/button";
import {NzInputModule} from "ng-zorro-antd/input";
import {NzSelectModule} from "ng-zorro-antd/select";
import {NzFormModule} from "ng-zorro-antd/form";
import {NzSpinModule} from "ng-zorro-antd/spin";
import {NzModalModule} from "ng-zorro-antd/modal";

@Component({
    selector: 'app-template-modal-create',
    imports: [
        CommonModule,
        SharedModule,
        NzButtonModule,
        NzInputModule,
        NzSelectModule,
        NzFormModule,
        FormsModule,
        ReactiveFormsModule,
        NzSpinModule,
        NzModalModule,
    ],
    templateUrl: './template-modal-create.component.html',
    styleUrls: ['./template-modal-create.component.sass']
})
export class TemplateModalCreateComponent implements OnInit {

  loading = false;
  showModal = false;
  formGroup: UntypedFormGroup;
  @Output() createSuccessEvent = new EventEmitter<any>();

  objectTypesOptions = [];
  fieldsOptions = [];

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
      field_id: [[]],
      standard: [''],
      unique: [false],
    }, {
      validators: [
        this.nameValidator,
        this.objectTypeValidator
      ]
    });
  }

  async openModal(): Promise<void> {
    this.clearForm();
    this.loading = true;
    try {
      const observables = {
        objectTypes: this.backendService.getObjectTypes(),
        fieldsOptions: this.backendService.getAnnotationField(),
      };
      const response: any  = await forkJoin(observables).toPromise();
      this.objectTypesOptions = response.objectTypes.content;
      this.fieldsOptions = response.fieldsOptions.content;
      console.log(response);
      this.showModal = true;
    } catch (e) {
      this.showModal = false;
    }
    this.loading = false;
  }

  async createTemplate(): Promise<void> {
    this.loading = true;
    const value = {
      name: this.formGroup.get('name').value,
      unique: this.formGroup.get('unique').value,
      standard: this.formGroup.get('standard').value,
      object_type: this.formGroup.get('object_type').value,
      field_id: this.formGroup.get('field_id').value,
    };
    try {
      await this.backendService.postAnnotationTemplates(value).toPromise();
      this.clearForm();
      this.createSuccessEvent.emit();
    } catch (e) {
      await this.notificationService.createNotificationWithType(TypeNotificationEnum.error, 'ANNOTATIONS.TEMPLATES.CREATE_MODAL.ERROR_UNKNOWN_ERROR.TITLE', 'ANNOTATIONS.TEMPLATES.CREATE_MODAL.ERROR_UNKNOWN_ERROR.CONTENT', 'bottomRight');
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
    this.formGroup.get('field_id').setValue([]);
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
      message.push('ANNOTATIONS.TEMPLATES.CREATE_MODAL.NAME_INPUT.ERROR_EMPTY');
    }
    return message;
  }

  // Object type
  private objectTypeValidator(control: AbstractControl): ValidationErrors | null {
    let error = false;
    let emptyError = false;
    const objectType = control.get('object_type').value;
    if (!objectType || objectType.length === 0 ) {
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
      message.push('ANNOTATIONS.TEMPLATES.CREATE_MODAL.OBJECT_TYPE_INPUT.ERROR_EMPTY');
    }
    return message;
  }

}
