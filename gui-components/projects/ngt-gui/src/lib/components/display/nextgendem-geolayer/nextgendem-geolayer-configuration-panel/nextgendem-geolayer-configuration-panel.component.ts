import {Component, EventEmitter, Output, ViewChild} from '@angular/core';
import {
  NextgendemGeolayerConfigurationPanelWindowComponent
} from "../nextgendem-geolayer-configuration-panel-window/nextgendem-geolayer-configuration-panel-window.component";
import {BackendService} from 'ngt-gui/core';
import {forkJoin, lastValueFrom} from "rxjs";
import {AuthService} from "ngt-gui/core";
import {
  IEditStylePropertyEditValue,
  NextgendemGeolayerEditStyleModalComponent
} from "../nextgendem-geolayer-edit-style-modal/nextgendem-geolayer-edit-style-modal.component";
import {
  ICreateMapEvent,
  NextgendemGeolayerCreateMapComponent
} from "../nextgendem-geolayer-create-map/nextgendem-geolayer-create-map.component";
import {MessageLogService} from "../../../../services/message-log.service";
import {ModalInfoService} from "../../../../services/modal-info.service";
import {v4 as uuidv4} from 'uuid';

@Component({
    selector: 'app-nextgendem-geolayer-configuration-panel',
    templateUrl: './nextgendem-geolayer-configuration-panel.component.html',
    styleUrls: ['./nextgendem-geolayer-configuration-panel.component.sass'],
    standalone: false
})
export class NextgendemGeolayerConfigurationPanelComponent {

  attributes = []
  nextAttributeZIndex = 1
  openSettingsPropertySelected;
  layersData: any = {}
  idMap;
  nameMap = ''
  colorMapsList = {}
  singleMode = false

  @Output() attributesChange = new EventEmitter<any[]>()
  @Output() openModalMapSettings = new EventEmitter<null>()
  @Output() openModalAddProperty = new EventEmitter<null>()
  @Output() attributesZIndexChange = new EventEmitter<any[]>()
  @Output('checkProperty') checkPropertyEmitter = new EventEmitter<{ property: any }>()
  @Output('changeOpacityProperty') changeOpacityPropertyEmitter = new EventEmitter<any>()
  @Output('changeFilterSelectedProperty') changeFilterSelectedPropertyEmitter = new EventEmitter<any>()
  @Output('changeFilterCQLayer') changeFilterCQLayerEmitter = new EventEmitter<any>()
  @Output('removeFilterLayer') removeFilterLayerEmitter = new EventEmitter<any>()
  @Output('showLegendProperty') showLegendPropertyEmitter = new EventEmitter<any>()
  @Output('removeAttribute') removeAttributeEmitter = new EventEmitter<any>()
  @Output('editStyleProperty') editStylePropertyEmitter = new EventEmitter<any>()
  @Output('geolayerLoading') geolayerLoading = new EventEmitter<boolean>()
  @Output('createMap') createMapEmitter = new EventEmitter<any>()
  @Output('overwriteMap') overwriteMapEmitter = new EventEmitter<any>()
  @Output('changeWhereClickMapInfo') changeWhereClickMapInfoEmitter = new EventEmitter<string>()

  @ViewChild(NextgendemGeolayerConfigurationPanelWindowComponent) nextgendemGeolayerConfigurationPanelWindowComponent: NextgendemGeolayerConfigurationPanelWindowComponent
  @ViewChild(NextgendemGeolayerEditStyleModalComponent) nextgendemGeolayerEditStyleModalComponent: NextgendemGeolayerEditStyleModalComponent
  @ViewChild(NextgendemGeolayerCreateMapComponent) nextgendemGeolayerCreateMapComponent: NextgendemGeolayerCreateMapComponent

  constructor(
    private readonly backendService: BackendService,
    private readonly authService: AuthService,
    private readonly messageLogService: MessageLogService,
    private readonly modalInfoService: ModalInfoService,
  ) {
  }

  onAddAPropertyButtonClick() {
    this.openModalAddProperty.emit()
  }

  async addPropertiesInPanel(elements: any[]) {
    this.geolayerLoading.emit(true)
    const newItems = new Map<string, any>()
    try {
      const styleRequests: any = {}
      for (let item of elements.reverse()) {
        const itemFound = this.attributes.find(element => {
          return (item.id === element.id)
        })
        if (!itemFound) {
          const idLayer = item.id.split('$')[0]
          item.opacity = 70
          item.checkbox = false
          item.filterSelected = null
          item.legend = false
          item.ZIndex = this.nextAttributeZIndex
          item.style = {
            layer_id: idLayer,
            property: item.name,
            colormap: ''
          }
          if (!this.idMap) {
            const session: any = await lastValueFrom(this.backendService.getSession())
            item.style.style_name = `${idLayer}_${item.name}_${session.identity_id}`
          } else {
            item.style.map_id = uuidv4()
          }
          item.style.colormap = item.colormap;
          styleRequests[item.id] = this.backendService.postGeoStyle(item.style)
          this.nextAttributeZIndex++
          newItems.set(item.id, item)
          if (!this.layersData[idLayer]) {
            this.layersData[idLayer] = {
              filters: {},
              layer: item.layer
            }
          }
        }
      }
      if (Object.keys(styleRequests).length > 0) {
        const responseStyles = await lastValueFrom(forkJoin(styleRequests))
        Object.keys(responseStyles).forEach(key => {
          const item = newItems.get(key)
          item.style.style_name = responseStyles[key].content.style_name
        })
      }
      this.attributes = [...newItems.values(), ...this.attributes]
    } catch (e) {
      console.log(e)
    }
    this.geolayerLoading.emit(false)
    return newItems
  }

  dropAttribute(event) {
    if (event.previousIndex === event.currentIndex) return
    let attributesChangesZIndex = []
    if (event.previousIndex < event.currentIndex) {
      for (let i = event.previousIndex; i < event.currentIndex; i++) {
        const auxElement = this.attributes[i]
        const auxZIndex = this.attributes[i].ZIndex
        this.attributes[i].ZIndex = this.attributes[i + 1].ZIndex
        this.attributes[i + 1].ZIndex = auxZIndex
        this.attributes[i] = this.attributes[i + 1]
        this.attributes[i + 1] = auxElement
        attributesChangesZIndex.push(this.attributes[i])
      }
    } else {
      for (let i = event.previousIndex; i > event.currentIndex; i--) {
        const auxElement = this.attributes[i]
        const auxZIndex = this.attributes[i].ZIndex
        this.attributes[i].ZIndex = this.attributes[i - 1].ZIndex
        this.attributes[i - 1].ZIndex = auxZIndex
        this.attributes[i] = this.attributes[i - 1]
        this.attributes[i - 1] = auxElement
        attributesChangesZIndex.push(this.attributes[i])
      }
    }
    attributesChangesZIndex.push(this.attributes[event.currentIndex])
    this.attributesZIndexChange.emit(attributesChangesZIndex)
  }

  async onCheckProperty(event, property) {
    property.checkbox = event
    this.checkPropertyEmitter.emit(property)
  }

  changeOpacity(item, event) {
    item.opacity = event
    this.changeOpacityPropertyEmitter.emit(item)
  }

  changeFilterSelected(item, event) {
    item.filterSelected = event
    this.changeFilterSelectedPropertyEmitter.emit(item)
  }

  showLegend(item, event): void {
    item.legend = event
    this.showLegendPropertyEmitter.emit(item)
  }

  formatterOpacitySlider(value) {
    return `${value}%`;
  }

  removeAttribute(item) {
    let indexAttribute = -1
    const attributte = this.attributes.find((element, index) => {
      if (element.id === item.id) {
        indexAttribute = index
        return true
      }
    })
    if (indexAttribute > -1) {
      // Remove attribute
      this.attributes.splice(indexAttribute, 1)

      // Remove layer if required
      let needRemoveLayer = true
      const layerId = attributte.id.split('$')[0]
      this.attributes.find(element => {
        const auxLayerId = element.id.split('$')[0]
        if (layerId == auxLayerId) {
          needRemoveLayer = false
          return true
        }
      })
      if (needRemoveLayer) {
        delete this.layersData[layerId]
        const windowLayerSelected = this.nextgendemGeolayerConfigurationPanelWindowComponent.layerSelectedFilter
        if (windowLayerSelected == layerId) {
          this.nextgendemGeolayerConfigurationPanelWindowComponent.layerSelectedFilter = null
          this.nextgendemGeolayerConfigurationPanelWindowComponent.filterSelected = null
        }
      }

      // Remove attribute on map if it is rendered
      this.removeAttributeEmitter.emit(item)
    }
  }

  filterCQLChange(event) {
    this.changeFilterCQLayerEmitter.emit(event)
  }

  removeFilterLayer(event) {
    this.removeFilterLayerEmitter.emit(event)
  }

  openEditStyleProperty(property) {
    this.nextgendemGeolayerEditStyleModalComponent.colorMapsList = this.colorMapsList
    this.nextgendemGeolayerEditStyleModalComponent.openModal(property)
  }

  editStyleProperty(event: IEditStylePropertyEditValue) {
    const property = this.attributes.find(element => {
      return element.id == event.idProperty
    })
    if (property) {
      property.style.colormap = event.colormap
      this.editStylePropertyEmitter.emit(property)
    }
  }

  openCreateModalMap() {
    this.nextgendemGeolayerCreateMapComponent.nameMap = this.nameMap
    this.nextgendemGeolayerCreateMapComponent.openModal(this.idMap)
  }

  async overwriteMap(): Promise<void> {
    try {
      this.geolayerLoading.emit(true)
      await this.createStylesForNewMap()
      this.overwriteMapEmitter.emit({
        attributes: this.attributes,
        idMap: this.idMap,
        nameMap: this.nameMap
      })
    } catch (e) {
      this.messageLogService.addResponseIssues(e)
      this.modalInfoService.showModalInfoDefaultError(e)
    }
  }

  async createNewMap(event: ICreateMapEvent): Promise<void> {
    try {
      this.geolayerLoading.emit(true)
      await this.createStylesForNewMap()
      this.createMapEmitter.emit({
        attributes: this.attributes,
        name: event.name
      })
    } catch (e) {
      this.messageLogService.addResponseIssues(e)
      this.modalInfoService.showModalInfoDefaultError(e)
    }
  }

  async createStylesForNewMap() {
    const map_id_random = uuidv4()
    const requestsNewStyles = {}
    const attributesMap = new Map(this.attributes.map((element) => {
      const idLayer = element.id.split('$')[0]
      requestsNewStyles[element.id] = this.backendService.postGeoStyle({
        layer_id: idLayer,
        property: element.name,
        colormap: element.style.colormap,
        map_id: map_id_random
      })
      return [element.id, element]
    }))
    if (Object.keys(requestsNewStyles).length > 0) {
      const response: any = await lastValueFrom(forkJoin(requestsNewStyles))
      Object.keys(response).forEach(key => {
        const content = response[key].content
        attributesMap.get(key).style.style_name = content.style_name
      })
    }
  }

}
