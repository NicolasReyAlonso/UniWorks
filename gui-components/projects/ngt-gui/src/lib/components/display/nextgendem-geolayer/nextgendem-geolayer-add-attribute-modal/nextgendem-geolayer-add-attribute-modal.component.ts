import {AfterViewInit, Component, EventEmitter, Output, ViewEncapsulation} from '@angular/core';
import {BackendService} from 'ngt-gui/core';import {lastValueFrom} from "rxjs";
import {MessageLogService} from "../../../../services/message-log.service";
import {ModalInfoService} from "../../../../services/modal-info.service";

@Component({
    encapsulation: ViewEncapsulation.None,
    selector: 'app-nextgendem-geolayer-add-attribute-modal',
    templateUrl: './nextgendem-geolayer-add-attribute-modal.component.html',
    styleUrls: ['./nextgendem-geolayer-add-attribute-modal.component.sass'],
    standalone: false
})
export class NextgendemGeolayerAddAttributeModalComponent implements AfterViewInit {

  isVisible = false
  loading = false
  pageIndexLayers = 1
  pageTotalLayers = 0
  layerSearchInput = ""
  readonly PAGE_SIZE = 10.0
  propertiesSelected = []
  layers = []
  layerIdSelected
  layerItemSelected
  properties = []
  initCheckbox = false
  uuidLayerFilter: string[] = null
  uuidLayerFilterActive = false
  attributesActives = []
  singleMode = false

  @Output() accept = new EventEmitter<any[]>()

  constructor(
    private readonly backendService: BackendService,
    private readonly modalInfo: ModalInfoService,
    private readonly msgService: MessageLogService
  ) {
  }

  ngAfterViewInit() {
  }

  async openModal(): Promise<void> {
    this.uuidLayerFilter && (this.uuidLayerFilterActive = true)
    this.isVisible = true
    this.resetLayers()
    this.loading = true
    this.resetModal()
    try {
      await this.loadLayers()
    } catch (e) {
      await this.onCancel()
    }
    this.loading = false
  }

  resetModal() {
    this.pageIndexLayers = 1
    this.resetLayers()
  }

  async loadLayers(): Promise<void> {
    const params = {
      pagination: {
        pageIndex: this.pageIndexLayers,
        pageSize: this.PAGE_SIZE
      },
      searchValue: this.layerSearchInput,
      filter: {}
    }
    this.uuidLayerFilterActive && this.uuidLayerFilter && (params.filter['uuid'] = this.uuidLayerFilter)
    const request = this.backendService.getLayerGIS(null, params)
    try {
      const response: any = await lastValueFrom(request)
      this.layers = response.content
      if (this.singleMode) {
        this.onLayerClick(this.layers[0])
      }
      this.pageTotalLayers = response.count
      this.msgService.addResponseIssues(response)
    } catch (e) {
      this.pageTotalLayers = 0
      this.pageIndexLayers = 1
      this.layers = []
      this.modalInfo.showModalInfoDefaultError(e)
      this.msgService.addResponseIssues(e)
      throw new Error('loadLayers Error')
    }
  }


  async onCancel(): Promise<void> {
    this.isVisible = false
    this.resetLayers()
  }

  async onSearchLayer(): Promise<void> {
    this.pageIndexLayers = 1
    this.resetLayers()
    this.loading = true
    await this.loadLayers()
    this.loading = false
  }

  resetLayers() {
    this.pageTotalLayers = 0
    this.layerIdSelected = null
    this.layerItemSelected = null
    this.propertiesSelected = []
    this.properties = []
  }

  async onLayerClick(item) {
    this.propertiesSelected = []
    if (this.layerIdSelected === item.id) {
      this.layerIdSelected = null;
      this.layerItemSelected = null
      this.properties = []
      return
    }
    this.layerIdSelected = item.id;
    this.layerItemSelected = item
    this.properties = this.layerItemSelected.properties.filter( element => {
      return element.representable
    })
    this.properties.forEach(element => {
      element.id = `${this.layerIdSelected}$${element.name}`
      element.layer = this.layerItemSelected
      element.layerName = element.layer.name
    })
  }

  async onPageIndexChangeLayers(event): Promise<void> {
    this.pageIndexLayers = event
    this.resetLayers()
    this.loading = true
    await this.loadLayers()
    this.loading = false
  }


  checkProperty(event, item) {
    if (event) {
      this.propertiesSelected.push(item)
    } else {
      let itemIndex = -1
      this.propertiesSelected.find( (element, index) => {
        if (element.id === item.id) {
          itemIndex = index
          return true
        }
      })
      if (itemIndex > -1) {
        this.propertiesSelected.splice(itemIndex, 1)
      }
    }
  }

  onAccept() {
    this.accept.emit(this.propertiesSelected)
    this.onCancel()
  }

  async uuidLayerFilterActiveChange(event): Promise<void> {
    this.pageIndexLayers = 1
    this.resetLayers()
    this.loading = true
    await this.loadLayers()
    this.loading = false
  }

  checkIfExistProperty(property) {
    const isPropertyExist = this.attributesActives.find(element => {
      return property.id === element.id
    })
    return !!isPropertyExist
  }
}
