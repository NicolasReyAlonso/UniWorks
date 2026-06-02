import {AfterViewInit, Component, ElementRef, EventEmitter, Input, OnInit, Output, ViewChild} from '@angular/core';
import {lastValueFrom, Subject} from "rxjs";
import {BackendService} from 'ngt-gui/core';
import { GlobalService } from 'ngt-gui/core';
import {MapController} from "./map-controller";
import {NotificationService, TypeNotificationEnum} from "../../../../services/notification.service";

@Component({
    selector: 'app-nextgendem-geolayer-map',
    templateUrl: './nextgendem-geolayer-map.component.html',
    styleUrls: ['./nextgendem-geolayer-map.component.sass'],
    standalone: false
})
export class NextgendemGeolayerMapComponent implements OnInit, AfterViewInit {

  // Inputs
  @Input() whereClickMapInfo: string

  // Outputs
  @Output('afterViewInitStart') afterViewInitStart = new EventEmitter<null>()
  @Output('geolayerLoadingChange') geolayerLoadingChange = new EventEmitter<boolean>()
  @Output() whereClickMapInfoChange = new EventEmitter<string>()
  @Output('clickMapEvent') clickMapEventEmitter = new EventEmitter<any>()
  @Output('changeWhereClickMapInfo') changeWhereClickMapInfoEmitter = new EventEmitter<string>()

  // GeoViewerElementRef
  @ViewChild('geoViewer', {static: false}) geoViewerElementRef: ElementRef;

  // Overlays
  @ViewChild('overlayOpenLayerClick', {static: false}) overlayOpenLayerClickElement: ElementRef;
  readonly heightBodyOverlayOpenLayerClick = 330;
  readonly heightOverlayOpenLayerClick = this.heightBodyOverlayOpenLayerClick + 38 + 15;
  @ViewChild('overlayOpenLayerRightClick', {static: false}) overlayOpenLayerRightClickElement: ElementRef;

  // Click Map Event
  clickInfoMap: any;
  loadigClickInfoMap = false;
  lastClickCoordinate = null;

  mapController: MapController;
  mapControllerEvents = new Subject<{ type: string, value: any }>();
  baseLayerUrl = ''
  baseLayerType = 'default'
  baseLayerLabel = ''
  legends: any = {}

  constructor(
    private readonly backendService: BackendService,
    private readonly globalVariablesServices: GlobalService,
    private readonly notificationService: NotificationService,
  ) {
  }

  ngOnInit() {
    this.mapControllerEvents.subscribe((event) => {
      switch (event.type) {
        case 'getInfoClickMap':
          this.mapControllerGetInfoClickMapEvent(event.value);
          break;
      }
    });
  }

  ngAfterViewInit() {
    this.afterViewInitStart.emit()
  }

  async createMapController(parameters: { crsList?: any[] }) {
    this.mapController = new MapController(
      this.geoViewerElementRef,
      this.overlayOpenLayerClickElement,
      this.overlayOpenLayerRightClickElement,
      this.backendService,
      this.mapControllerEvents,
      this.globalVariablesServices,
      parameters.crsList,
    );
  }

  closeOverlayOpenLayerClick() {
    this.mapController.overlayOpenLayerClick.setPosition(null);
  }

  changeWhereClickMapInfo(value) {
    // switch (value) {
    //   case 'window':
    //     this.mapController.overlayOpenLayerClick.setPosition(null);
    //     this.whereClickMapInfo = value;
    //     break;
    //   case 'overlay':
    //     this.whereClickMapInfo = value;
    //     if (this.clickInfoMap != null) {
    //       this.mapController.overlayOpenLayerClick.setPosition(this.lastClickCoordinate);
    //     }
    //     break;
    // }
  }

  centerMapContextMenu(event): void {
    this.mapController.disableOverlaysMap();
    this.mapController.centerMap();
  }

  zoomInClickButton(event): void {
    this.mapController.incrementZoomMap(1);
  }

  zoomOutClickButton(event): void {
    this.mapController.incrementZoomMap(-1);
  }

  async zoomToExtend(event): Promise<void> {
    try {
      this.geolayerLoadingChange.emit(true)
      await this.mapController.zoomToExtend();
      this.geolayerLoadingChange.emit(false)
    } catch (err) {
      this.geolayerLoadingChange.emit(false)
      this.notificationService.createNotificationWithType(TypeNotificationEnum.error, 'Error', 'Ha ocurrido un error.', 'bottomRight');
    }
  }

  rotateNorthClickButton(event): void {
    this.mapController.rotationMap(0);
  }

  rotateRightClickButton(event): void {
    this.mapController.incrementRotationMap(1);
  }

  rotateLeftClickButton(event): void {
    this.mapController.incrementRotationMap(-1);
  }

  fullScreenClickButton(event): void {
    if (!this.isActiveFullScreen()) {
      const geoViewerElement = this.geoViewerElementRef.nativeElement;
      geoViewerElement.requestFullscreen();
    } else {
      if (document.exitFullscreen) {
        document.exitFullscreen();
      }
    }
  }

  isActiveFullScreen(): any {
    return document.fullscreenElement;
  }

  async changeBaseLayer(baseLayer, baseLayerType): Promise<void> {
    this.baseLayerType = baseLayerType;
    this.baseLayerLabel = '';
    switch (this.baseLayerType) {
      case 'custom':
        this.baseLayerUrl = baseLayer;
        this.baseLayerUrl = this.baseLayerUrl.trim();
        await this.changeBaseLayerOnMap();
        break;
      case 'default':
        if (typeof baseLayer === 'string') {
          if (baseLayer === '') {
            this.baseLayerUrl = baseLayer;
            await this.changeBaseLayerOnMap();
            break;
          } else {
            try {
              const response: any = await this.backendService.getHierarchyNodes(null, {hierarchy_id: 4}).toPromise();
              const content: any[] = response.content;
              const el = content.find((element) => {
                const url = element.name.split('-')[1].trim();
                return baseLayer.startsWith(url);
              });
              if (el) {
                this.baseLayerUrl = el.name.split('-')[1].trim();
                this.baseLayerLabel = el.name.split('-')[0].trim();
                await this.changeBaseLayerOnMap();
              }
            } catch (e) {

            }
            break;
          }
        }
        this.baseLayerUrl = baseLayer.url;
        this.baseLayerLabel = baseLayer.label;
        await this.changeBaseLayerOnMap();
        break;
    }
  }

  async changeBaseLayerOnMap(): Promise<void> {
    if (this.baseLayerUrl === '') {
      await this.mapController.changeBaseLayerOSM();
      this.baseLayerLabel = 'OpenStreetMap';
    } else {
      if (!this.baseLayerUrl.endsWith('?')) {
        this.baseLayerUrl = `${this.baseLayerUrl}?`;
      }
      try {
        const info = await this.mapController.changeBaseLayerWMS(this.baseLayerUrl);
        if (this.baseLayerLabel === '') {
          this.baseLayerLabel = info.serviceName;
        }
      } catch (e) {
        this.notificationService.createNotificationWithType(
          TypeNotificationEnum.error,
          'GEO_VIEWER.TABS.MAP.MODAL_SETTNGS.ERROR_CHANGE_BASE_LAYER_NOTIFICATION.TITLE',
          'GEO_VIEWER.TABS.MAP.MODAL_SETTNGS.ERROR_CHANGE_BASE_LAYER_NOTIFICATION.CONTENT',
          'bottomRight'
        );
      }
    }
  }

  private mapControllerGetInfoClickMapEvent(event) {
    if (event.status === 'start') {
      this.loadigClickInfoMap = true;
      this.lastClickCoordinate = event.coordinate;
      if (this.whereClickMapInfo == 'overlay') {
        const overlay = this.mapController.overlayOpenLayerClick;
        overlay.setPosition(event.coordinate);
        overlay.setOffset([-(overlay.getElement().clientWidth / 2), -this.heightOverlayOpenLayerClick]);
      }
      this.clickMapEventEmitter.emit({
        status: 'start',
        whereClickMapInfo: this.whereClickMapInfo
      })
    }
    if (event.status === 'end') {
      let infoMap = []
      if (event.info) {
        Object.keys(event.info).forEach(key => {
          const layerId = key.split('$')[0]
          const layerData = this.mapController.activeLayers.get(key).data
          const find = infoMap.find(element => {
            return layerId === element.layerId
          })
          if (!find) {
            infoMap.push({
              layerId: layerId,
              layerName: layerData.layerName,
              data: event.info[key]
            })
          }
        })
      }
      this.clickInfoMap = event.info ? infoMap : null
      this.loadigClickInfoMap = false
      this.clickMapEventEmitter.emit({
        status: 'end',
        whereClickMapInfo: this.whereClickMapInfo,
        infoMap: this.clickInfoMap,
      })
    }
  }

  addLegend(property) {
    const url = this.mapController.getUrlLegendLayerImage(property.id, property.style.style_name)
    if (url) {
      this.legends[property.id] = {
        url,
        property
      }
    }
  }

  removeLegend(property) {
    delete this.legends[property.id]
  }

  getView() {
    return this.mapController.getMap().getView()
  }
}
