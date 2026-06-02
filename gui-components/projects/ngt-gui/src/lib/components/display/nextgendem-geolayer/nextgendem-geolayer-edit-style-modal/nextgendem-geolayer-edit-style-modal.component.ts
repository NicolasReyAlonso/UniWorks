import {Component, EventEmitter, Input, OnInit, Output} from '@angular/core';
import {FormBuilder, FormGroup} from "@angular/forms";
import {BackendService} from 'ngt-gui/core';import {ModalInfoService} from "../../../../services/modal-info.service";
import {lastValueFrom} from "rxjs";
import {MessageLogService} from "../../../../services/message-log.service";

export interface IEditStylePropertyEditValue {
  idProperty: any,
  colormap: string
}

@Component({
    selector: 'app-nextgendem-geolayer-edit-style-modal',
    templateUrl: './nextgendem-geolayer-edit-style-modal.component.html',
    styleUrls: ['./nextgendem-geolayer-edit-style-modal.component.sass'],
    standalone: false
})
export class NextgendemGeolayerEditStyleModalComponent implements OnInit {

  styles;
  isVisible = false
  idProperty
  idLayer
  dataType = ''
  styleName = ''
  propertyName = ''
  formGroup: FormGroup
  colorMapsList = {}
  loading = false

  @Output('editStyleProperty') editStylePropertyEmitter = new EventEmitter<IEditStylePropertyEditValue>()

  constructor(
    private readonly fb: FormBuilder,
    private readonly backendService: BackendService,
    private readonly modalInfoService: ModalInfoService,
    private readonly messageLogService: MessageLogService,
  ) { }

  ngOnInit() {
    this.formGroup = this.fb.group({
      colormap: ['']
    })
  }

  openModal(property: any) {
    this.isVisible = true
    console.log(property)
    this.idProperty = property.id
    this.dataType = property.data_type
    this.styleName = property.style.style_name
    this.propertyName = property.name
    this.idLayer = property.layer.id
    this.initFormByProperty(property)
  }

  initFormByProperty(property) {
    this.formGroup.get('colormap').setValue(property.style.colormap)
  }

  async onAcceptButtonClick(): Promise<void> {
    if (this.loading) return
    this.loading = true
    try {
      const response: any = await lastValueFrom(this.backendService.postGeoStyle({
        layer_id: this.idLayer,
        property: this.propertyName,
        style_name: this.styleName,
        colormap: this.formGroup.get('colormap').value
      }))
      this.messageLogService.addResponseIssues(response)
      this.editStylePropertyEmitter.emit({
        idProperty: this.idProperty,
        colormap: this.formGroup.get('colormap').value
      })
    } catch (e) {
      console.log(e)
      this.messageLogService.addResponseIssues(e)
      this.modalInfoService.showModalInfoDefaultError(e)
    }
    this.isVisible = false
    this.loading = false
  }

  onCancelButtonClick() {
    if (this.loading) return
    this.isVisible = false
  }

}
