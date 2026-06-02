import {Component, EventEmitter, OnInit, Output} from '@angular/core';
import {CommonModule} from '@angular/common';
import {NzButtonModule} from "ng-zorro-antd/button";
import {NzFormModule} from "ng-zorro-antd/form";
import {NzInputModule} from "ng-zorro-antd/input";
import {NzModalModule} from "ng-zorro-antd/modal";
import {
  AbstractControl, FormsModule,
  ReactiveFormsModule,
  UntypedFormBuilder,
  UntypedFormGroup,
  ValidationErrors
} from "@angular/forms";
import {SharedModule} from "../../../../shared-module/shared.module";
import {NzSpinModule} from "ng-zorro-antd/spin";
import {ModalInfoService} from "../../../../services/modal-info.service";
import {GlobalService} from "ngt-gui/core";
import {lastValueFrom} from "rxjs";
import {BackendService} from 'ngt-gui/core';
import {NzSelectModule} from "ng-zorro-antd/select";

@Component({
    selector: 'app-compute-resources-modal-create',
    imports: [
        CommonModule,
        SharedModule,
        NzSpinModule,
        NzModalModule,
        NzButtonModule,
        NzInputModule,
        NzFormModule,
        FormsModule,
        ReactiveFormsModule,
        NzSelectModule,
    ],
    templateUrl: './compute-resources-modal-create.component.html',
    styleUrls: ['./compute-resources-modal-create.component.sass']
})
export class ComputeResourcesModalCreateComponent implements OnInit {

  loading = false;
  showModal = false;
  formGroup: UntypedFormGroup;
  jmTypesOptions: any[] = [];

  @Output() createSuccessEvent = new EventEmitter();

  constructor(
    private readonly fb: UntypedFormBuilder,
    private readonly modalInfo: ModalInfoService,
    private readonly globalService: GlobalService,
    private readonly backendService: BackendService,
  ) {
  }


  ngOnInit(): void {
    this.formGroup = this.fb.group({
      name: [''],
      jm_type: [null],
      jm_location: [''],
      jm_credentials: [''],
      jm_params: [''],
      agreement: ['']
    }, {
      validators: [
        this.nameValidator.bind(this),
        this.jmTypeValidator.bind(this),
        this.locationValidator.bind(this),
        this.paramsValidator.bind(this),
        this.agreementValidator.bind(this),
        this.credentialsValidator.bind(this),
      ]
    });
  }

  async openModal(): Promise<void> {
    this.resetForm();
    this.showModal = true;
    this.loading = true;
    try {
      const responseJmTypes: any = await lastValueFrom(this.backendService.getJmTypes());
      this.jmTypesOptions = responseJmTypes.content;
    } catch (e) {
      this.loading = false;
      this.cancelModal();
      this.modalInfo.showModalInfoDefaultError(e);
    }
    this.loading = false;
  }

  cancelModal(): void {
    this.showModal = false;
    this.resetForm();
  }

  resetForm(): void {
    this.formGroup.get('name').setValue('');
    this.formGroup.get('jm_type').setValue(null);
    this.formGroup.get('jm_location').setValue('');
    this.formGroup.get('jm_credentials').setValue('');
    this.formGroup.get('jm_params').setValue('');
    this.formGroup.get('agreement').setValue('');
  }

  async createComputeResource(): Promise<void> {
    this.loading = true;
    try {
      const value = {
        name: this.formGroup.get('name').value,
        jm_type: this.formGroup.get('jm_type').value,
        jm_location: this.formGroup.get('jm_location').value === '' ? null : this.globalService.convertToJson(this.formGroup.get('jm_location').value),
        jm_credentials: this.formGroup.get('jm_credentials').value === '' ? null : this.globalService.convertToJson(this.formGroup.get('jm_credentials').value),
        jm_params: this.formGroup.get('jm_params').value === '' ? null : this.globalService.convertToJson(this.formGroup.get('jm_params').value),
        agreement: this.formGroup.get('agreement').value === '' ? null : this.globalService.convertToJson(this.formGroup.get('agreement').value),
      };
      const response = await lastValueFrom(this.backendService.postResources(value));
      this.cancelModal();
      this.createSuccessEvent.emit();
    } catch (e) {
      this.modalInfo.showModalInfoDefaultError(e);
    }
    this.loading = false;
  }

  private nameValidator(control: AbstractControl): ValidationErrors | null {
    let error = false;
    let emptyError = false;
    const name = control.get('name').value;
    if (!name || name == "") {
      error = true;
      emptyError = true;
    }
    return error ? {
      nameError: {
        empty: emptyError,
      }
    } : null;
  }

  getMessageNameError(): string[] {
    let message = [];
    if (!this.formGroup.errors || !this.formGroup.errors.nameError)  {
      return message;
    }
    if (this.formGroup.errors.nameError.empty) {
      message.push('PROCESSES_ADMIN.COMPUTE_RESOURCES.CREATE_MODAL.INPUTS.NAME.EMPTY_ERROR');
    }
    return message;
  }

  jmTypeValidator(control: AbstractControl): ValidationErrors | null {
    let error = false;
    let emptyError = false;
    const jm_type = control.get('jm_type').value;
    if (!jm_type) {
      error = true;
      emptyError = true;
    }
    return error ? {
      jm_typeError: {
        empty: emptyError,
      }
    } : null;
  }

  getMessageJmTypeError(): string[] {
    let message = [];
    if (!this.formGroup.errors || !this.formGroup.errors.jm_typeError)  {
      return message;
    }
    if (this.formGroup.errors.jm_typeError.empty) {
      message.push('PROCESSES_ADMIN.COMPUTE_RESOURCES.CREATE_MODAL.INPUTS.JM_TYPE.EMPTY_ERROR');
    }
    return message;
  }

  private locationValidator(control: AbstractControl): ValidationErrors | null {
    let error = false;
    let jsonError = false;
    const location = control.get('jm_location').value;
    if (location && location !== '' && !this.globalService.convertToJson(location)) {
      error = true;
      jsonError = true;
    }
    return error ? {
      locationError: {
        json: jsonError,
      }
    } : null;
  }

  getMessageLocationError(): string[] {
    let message = [];
    if (!this.formGroup.errors || !this.formGroup.errors.locationError)  {
      return message;
    }
    if (this.formGroup.errors.locationError.json) {
      message.push('PROCESSES_ADMIN.COMPUTE_RESOURCES.CREATE_MODAL.INPUTS.LOCATION.JSON_ERROR');
    }
    return message;
  }

  private credentialsValidator(control: AbstractControl): ValidationErrors | null {
    let error = false;
    let jsonError = false;
    const credentials = control.get('jm_credentials').value;
    if (credentials && credentials !== '' && !this.globalService.convertToJson(credentials)) {
      error = true;
      jsonError = true;
    }
    return error ? {
      credentialsError: {
        json: jsonError,
      }
    } : null;
  }

  getMessageCredentialsError(): string[] {
    let message = [];
    if (!this.formGroup.errors || !this.formGroup.errors.credentialsError)  {
      return message;
    }
    if (this.formGroup.errors.credentialsError.json) {
      message.push('PROCESSES_ADMIN.COMPUTE_RESOURCES.CREATE_MODAL.INPUTS.CREDENTIALS.JSON_ERROR');
    }
    return message;
  }

  private paramsValidator(control: AbstractControl): ValidationErrors | null {
    let error = false;
    let jsonError = false;
    const params = control.get('jm_params').value;
    if (params && params !== '' && !this.globalService.convertToJson(params)) {
      error = true;
      jsonError = true;
    }
    return error ? {
      paramsError: {
        json: jsonError,
      }
    } : null;
  }

  getMessageParamsError(): string[] {
    let message = [];
    if (!this.formGroup.errors || !this.formGroup.errors.paramsError)  {
      return message;
    }
    if (this.formGroup.errors.paramsError.json) {
      message.push('PROCESSES_ADMIN.COMPUTE_RESOURCES.CREATE_MODAL.INPUTS.PARAMS.JSON_ERROR');
    }
    return message;
  }

  private agreementValidator(control: AbstractControl): ValidationErrors | null {
    let error = false;
    let jsonError = false;
    const agreement = control.get('agreement').value;
    if (agreement && agreement !== '' && !this.globalService.convertToJson(agreement)) {
      error = true;
      jsonError = true;
    }
    return error ? {
      agreementError: {
        json: jsonError,
      }
    } : null;
  }

  getMessageAgreementError(): string[] {
    let message = [];
    if (!this.formGroup.errors || !this.formGroup.errors.agreementError)  {
      return message;
    }
    if (this.formGroup.errors.agreementError.json) {
      message.push('PROCESSES_ADMIN.COMPUTE_RESOURCES.CREATE_MODAL.INPUTS.AGREEMENT.JSON_ERROR');
    }
    return message;
  }

}
