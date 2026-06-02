import {
  AfterViewInit,
  Component,
  EventEmitter,
  Input,
  OnInit,
  Output,
  ViewChild,
  ViewEncapsulation
} from '@angular/core';
import {lastValueFrom} from "rxjs";
import {BackendService} from 'ngt-gui/core';import {NextgendemGeolayerMapComponent} from "../nextgendem-geolayer-map/nextgendem-geolayer-map.component";
import {
  INextgendemGeoLayerModalMapSettingsFormValue,
  NextgendemGeolayerMapSettingsComponent
} from "../nextgendem-geolayer-map-settings/nextgendem-geolayer-map-settings.component";
import {
  NextgendemGeolayerAddAttributeModalComponent
} from "../nextgendem-geolayer-add-attribute-modal/nextgendem-geolayer-add-attribute-modal.component";
import {
  NextgendemGeolayerConfigurationPanelComponent
} from "../nextgendem-geolayer-configuration-panel/nextgendem-geolayer-configuration-panel.component";
import {MessageLogService} from "../../../../services/message-log.service";
import {ModalInfoService} from "../../../../services/modal-info.service";

@Component({
    encapsulation: ViewEncapsulation.None,
    selector: 'app-nextgendem-geolayer',
    templateUrl: './nextgendem-geolayer.component.html',
    styleUrls: ['./nextgendem-geolayer.component.sass'],
    standalone: false
})
export class NextgendemGeolayerComponent implements AfterViewInit, OnInit {

  externalLoading = false
  geolayerLoading = false
  styles: { [key: string]: boolean } = {}
  whereClickMapInfo = 'window'

  // Nextgendem Geolayer Map
  @ViewChild(NextgendemGeolayerMapComponent) nextgendemGeolayerMapComponent: NextgendemGeolayerMapComponent;

  // Modal Map Settings
  @ViewChild(NextgendemGeolayerMapSettingsComponent) nextgendemGeolayerMapSettingsComponent: NextgendemGeolayerMapSettingsComponent
  isVisibleMapSettings = false

  // Modal Add Attribute
  @ViewChild(NextgendemGeolayerAddAttributeModalComponent) nextgendemGeolayerAddAttributeModalComponent: NextgendemGeolayerAddAttributeModalComponent

  // Configuration Panel
  @ViewChild(NextgendemGeolayerConfigurationPanelComponent) nextgendemGeolayerConfigurationPanelComponent: NextgendemGeolayerConfigurationPanelComponent

  // Resize
  private endResizeContainerListener
  private dragResizeContainerListener
  private posMouseResizeEvent = 0
  private gridFlex = 330

  @Output('createMap') createMapEmitter = new EventEmitter<any>()

  @Input('singleMode') singleMode = false

  constructor(
    private readonly backendService: BackendService,
    private readonly messageLogService: MessageLogService,
    private readonly modalInfoService: ModalInfoService,
  ) {
  }

  ngOnInit() {
  }

  ngAfterViewInit() {

  }

  afterViewInitStartMap(): void {
    this.initialize().then()
  }

  async initialize(): Promise<void> {
    if (this.singleMode) {
      this.nextgendemGeolayerConfigurationPanelComponent.singleMode = true
    }
    const crsList = await this.getCrsList();
    await this.getLayersStyles()
    this.nextgendemGeolayerMapSettingsComponent.projectionsMap = crsList;
    await this.nextgendemGeolayerMapComponent.createMapController({crsList})
  }

  async getCrsList() {
    const crsRequest = this.backendService.getHierarchyNodes(null, {hierarchy_id: 3})
    const crsResponse: any = await lastValueFrom(crsRequest);
    const crsList = [];
    crsResponse.content.forEach((crs) => {
      if (crs.name && crs.attributes && crs.attributes.code && crs.attributes.proj4) {
        crsList.push(crs);
      }
    })
    return crsList;
  }

  async getLayersStyles() {
    const stylesRequest = this.backendService.getLayersStyles()
    const styleResponse: any = await lastValueFrom(stylesRequest)
    this.styles = styleResponse.content
    this.nextgendemGeolayerConfigurationPanelComponent.colorMapsList = this.styles
  }

  async onAcceptMapSettings(event: INextgendemGeoLayerModalMapSettingsFormValue): Promise<void> {
    this.isVisibleMapSettings = false;
    await this.nextgendemGeolayerMapComponent.changeBaseLayer(event.baseLayer, event.baseLayerType);
    this.nextgendemGeolayerMapComponent.mapController.changeProjectionViewer(event.projection);
  }


  // Resize
  getFlexGrid(): string {
    if (this.nextgendemGeolayerMapComponent?.mapController) {
      this.nextgendemGeolayerMapComponent?.mapController.getMap().updateSize();
    }
    return `${this.gridFlex}px`;
  }

  private resizeContainer(event): void {
    event.preventDefault()
    const posDifference = this.posMouseResizeEvent - event.clientX
    this.posMouseResizeEvent = event.clientX;
    let newGridFlex = this.gridFlex + posDifference;
    if (newGridFlex <= 330 && posDifference < 0) {
      newGridFlex = 330;
    }
    if (newGridFlex >= 460 && posDifference > 0) {
      newGridFlex = 460;
    }
    this.gridFlex = newGridFlex;
    if (this.nextgendemGeolayerMapComponent?.mapController) {
      this.nextgendemGeolayerMapComponent.mapController.getMap().updateSize();
    }
  }

  private destroyReziseEvent(): void {
    document.body.style.cursor = 'default'
    document.removeEventListener('mouseup', this.endResizeContainerListener)
    document.removeEventListener('mousemove', this.dragResizeContainerListener)
    this.endResizeContainerListener = null
    this.dragResizeContainerListener = null
  }

  mouseDownResize(event: MouseEvent): void {
    event.preventDefault()
    this.posMouseResizeEvent = event.clientX
    document.body.style.cursor = 'ew-resize'

    this.endResizeContainerListener = this.destroyReziseEvent.bind(this)
    document.addEventListener('mouseup', this.endResizeContainerListener)

    this.dragResizeContainerListener = this.resizeContainer.bind(this)
    document.addEventListener('mousemove', this.dragResizeContainerListener)
  }

  async openModalMapSettings(): Promise<void> {
    this.nextgendemGeolayerMapSettingsComponent.formGroup.get('baseLayer').setValue(this.nextgendemGeolayerMapComponent.baseLayerUrl)
    this.nextgendemGeolayerMapSettingsComponent.formGroup.get('baseLayerType').setValue(this.nextgendemGeolayerMapComponent.baseLayerType)
    this.nextgendemGeolayerMapSettingsComponent.formGroup.get('projection').setValue(this.nextgendemGeolayerMapComponent.mapController.projectionView)
    this.nextgendemGeolayerMapSettingsComponent.openModal()
  }

  async openModalAddProperty(): Promise<void> {
    this.nextgendemGeolayerAddAttributeModalComponent.singleMode = this.singleMode
    this.nextgendemGeolayerAddAttributeModalComponent.attributesActives = [...this.nextgendemGeolayerConfigurationPanelComponent.attributes]
    this.nextgendemGeolayerAddAttributeModalComponent.openModal()
  }

  async onAcceptAddAttributeModal(event: any[]) {
    const configurationPanel = this.nextgendemGeolayerConfigurationPanelComponent
    const newItems = await configurationPanel.addPropertiesInPanel(event);
    [...newItems.values()].forEach(element => {
      configurationPanel.onCheckProperty(true, element)
      console.log(element)
      configurationPanel.showLegend(element, true)
    })
  }

  createLayerByProperty(property) {
    let cql = null
    if (property.filterSelected) {
      const layer = this.nextgendemGeolayerConfigurationPanelComponent.layersData[property.id.split('$')[0]]
      cql = layer.filters[property.filterSelected]?.cql
    }
    return {
      key: property.id,
      opacity: property.opacity,
      filters: [],
      wms_url: property.layer.wms_url,
      wks: property.layer.wks,
      geoserver_name: property.layer.geoserver_name,
      style: property.style?.style_name,
      ZIndex: property.ZIndex + 10,
      layerName: property.layerName,
      cql: !cql || cql === '' ? null : cql,
    }
  }

  checkProperty(property: any) {
    if (property.checkbox) {
      const layer = this.createLayerByProperty(property)
      this.nextgendemGeolayerMapComponent.mapController.addLayerGeoserver(layer)
      if (property.legend) {
        this.nextgendemGeolayerMapComponent.addLegend(property)
      }
    } else {
      this.nextgendemGeolayerMapComponent.mapController.removeLayerGeoserver({key: property.id})
      this.nextgendemGeolayerMapComponent.removeLegend(property)
    }
  }

  attributesZIndexChange(attributes: any[]) {
    attributes.forEach(element => {
      this.nextgendemGeolayerMapComponent.mapController.changeZIndexActiveMap(element.id, element.ZIndex)
    })
  }

  changeOpacityProperty(item) {
    this.nextgendemGeolayerMapComponent.mapController.changeOpacityActiveMap(item.id, item.opacity)
  }

  removeAttribute(property: any) {
    this.nextgendemGeolayerMapComponent.mapController.removeLayerGeoserver({key: property.id})
    delete this.nextgendemGeolayerMapComponent.legends[property.id]
  }

  showLegendProperty(property) {
    if (property.legend) {
      this.nextgendemGeolayerMapComponent.addLegend(property)
    } else {
      this.nextgendemGeolayerMapComponent.removeLegend(property)
    }
  }

  changeFilterSelectedProperty(property): void {
    this.resetLayerByProperty(property)
  }

  changeFilterCQLayer(event) {
    const layerKeysNeedRefresh = []
    this.nextgendemGeolayerMapComponent.mapController.activeLayers.forEach((value, key) => {
      const layerKey = key.split('$')[0];
      if (event.layerSelectedKey == layerKey) {
        layerKeysNeedRefresh.push(key)
      }
    })
    layerKeysNeedRefresh.forEach(key => {
      const property = this.nextgendemGeolayerConfigurationPanelComponent.attributes.find(element => {
        return element.id == key
      })
      if (property) {
        this.nextgendemGeolayerMapComponent.mapController.removeLayerGeoserver({key: property.id})
        const layer = this.createLayerByProperty(property)
        this.nextgendemGeolayerMapComponent.mapController.addLayerGeoserver(layer)
      }
    })
  }

  removeFilterLayer(event) {
    this.nextgendemGeolayerConfigurationPanelComponent.attributes.forEach(property => {
      property.filterSelected = property.filterSelected == event.filterKey ? null : property.filterSelected
      this.nextgendemGeolayerMapComponent.mapController.removeLayerGeoserver({key: property.id})
      const layer = this.createLayerByProperty(property)
      this.nextgendemGeolayerMapComponent.mapController.addLayerGeoserver(layer)
    })
  }

  editStyleProperty(property) {
    this.resetLayerByProperty(property)
    if (property.checkbox && property.legend) {
      property.legend = false
      this.showLegendProperty(property)
      property.legend = true
      this.showLegendProperty(property)
    }
    if (this.nextgendemGeolayerConfigurationPanelComponent.idMap)
    this.nextgendemGeolayerConfigurationPanelComponent.overwriteMap()
  }

  resetLayerByProperty(property) {
    const activeLayer = this.nextgendemGeolayerMapComponent.mapController.activeLayers.get(property.id)?.layer
    if (activeLayer) {
      this.nextgendemGeolayerMapComponent.mapController.removeLayerGeoserver({key: property.id})
      const layer = this.createLayerByProperty(property)
      this.nextgendemGeolayerMapComponent.mapController.addLayerGeoserver(layer)
    }
  }

  async createMap(event): Promise<void> {
    this.geolayerLoading = true
    this.nextgendemGeolayerConfigurationPanelComponent.attributes.forEach(property => {
      this.resetLayerByProperty(property)
    })
    const newViewz = this.serializeData()
    try {
      const response: any = await lastValueFrom(this.backendService.postView({
        name: event.name,
        type: 'nextgendem-geolayer',
        data: newViewz
      }))
      const content = response.content
      this.nextgendemGeolayerConfigurationPanelComponent.idMap = content.id
      this.nextgendemGeolayerConfigurationPanelComponent.nameMap = content.name
      this.messageLogService.addResponseIssues(response)
      this.createMapEmitter.emit({
        idMap: content.id,
        name: content.name
      })
    } catch (e) {
      this.messageLogService.addResponseIssues(e)
      this.modalInfoService.showModalInfoDefaultError(e)
    }
    this.geolayerLoading = false
  }

  async overwriteMap(event): Promise<void> {
    this.geolayerLoading = true
    try {
      this.nextgendemGeolayerConfigurationPanelComponent.attributes.forEach(property => {
        this.resetLayerByProperty(property)
      })
      const serializeData = this.serializeData()
      const response: any = await lastValueFrom(this.backendService.putView(event.idMap, {
        name: event.name,
        type: 'nextgendem-geolayer',
        data: serializeData
      }))
      this.messageLogService.addResponseIssues(response)
    } catch (e) {
      this.messageLogService.addResponseIssues(e)
      this.modalInfoService.showModalInfoDefaultError(e)
    }
    this.geolayerLoading = false
  }

  serializeData(): any {
    return {
      map: {
        center: this.nextgendemGeolayerMapComponent.mapController.getMap().getView().getCenter(),
        zoom: this.nextgendemGeolayerMapComponent.mapController.getMap().getView().getZoom(),
        rotation: this.nextgendemGeolayerMapComponent.mapController.getMap().getView().getRotation(),
        projection: this.nextgendemGeolayerMapComponent.mapController.projectionView,
        baseLayerType: this.nextgendemGeolayerMapComponent.baseLayerType,
        baseLayerUrl: this.nextgendemGeolayerMapComponent.baseLayerUrl
      },
      nextAttributeZIndex: this.nextgendemGeolayerConfigurationPanelComponent.nextAttributeZIndex,
      attributes: this.nextgendemGeolayerConfigurationPanelComponent.attributes.map(element => {
        const copyElement = {...element}
        delete copyElement.layer
        return copyElement
      }),
      layersData: Object.keys(this.nextgendemGeolayerConfigurationPanelComponent.layersData).reduce((result, key) => {
        result[key] = {}
        result[key].filters = this.nextgendemGeolayerConfigurationPanelComponent.layersData[key].filters
        return result
      }, {})
    }
  }

  async deserialize(data): Promise<void> {
    try {
      this.deserializeMap(data)
      await this.deserializeLayers(data)
      this.deserializeAttributes(data)
      this.initializeMapForDeserialize()
    } catch (e) {
      this.modalInfoService.showModalInfoDefaultError(e)
      this.messageLogService.addResponseIssues(e)
    }
  }

  deserializeMap(data) {
    data.map?.projection && (this.nextgendemGeolayerMapComponent.mapController.changeProjectionViewer(data.map.projection))
    data.map?.zoom && this.nextgendemGeolayerMapComponent.getView().setZoom(data.map.zoom)
    data.map?.center && this.nextgendemGeolayerMapComponent.getView().setCenter(data.map.center)
    data.map?.rotation && this.nextgendemGeolayerMapComponent.getView().setRotation(data.map.rotation)
    data.map?.baseLayerType && (this.nextgendemGeolayerMapComponent.baseLayerType = data.map.baseLayerType)
    data.map?.baseLayerUrl && (this.nextgendemGeolayerMapComponent.baseLayerUrl = data.map.baseLayerUrl)
    data.map?.baseLayerType && data.map?.baseLayerUrl && (this.nextgendemGeolayerMapComponent.changeBaseLayer(
      this.nextgendemGeolayerMapComponent.baseLayerUrl,
      this.nextgendemGeolayerMapComponent.baseLayerType,
    ))
  }

  async deserializeLayers(data) {
    this.nextgendemGeolayerConfigurationPanelComponent.layersData = {}
    if (data.layersData && Object.keys(data.layersData).length > 0) {
      const filterLayers = {
        id: {
          op: 'in',
          unary: Object.keys(data.layersData)
        }
      }
      const requestLayers = this.backendService.getLayerGIS(null, {filter: filterLayers})
      const response: any = await lastValueFrom(requestLayers)
      const content: any[] = response.content
      const layersResponseParse = content.reduce((result, element) => {
        result[element.id] = element
        return result
      }, {})
      const newLayersData = {...data.layersData}
      Object.keys(data.layersData).forEach(key => {
        layersResponseParse[key] ? (newLayersData[key].layer = layersResponseParse[key]) : (delete newLayersData[key])
      })
      this.nextgendemGeolayerConfigurationPanelComponent.layersData = newLayersData
    }
  }

  deserializeAttributes(data) {
    this.nextgendemGeolayerConfigurationPanelComponent.attributes = []
    if (data.attributes && data.attributes.length > 0) {
      const newAttributes = [...data.attributes]
      data.attributes.forEach((element, index) => {
        const idLayer = element.id.split('$')[0]
        const layersData = this.nextgendemGeolayerConfigurationPanelComponent.layersData
        if (layersData[idLayer]) {
          newAttributes[index].layer = layersData[idLayer].layer
          newAttributes[index].layerName = layersData[idLayer].layer.name
        } else {
          newAttributes.splice(index, 1)
        }
      })
      this.nextgendemGeolayerConfigurationPanelComponent.attributes = newAttributes
    }
  }

  initializeMapForDeserialize() {
    const attributes = this.nextgendemGeolayerConfigurationPanelComponent.attributes
    attributes.forEach(element => {
      this.checkProperty(element)
    })
  }

  clickMapEvent(event) {
    const panelWindow = this.nextgendemGeolayerConfigurationPanelComponent.nextgendemGeolayerConfigurationPanelWindowComponent
    if (event.whereClickMapInfo === 'window') {
      panelWindow.isVisibleInfoTab = true
      panelWindow.selectedIndex = 1
      if (event.status === 'start') {
        panelWindow.loadigClickInfoMap = true
      } else {
        panelWindow.loadigClickInfoMap = false
        panelWindow.clickInfoMap = event.infoMap
        panelWindow.selectedLayerClickMapInfo = panelWindow.clickInfoMap ? panelWindow.clickInfoMap[0].layerId : null
        panelWindow.selectedLayerClickMapInfoObject = panelWindow.clickInfoMap ? panelWindow.clickInfoMap[0] : null
      }
    }
  }

  whereClickMapInfoChange(event) {
    const panelWindow = this.nextgendemGeolayerConfigurationPanelComponent.nextgendemGeolayerConfigurationPanelWindowComponent
    if (event === 'window') {
      this.nextgendemGeolayerMapComponent.closeOverlayOpenLayerClick()
      panelWindow.isVisibleInfoTab = true
      panelWindow.selectedIndex = 1
      panelWindow.clickInfoMap = this.nextgendemGeolayerMapComponent.clickInfoMap
      panelWindow.selectedLayerClickMapInfo = panelWindow.clickInfoMap ? panelWindow.clickInfoMap[0].layerId : null
      panelWindow.selectedLayerClickMapInfoObject = panelWindow.clickInfoMap ? panelWindow.clickInfoMap[0] : null
    } else if (event === 'overlay') {
      panelWindow.isVisibleInfoTab = false
      const overlay = this.nextgendemGeolayerMapComponent.mapController.overlayOpenLayerClick
      overlay.setPosition(this.nextgendemGeolayerMapComponent.lastClickCoordinate);
      overlay.setOffset([-(overlay.getElement().clientWidth / 2), -this.nextgendemGeolayerMapComponent.heightOverlayOpenLayerClick]);
    }
  }


}
