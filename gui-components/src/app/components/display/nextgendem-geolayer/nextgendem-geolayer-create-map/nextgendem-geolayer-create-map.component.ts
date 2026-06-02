import {Component, EventEmitter, OnInit, Output} from '@angular/core';
import {AbstractControl, FormBuilder, FormGroup, ValidationErrors} from "@angular/forms";
import {BackendService} from 'ngt-gui/core';import {ModalInfoService} from "../../../../services/modal-info.service";


export interface ICreateMapEvent {
  name: string
}

@Component({
    selector: 'app-nextgendem-geolayer-create-map',
    templateUrl: './nextgendem-geolayer-create-map.component.html',
    styleUrls: ['./nextgendem-geolayer-create-map.component.sass'],
    standalone: false
})
export class NextgendemGeolayerCreateMapComponent implements OnInit {

  isVisibleCreateModal = false
  isVisibleOverwriteModal = false
  formGroupCreateModal: FormGroup;
  isLoadingCreateModal = false
  nameMap = ''

  @Output('createMap') createMapEmitter = new EventEmitter<ICreateMapEvent>()
  @Output('overwrite') overwriteEmitter = new EventEmitter<null>()

  constructor(
    private readonly fb: FormBuilder,
    private readonly modalInfoService: ModalInfoService
  ) {
  }

  ngOnInit() {
    this.formGroupCreateModal = this.fb.group({
      name: ['']
    }, {
      validators:  [
        this.nameValidator.bind(this)
      ]
    })
  }

  openModal(existMap: boolean): void {
    if (!existMap) {
      this.openCreateModal()
    } else {
      this.openOverwriteModal()
    }
  }

  openOverwriteModal() {
    this.modalInfoService.showModalInfo(
      'DISPLAY.GIS.OVERWRITE_MAP_MODAL.TITLE',
      'DISPLAY.GIS.OVERWRITE_MAP_MODAL.CONTENT',
      {name: this.nameMap},
      'question-circle',
      'twotone',
      this.modalInfoService.colorWarningDefault,
      [
        {
          text: 'DISPLAY.GIS.OVERWRITE_MAP_MODAL.OVERWRITE_BUTTON',
          type: 'primary',
          onClickFunc: this.overwriteClick.bind(this)
        },
        {
          text: 'DISPLAY.GIS.OVERWRITE_MAP_MODAL.CREATE_BUTTON',
          onClickFunc: () => {
            this.modalInfoService.isVisibleModalInfo = false
            this.openCreateModal()
          }
        },
        {
          text: 'DISPLAY.GIS.OVERWRITE_MAP_MODAL.CANCEL_BUTTON',
          type: 'primary',
          danger: true,
          onClickFunc: () => {
            this.modalInfoService.isVisibleModalInfo = false
          }
        }
      ]
    )
  }

  overwriteClick() {
    this.overwriteEmitter.emit()
    this.modalInfoService.isVisibleModalInfo = false
  }

  openCreateModal(): void {
    this.resetFormCreateModal()
    this.isVisibleCreateModal = true
  }

  resetFormCreateModal(): void {
    this.formGroupCreateModal.get('name').setValue('')
  }

  closeCreateModal(): void {
    if (this.isLoadingCreateModal) return
    this.isVisibleCreateModal = false
  }

  async onSaveMap(): Promise<void> {
    if (this.isLoadingCreateModal || this.formGroupCreateModal.errors) return
    this.isVisibleCreateModal = false
    this.createMapEmitter.emit({
      name: this.formGroupCreateModal.get('name').value
    })
  }

  // Validators

  private nameValidator(control: AbstractControl): ValidationErrors | null {
    let error: any = {}
    const name = control.get('name').value
    if (!name || name === '') {
      error.empty = true
    }
    return Object.keys(error).length > 0 ? {
      nameError: error
    } : null
  }

  getMessageNameError(): string[] {
    let messages: string[] = []
    if (!this.formGroupCreateModal.errors || !this.formGroupCreateModal.errors.nameError) return messages
    if (this.formGroupCreateModal.errors.nameError.empty) {
      messages.push('DISPLAY.GIS.SAVE_MAP_MODAL.NAME_EMPTY_ERROR')
    }
    return messages
  }

}
