import {Component, DestroyRef, EventEmitter, inject, Input, OnInit, Output} from '@angular/core';
import {CommonModule} from '@angular/common';
import {SharedModule} from "src/app/shared-module/shared.module";
import {
  AbstractControl,
  FormBuilder,
  ReactiveFormsModule,
  UntypedFormGroup,
  ValidationErrors
} from "@angular/forms";
import {NzFormModule} from "ng-zorro-antd/form";
import {NzInputModule} from "ng-zorro-antd/input";
import {NzSelectModule} from "ng-zorro-antd/select";
import {GetProcessResponse, GetProcessResponseContent} from "@models/process-types.model";
import {combineLatestWith, Observable} from "rxjs";
import {takeUntilDestroyed} from "@angular/core/rxjs-interop";
import {NzSpinModule} from "ng-zorro-antd/spin";
import {GetResourcesResponse} from "@models/resources.model";
import {
  PROCESSES_TYPES_GEOPROCESS_TYPE_OPTIONS, PROCESSES_TYPES_GEOPROCESS_TYPE_VALUES,
  PROCESSES_TYPES_KERNEL_OPTIONS, PROCESSES_TYPES_KERNEL_VALUES,
  PROCESSES_TYPES_SYSTEM_OPTIONS,
  PROCESSES_TYPES_SYSTEM_VALUES
} from "@constants/processes-types.contants";
import {ContainerizationImageItem} from "@models/containerization-images.model";

interface ProcessesTypeDetailGeneralTabForm {
  id: string,
  uuid: string,
  name: string,
  description: string,
  resources: number[],
  kernel: number | null,
  geoprocessType: number | null,
  system: number | null,
}

@Component({
    selector: 'app-processes-types-detail-general-tab',
    imports: [
        CommonModule,
        SharedModule,
        ReactiveFormsModule,
        NzFormModule,
        NzInputModule,
        NzSelectModule,
        NzSpinModule,
    ],
    templateUrl: './processes-types-detail-general-tab.component.html',
    styleUrls: ['./processes-types-detail-general-tab.component.sass']
})
export class ProcessesTypesDetailGeneralTabComponent implements OnInit {

  private readonly _fb = inject(FormBuilder)
  private readonly _destroyRef = inject(DestroyRef)

  @Input({required: true}) public resourcesOriginalData$: Observable<GetResourcesResponse | null>
  @Input({required: true}) public proccessOriginalData$: Observable<GetProcessResponse | null>
  @Input({required: true}) public selectedResourcesOriginalData$: Observable<number[] | null>
  @Input({required: true}) public isReadOnly$: Observable<boolean>
  @Input({required: true}) public loading$: Observable<boolean>
  @Input({required: true}) public imagesOriginalData$: Observable<ContainerizationImageItem[]>
  @Input({required: true}) public selectedImagesOriginalData$: Observable<number[]>

  @Output() public formChange: EventEmitter<void> = new EventEmitter()

  public formGroup: UntypedFormGroup
  protected systemOptions = [...PROCESSES_TYPES_SYSTEM_OPTIONS]
  protected systemValues = {...PROCESSES_TYPES_SYSTEM_VALUES}
  protected kernelOptions = [...PROCESSES_TYPES_KERNEL_OPTIONS]
  protected geoprocessTypeOptions = [...PROCESSES_TYPES_GEOPROCESS_TYPE_OPTIONS]

  ngOnInit() {
    this.initFormGroup()
    this.createSubscriptions()
  }

  private isReadOnlySubscription() {
    this.isReadOnly$.pipe(takeUntilDestroyed(this._destroyRef)).subscribe((value) => {
      for (const [key, control] of Object.entries(this.formGroup.controls)) {
        if (value) {
          control.disable({emitEvent: false})
          if (key === 'resources') control.enable({emitEvent: false})
        }
      }
    })
  }

  private createSubscriptions(): void {
    this.isReadOnlySubscription()
    this.originalDataSubscription()
  }

  private originalDataSubscription(): void {
    this.proccessOriginalData$.pipe(
      combineLatestWith(this.selectedResourcesOriginalData$, this.selectedImagesOriginalData$)
    ).subscribe(([proccessOriginalData, selectedResourcesOriginalData, selectedImagesOriginalData]) => {
      if (proccessOriginalData && selectedResourcesOriginalData) {
        this.applyProcessResponseContentInForm({responseContent: proccessOriginalData.content, resourcesSelected: selectedResourcesOriginalData, selectedImagesOriginalData})
      }
    })
  }

  private initFormGroup() {
    this.formGroup = this._fb.nonNullable.group({
      id: [{value: '', disabled: true}],
      uuid: [{value: '', disabled: true}] ,
      name: ['', [this.nameValidator.bind(this)]],
      description: [''],
      resources: [[]],
      images: [[]],
      kernel: [null],
      geoprocessType: [null],
      system: [null],
    })

    this.formGroup.valueChanges.pipe(takeUntilDestroyed(this._destroyRef)).subscribe((value) => {
      this.formChange.emit()
    })

    this.formGroup.get('system').valueChanges.pipe(takeUntilDestroyed(this._destroyRef)).subscribe(value => {
      this.formGroup.get('kernel').setValue(null)
      this.formGroup.get('geoprocessType').setValue(null)
      if (value == PROCESSES_TYPES_SYSTEM_VALUES.JUPYTER) {
        this.formGroup.get('kernel').setValue(PROCESSES_TYPES_KERNEL_VALUES.PYTHON)
        return
      }
      if (value == PROCESSES_TYPES_SYSTEM_VALUES.GEOPROCESS) {
        this.formGroup.get('geoprocessType').setValue(PROCESSES_TYPES_GEOPROCESS_TYPE_VALUES.POSTGIS)
        return
      }
    })
  }

  applyProcessResponseContentInForm(args: { responseContent: GetProcessResponseContent, resourcesSelected: any[], selectedImagesOriginalData: number[] }) {
    const responseContent = args.responseContent
    const newFormValue: any = {
      id: responseContent.id,
      uuid: responseContent.uuid,
      name: responseContent.name,
      description: responseContent.description,
      resources: args.resourcesSelected,
      images: args.selectedImagesOriginalData
    }
    if (responseContent.execution) {
      newFormValue.system = responseContent.execution.system
      newFormValue.geoprocessType = responseContent.execution.geoprocess_type
      newFormValue.kernel = responseContent.execution.kernel
    }
    this.formGroup.patchValue(newFormValue, {emitEvent: false})
  }

  private nameValidator(control: AbstractControl): ValidationErrors | null {
    if (control.disabled) {
      return null
    }
    let error = false;
    let errorMessages: string[] = [];
    const name = control.value;
    if (!name || name == "") {
      error = true;
      errorMessages.push('PROCESSES_ADMIN.PROCESS_TYPES.DETAIL.INPUTS.NAME.EMPTY_ERROR')
    }
    return error ? {
      nameError: {
        errorMessages,
      }
    } : null;
  }

}
