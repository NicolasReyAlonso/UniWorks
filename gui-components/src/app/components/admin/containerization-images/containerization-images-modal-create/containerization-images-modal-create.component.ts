import {Component, EventEmitter, inject, OnInit, Output} from '@angular/core';
import {
  AbstractControl,
  FormGroup,
  NonNullableFormBuilder,
  ReactiveFormsModule, ValidationErrors,
} from "@angular/forms";
import {CommonModule} from "@angular/common";
import {NzModalModule} from "ng-zorro-antd/modal";
import {NzButtonModule} from "ng-zorro-antd/button";
import {NzFormModule} from "ng-zorro-antd/form";
import {NzGridModule} from "ng-zorro-antd/grid";
import {NzInputModule} from "ng-zorro-antd/input";
import {NzSelectModule} from "ng-zorro-antd/select";
import {NzSpinModule} from "ng-zorro-antd/spin";
import {TranslateModule} from "@ngx-translate/core";
import {BackendService} from 'ngt-gui/core';import {ContainerizationImageItem} from "@models/containerization-images.model";
import {ModalInfoService} from "@services/modal-info.service";

interface FieldInterface {
  type: string,
  defaultValue: any,
  prefixTranslateKey: string,
  validators?: ((control: AbstractControl) => ValidationErrors)[]
}

@Component({
    imports: [
        CommonModule,
        NzModalModule,
        NzButtonModule,
        NzFormModule,
        NzGridModule,
        NzInputModule,
        NzSelectModule,
        NzSpinModule,
        ReactiveFormsModule,
        TranslateModule
    ],
    selector: 'app-containerization-images-modal-create',
    templateUrl: './containerization-images-modal-create.component.html',
    styleUrls: ['./containerization-images-modal-create.component.sass']
})
export class ContainerizationImagesModalCreateComponent implements OnInit {

  @Output() createSuccess = new EventEmitter<void>()

  private readonly _fb: NonNullableFormBuilder = inject(NonNullableFormBuilder)
  private readonly _backendService = inject(BackendService)
  private readonly _modalInfoService = inject(ModalInfoService)

  protected fieldsArray: {key: string, value: FieldInterface}[] = []
  protected readonly fields: { [key: string]: FieldInterface } = {
    name: {
      type: 'input-text',
      defaultValue: '',
      prefixTranslateKey: 'PROCESSES_ADMIN.CONTAINERIZATION_IMAGES.CREATE_MODAL.INPUTS.NAME',
      validators: [this.emptyValidator]
    },
    imageType: {
      type: 'input-text',
      defaultValue: 'singularity',
      prefixTranslateKey: 'PROCESSES_ADMIN.CONTAINERIZATION_IMAGES.CREATE_MODAL.INPUTS.IMAGE_TYPE',
      validators: [this.emptyValidator]
    },
    location: {
      type: 'input-text',
      defaultValue: '',
      prefixTranslateKey: 'PROCESSES_ADMIN.CONTAINERIZATION_IMAGES.CREATE_MODAL.INPUTS.LOCATION',
    },
    recipe: {
      type: 'input-text',
      defaultValue: '{}',
      prefixTranslateKey: 'PROCESSES_ADMIN.CONTAINERIZATION_IMAGES.CREATE_MODAL.INPUTS.RECIPE',
      validators: [this.jsonValidator]
    }
  }

  protected formGroup: FormGroup
  protected loading: boolean = false
  protected showModal: boolean = false

  ngOnInit(): void {
    this.convertFields2Array()
    this.initFormGroup()
  }

  private convertFields2Array(): void {
    this.fieldsArray = Object.entries(this.fields).map(([key, value]) => ({key, value}))
  }

  private initFormGroup(): void {
    const formControls = {}
    for (const [key, value] of Object.entries(this.fields)) {
      formControls[key] = [value.defaultValue, value.validators]
    }
    this.formGroup = this._fb.group(formControls)
  }

  private resetForm(): void {
    this.formGroup.reset({}, {emitEvent: false})
  }

  public async openModal(): Promise<void> {
    this.resetForm()
    this.showModal = true
  }

  protected cancelModal(): void {
    this.resetForm()
    this.showModal = false
  }

  protected createItemModal(): void {
    if (!this.formGroup.valid) return

    const bodyRequest: Partial<ContainerizationImageItem> = {
      name: this.formGroup.get('name').value,
      image_type: this.formGroup.get('imageType').value,
      location: this.formGroup.get('location').value,
      recipe: this.formGroup.get('recipe').value,
    }

    const postRequest = this._backendService.postContainerizationImage(bodyRequest).subscribe({
      next: () => {
        this.createSuccess.next()
        postRequest.unsubscribe()
        this.cancelModal()
      },
      error: (error) => {
        this._modalInfoService.showModalInfoDefaultError(error)
        postRequest.unsubscribe()
        this.cancelModal()
      }
    })
  }

  private emptyValidator(control: AbstractControl): { [key: string]: any } {
    const value = control.value
    if (!value || value === '') {
      return { EMPTY_ERROR: true }
    }
    return null
  }

  private jsonValidator (control: AbstractControl): { [key: string]: any } {
    const value = control.value as string
    try {
      JSON.parse(value)
    } catch (e) {
      if (e instanceof SyntaxError) {
        return { JSON_ERROR: true }
      }
    }

    return null
  }

}
