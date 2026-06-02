import {Component, EventEmitter, inject, OnDestroy, OnInit, Output} from '@angular/core'
import {CommonModule} from '@angular/common'
import {NzModalModule} from "ng-zorro-antd/modal"
import {
  AbstractControl,
  FormBuilder,
  FormsModule,
  ReactiveFormsModule,
  UntypedFormGroup,
  ValidationErrors
} from "@angular/forms"
import {NzSpinModule} from "ng-zorro-antd/spin"
import {NzFormModule} from "ng-zorro-antd/form"
import {NzInputModule} from "ng-zorro-antd/input"
import {NzButtonModule} from "ng-zorro-antd/button"
import {SharedModule} from "../../../../shared-module/shared.module"
import {lastValueFrom, Subscription} from "rxjs";
import {ModalInfoService} from "@services/modal-info.service";
import {BackendService} from 'ngt-gui/core';import {NzSelectModule} from "ng-zorro-antd/select";
import {
  PROCESSES_TYPES_GEOPROCESS_TYPE_OPTIONS,
  PROCESSES_TYPES_GEOPROCESS_TYPE_VALUES,
  PROCESSES_TYPES_KERNEL_OPTIONS, PROCESSES_TYPES_KERNEL_VALUES,
  PROCESSES_TYPES_SYSTEM_OPTIONS,
  PROCESSES_TYPES_SYSTEM_VALUES
} from "@constants/processes-types.contants";

@Component({
    selector: 'app-processes-types-modal-create',
    imports: [
        NzSpinModule,
        FormsModule,
        ReactiveFormsModule,
        NzFormModule,
        NzButtonModule,
        NzInputModule,
        NzModalModule,
        SharedModule,
        CommonModule,
        NzSelectModule,
    ],
    templateUrl: './processes-types-modal-create.component.html',
    styleUrls: ['./processes-types-modal-create.component.sass']
})
export class ProcessesTypesModalCreateComponent implements OnInit, OnDestroy {

  private readonly fb = inject(FormBuilder)
  private readonly modalInfoService = inject(ModalInfoService)
  private readonly backendService = inject(BackendService)

  private formSubscriptions: Subscription[]

  loading = false
  showModal = false
  formGroup: UntypedFormGroup
  systemOptions = [...PROCESSES_TYPES_SYSTEM_OPTIONS]
  systemValues = {...PROCESSES_TYPES_SYSTEM_VALUES}
  kernelOptions = [...PROCESSES_TYPES_KERNEL_OPTIONS]
  geoprocessTypeOptions = [...PROCESSES_TYPES_GEOPROCESS_TYPE_OPTIONS]

  @Output() createSuccessEvent = new EventEmitter();


  ngOnInit(): void {
    this.initForm()
    this.createFormsSubscriptions()
  }

  ngOnDestroy() {
    this.formSubscriptions.forEach((element) => {
      element.unsubscribe()
    })
  }

  initForm() {
    this.formGroup = this.fb.group({
      name: [''],
      description: [''],
      kernel: [null],
      geoprocess_type: [null],
      system: [PROCESSES_TYPES_SYSTEM_VALUES.JUPYTER],
    }, {
      validators: [
        this.nameValidator.bind(this),
      ]
    })
  }

  createFormsSubscriptions() {
    this.formSubscriptions = [
      this.formGroup.get('system').valueChanges.subscribe((value) => {
        this.formGroup.get('kernel').setValue(null)
        this.formGroup.get('geoprocess_type').setValue(null)
        if (value == PROCESSES_TYPES_SYSTEM_VALUES.JUPYTER) {
          this.formGroup.get('kernel').setValue(PROCESSES_TYPES_KERNEL_VALUES.PYTHON)
          return
        }
        if (value == PROCESSES_TYPES_SYSTEM_VALUES.GEOPROCESS) {
          this.formGroup.get('geoprocess_type').setValue(PROCESSES_TYPES_GEOPROCESS_TYPE_VALUES.POSTGIS)
          return
        }
      })
    ]
  }

  resetForm(): void {
    this.formGroup.get('name').setValue('')
    this.formGroup.get('description').setValue('')
    this.formGroup.get('system').setValue(PROCESSES_TYPES_SYSTEM_VALUES.JUPYTER)
  }

  async createItemModal(): Promise<void> {
    this.loading = true;
    try {
      const value = {
        name: this.formGroup.get('name').value,
        description: this.formGroup.get('description').value,
        execution: {
          kernel: this.formGroup.get('kernel').value,
          system: this.formGroup.get('system').value,
          geoprocess_type: this.formGroup.get('geoprocess_type').value,
        }
      };
      const response = await lastValueFrom(this.backendService.postProcesses(value));
      this.cancelModal();
      this.createSuccessEvent.emit();
    } catch (e) {
      this.modalInfoService.showModalInfoDefaultError(e);
    }
    this.loading = false;
  }

  cancelModal(): void {
    this.showModal = false
    this.resetForm()
  }

  async openModal(): Promise<void> {
    this.resetForm()
    this.showModal = true
  }

  private nameValidator(control: AbstractControl): ValidationErrors | null {
    let error = false
    let emptyError = false
    const name = control.get('name').value
    if (!name || name == "") {
      error = true
      emptyError = true
    }
    return error ? {
      nameError: {
        empty: emptyError,
      }
    } : null
  }

  getMessageNameError(): string[] {
    let message = []
    if (!this.formGroup.errors || !this.formGroup.errors.nameError) {
      return message
    }
    if (this.formGroup.errors.nameError.empty) {
      message.push('PROCESSES_ADMIN.PROCESS_TYPES.CREATE_MODAL.INPUTS.NAME.EMPTY_ERROR')
    }
    return message
  }

}
