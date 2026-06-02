import {v4 as uuidv4} from 'uuid';

// OpenLayers
import MapOpenLayer from 'ol/Map';
import View from 'ol/View';
import OSM from 'ol/source/OSM';
import * as olProj from 'ol/proj';
import TileLayer from 'ol/layer/Tile';
import {Overlay, MapBrowserEvent, MapEvent,} from 'ol';
import Layer from 'ol/layer/Layer';
import {Coordinate} from 'ol/coordinate';
import {defaults as defaultControls} from 'ol/control';
import {defaults as defaultInterations} from 'ol/interaction';
import {ListenerFunction} from 'ol/events';
import {register as registerProj4} from 'ol/proj/proj4';
import proj4 from 'proj4';
import TileWMS from 'ol/source/TileWMS';
import {WMSCapabilities} from 'ol/format';


// Angular
import {ElementRef} from '@angular/core';
import {BackendService} from 'ngt-gui/core';import {forkJoin, Subject} from 'rxjs';
import { GlobalService } from 'ngt-gui/core';

export class MapController {

  // Map
  private map: MapOpenLayer;
  baseLayer: TileLayer<TileWMS | OSM> = new TileLayer({
    zIndex: 1,
    source: new OSM(),
  });
  projectionView = 'EPSG:3857';
  // Listener
  private onClickMapListener: ListenerFunction;
  private onRightClickMapListener: ListenerFunction;
  private onPointerMoveMapListener: ListenerFunction;
  private isActiveShowInfoPointerStop = false;
  private setTimeoutFuncPointerMove: any;

  // Layers
  public activeLayers = new Map<any, { layer: Layer<any, any>, data: any }>();

  // Overlays
  public overlayOpenLayerClick: Overlay;
  public overlayOpenLayerRightClick: Overlay;
  private coordinateRightClick: Coordinate;

  constructor(
    private geoViewerElementRef: ElementRef,
    private overlayOpenLayerClickElement: ElementRef,
    private overlayOpenLayerRightClickElement: ElementRef,
    private readonly backendService: BackendService,
    private readonly mapControllerEvents: Subject<{ type: string, value: any }>,
    private readonly globalVariablesServices: GlobalService,
    private projectionsMap,
  ) {
    this.initProjections();
    this.initMap(this.overlayOpenLayerClickElement, this.overlayOpenLayerRightClickElement);
  }

  initProjections() {
    for (const projection of this.projectionsMap) {
      if (!projection.attributes || !projection.attributes.code || !projection.attributes.proj4) {
        continue;
      }
      proj4.defs(
        projection.attributes.code,
        projection.attributes.proj4,
      );
    }
    registerProj4(proj4);
  }

  private initMap(overlayOpenLayerClickElement: ElementRef, overlayOpenLayerRightClickElement: ElementRef<HTMLElement>): void {
    // Map
    this.map = new MapOpenLayer({
      target: this.geoViewerElementRef.nativeElement,
      layers: [
        this.baseLayer,
      ],
      view: new View({
        center: olProj.fromLonLat([-15.74779162, 28.33539902], this.projectionView),
        zoom: 8,
        projection: this.projectionView,
        smoothExtentConstraint: false,
      }),
      controls: defaultControls({zoom: false, attribution: false, rotate: false}),
      interactions: defaultInterations({doubleClickZoom: false}),
    });

    // Overlay
    this.overlayOpenLayerClick = new Overlay({
      element: overlayOpenLayerClickElement.nativeElement,
    });
    this.overlayOpenLayerRightClick = new Overlay({
      element: overlayOpenLayerRightClickElement.nativeElement,
    });
    this.map.addOverlay(this.overlayOpenLayerClick);
    this.map.addOverlay(this.overlayOpenLayerRightClick);
    this.activeOnClickMapEvent();
    this.activeOnRightClickMapEvent();
    this.map.on('movestart', this.onMoveStartMap.bind(this));
    this.map.getViewport().addEventListener('pointerleave', this.onPointerLeaveMap.bind(this));
    const overlayOpenLayerClickPointerEnter = () => {
      this.desactiveOnPointerMoveMap();
    };
    this.overlayOpenLayerClick.getElement().addEventListener('pointerenter', overlayOpenLayerClickPointerEnter.bind(this));
    const overlayOpenLayerClickPointerLeave = () => {
      this.activeOnPointerMoveMap();
    };
    this.overlayOpenLayerClick.getElement().addEventListener('pointerleave', overlayOpenLayerClickPointerLeave.bind(this));

    this.activeOnPointerMoveMap();
    this.map.updateSize();
  }

  private activeOnClickMapEvent(): void {
    if (this.onClickMapListener) {
      this.desactiveOnClickMapEvent();
    }
    const eventOnClickMap = this.map.on('click', this.onClickMap.bind(this));
    this.onClickMapListener = eventOnClickMap.listener;
  }

  private desactiveOnClickMapEvent(): void {
    this.map.un('click', this.onClickMapListener);
    this.onClickMapListener = null;
  }

  private async getInfoByCoordinate(coordinate) {
    let info = null;
    const featureInfoUrls = {};
    for (const key of this.activeLayers.keys()) {
      const layer = this.activeLayers.get(key);
      const view = this.map.getView();
      const source = layer.layer.getSource();
      if (source instanceof TileWMS) {
        featureInfoUrls[key] = source.getFeatureInfoUrl(coordinate, view.getResolution(), view.getProjection(), {
          INFO_FORMAT: 'application/json',
          FEATURE_COUNT: 500
        });
      }
    }
    if (Object.keys(featureInfoUrls).length !== 0 && featureInfoUrls.constructor === Object) {
      for (const key of Object.keys(featureInfoUrls)) {
        featureInfoUrls[key] = this.backendService.createHttpGet(featureInfoUrls[key]);
      }
      const resultForkJoin: any = await forkJoin(featureInfoUrls).toPromise();
      for (const key of Object.keys(resultForkJoin)) {
        const featureCollections = resultForkJoin[key];
        let firstIteration = true;
        for (const feature of featureCollections.features) {
          if (!info) {
            info = {};
          }
          if (firstIteration) {
            info[key] = [];
            firstIteration = false;
          }
          info[key].push(feature.properties);
        }
      }
    }
    return info;
  }

  private async onClickMap(event: MapBrowserEvent<any>): Promise<void> {
    const coordinate = event.coordinate;
    this.mapControllerEvents.next({
      type: 'getInfoClickMap',
      value: {
        status: 'start',
        coordinate,
      }
    });
    this.mapControllerEvents.next({
      type: 'getInfoClickMap',
      value: {
        status: 'end',
        coordinate,
        info: await this.getInfoByCoordinate(coordinate),
      }
    });
  }

  private desactiveOnRightClickMapEvent(): void {
    this.map.getViewport().removeEventListener('contextmenu', this.onRightClickMapListener);
    this.onRightClickMapListener = null;
  }

  private activeOnRightClickMapEvent(): void {
    if (this.onClickMapListener) {
      this.desactiveOnRightClickMapEvent();
    }
    this.onRightClickMapListener = this.onRightClickMap.bind(this);
    this.map.getViewport().addEventListener('contextmenu', this.onRightClickMapListener);
  }

  private onRightClickMap(event: PointerEvent): void {
    event.preventDefault();
    if (this.setTimeoutFuncPointerMove) {
      clearTimeout(this.setTimeoutFuncPointerMove);
    }
    this.disableOverlaysMap();
    this.overlayOpenLayerClick.setPosition(undefined);
    this.coordinateRightClick = this.map.getEventCoordinate(event);
    this.overlayOpenLayerRightClick.setPosition(this.coordinateRightClick);
    this.overlayOpenLayerRightClick.setOffset([5, 0]);
  }

  private desactiveOnPointerMoveMap(): void {
    if (this.setTimeoutFuncPointerMove) {
      clearTimeout(this.setTimeoutFuncPointerMove);
      this.setTimeoutFuncPointerMove = null;
    }
    if (this.onPointerMoveMapListener) {
      this.map.un('pointermove', this.onPointerMoveMapListener);
    }
    this.onPointerMoveMapListener = null;
  }

  private activeOnPointerMoveMap(): void {
    if (this.onPointerMoveMapListener) {
      this.desactiveOnPointerMoveMap();
    }
    this.onPointerMoveMapListener = this.onPointerMoveMap.bind(this);
    this.map.on('pointermove', this.onPointerMoveMapListener);
  }

  private onPointerLeaveMap() {
    if (this.setTimeoutFuncPointerMove) {
      clearTimeout(this.setTimeoutFuncPointerMove);
      this.setTimeoutFuncPointerMove = null;
    }
  }

  private onMoveStartMap(event: MapEvent): void {

  }

  private onPointerMoveMap(event: MapBrowserEvent<any>): void {
  }

  isLayerActive(layerKey) {
    return this.activeLayers.has(layerKey);
  }

  getUrlLegendLayerImage(layerKey, style) {
    const layer = this.activeLayers.get(layerKey);
    if (layer) {
      const resolution = this.map.getView().getResolution();
      const source = layer.layer.getSource() as TileWMS;
      return source.getLegendUrl(resolution, {STYLE: style, uuid: uuidv4()});
    }
  }

  addLayerGeoserver(layer, options?) {
    console.log(layer)
    const tileLayer = new TileLayer({
      zIndex: layer.ZIndex,
      opacity: layer.opacity / 100,
      source: new TileWMS({
        url: layer.wms_url,
        params: {
          LAYERS: `${layer.wks}:${layer.geoserver_name}`,
          TILED: true,
          FORMAT_OPTIONS: 'antialias:off',
          STYLES: layer.style,
          uuid: uuidv4(),
          'CQL_FILTER': layer.cql,
        },
        serverType: 'geoserver',
        transition: 0,
      }),
    });
    this.map.addLayer(tileLayer);
    (tileLayer.getSource() as TileWMS).refresh();
    this.activeLayers.set(layer.key, {layer: tileLayer, data: {layerName: layer.layerName}});
  }

  removeLayerGeoserver(layer): void {
    const activeLayer = this.activeLayers.get(layer.key)?.layer
    if (activeLayer) {
      this.map.removeLayer(activeLayer)
      this.activeLayers.delete(layer.key)
    }
  }

  changeZIndexActiveMap(key, ZIndex) {
    if (this.activeLayers.has(key)) {
      this.activeLayers.get(key).layer.setZIndex(ZIndex);
    }
  }

  changeOpacityActiveMap(key, opacity) {
    if (this.activeLayers.has(key)) {
      this.activeLayers.get(key).layer.setOpacity(opacity / 100);
    }
  }

  disableOverlaysMap(): void {
    this.overlayOpenLayerRightClick.setPosition(undefined);
    this.overlayOpenLayerClick.setPosition(undefined);
  }

  centerMap(): void {
    this.map.getView().setCenter(this.coordinateRightClick);
    this.map.render();
  }

  incrementZoomMap(zoomNumber: number): void {
    this.map.getView().animate({
      zoom: this.map.getView().getZoom() + zoomNumber,
      duration: 250
    });
  }

  async zoomToExtend(): Promise<void> {
    const host = this.globalVariablesServices.getParameter('host');
    const response: any = await this.backendService.createHttpGetResponseText(`${host}/pxy/geoserver/wms?SERVICE=wms&VERSION=1.3.0&REQUEST=GetCapabilities`).toPromise();
    const obj = new WMSCapabilities().read(response);
    const capability = obj.Capability;
    const objLayer = capability.Layer;
    const activeLayerName = [];
    const minimun: [number, number] = [null, null];
    const maximum: [number, number] = [null, null];
    let needZoomToExtend = false;
    for (const key of this.activeLayers.keys()) {
      const active = this.activeLayers.get(key);
      const layerName = (active.layer.getSource() as any).params_.LAYERS;
      if (layerName) {
        activeLayerName.push(layerName);
      }
    }
    for (const layer of objLayer.Layer) {
      if (activeLayerName.find((value) => {
        return value === layer.Name;
      })) {
        const bb = layer.BoundingBox[0];
        const minimunCurrentLayer = olProj.fromLonLat([bb.extent[0], bb.extent[1]], this.projectionView);
        const maximumCurrentLayer = olProj.fromLonLat([bb.extent[2], bb.extent[3]], this.projectionView);
        if (!minimun[0] || minimunCurrentLayer[0] < minimun[0]) {
          minimun[0] = minimunCurrentLayer[0];
        }
        if (!minimun[1] || minimunCurrentLayer[1] < minimun[1]) {
          minimun[1] = minimunCurrentLayer[1];
        }
        if (!maximum[0] || maximumCurrentLayer[0] > maximum[0]) {
          maximum[0] = maximumCurrentLayer[0];
        }
        if (!maximum[1] || maximumCurrentLayer[1] > maximum[1]) {
          maximum[1] = maximumCurrentLayer[1];
        }
        needZoomToExtend = true;
      }
    }
    const marginX = (maximum[0] - minimun[0]) / 20;
    const marginY = (maximum[1] - minimun[1]) / 20;
    if (needZoomToExtend) {
      this.map.getView().fit(
        [minimun[0] - marginX, minimun[1] - marginY, maximum[0] + marginX, maximum[1] + marginY],
        {size: this.map.getSize()}
      );
    }
  }

  rotationMap(rotationNumber: number): void {
    this.map.getView().animate({
      rotation: rotationNumber,
      duration: 250
    });
  }

  incrementRotationMap(rotationNumber: number): void {
    this.map.getView().animate({
      rotation: this.map.getView().getRotation() + rotationNumber,
      duration: 250
    });
  }

  getStateShowInfoPointerStop(): boolean {
    return this.isActiveShowInfoPointerStop;
  }

  setStateShowInfoPointerStop(state: boolean): void {
    if (!state) {
      if (this.setTimeoutFuncPointerMove) {
        clearTimeout(this.setTimeoutFuncPointerMove);
      }
    }
    this.isActiveShowInfoPointerStop = state;
  }

  getMap(): MapOpenLayer {
    return this.map;
  }

  async changeBaseLayerWMS(url: string): Promise<any> {
    const response: any = await this.backendService.createHttpGetResponseTextWithoutAuthOptions(`${url}service=wms&request=getcapabilities`).toPromise();
    const capabilities = new WMSCapabilities().read(response);
    const obj = {
      FORMAT: capabilities.Capability.Request.GetMap.Format[0],
      LAYERS: '',
    };
    let firstLayer = true;
    for (const layer of capabilities.Capability.Layer.Layer) {
      if (!firstLayer) {
        obj.LAYERS = `${obj.LAYERS},`;
      }
      obj.LAYERS = `${obj.LAYERS}${layer.Name}`;
      firstLayer = false;
    }
    const tileLayer = new TileLayer({
      zIndex: 1,
      opacity: 1,
      source: new TileWMS({
        url: url,
        params: {
          "FORMAT": obj.FORMAT,
          "LAYERS": obj.LAYERS
        },
        transition: 0,
      }),
    });
    this.map.removeLayer(this.baseLayer);
    this.baseLayer = tileLayer;
    this.map.addLayer(tileLayer);
    return {
      serviceName: capabilities.Service.Title,
    };
  }

  async changeBaseLayerOSM() {
    const tileLayer = new TileLayer({
      zIndex: 1,
      source: new OSM(),
    });
    this.map.removeLayer(this.baseLayer);
    this.baseLayer = tileLayer;
    this.map.addLayer(tileLayer);
  }

  changeProjectionViewer(projection) {
    let cantChangeProjection = true;
    if (projection !== 'EPSG:3857') {
      for (const projectionMap of this.projectionsMap) {
        if (projectionMap.attributes && projectionMap.attributes.code === projection) {
          cantChangeProjection = false;
          break;
        }
      }
    } else {
      cantChangeProjection = false;
    }
    if (cantChangeProjection) return;
    const center = this.map.getView().getCenter();
    const centerLonLat = olProj.transform(center, this.projectionView, 'EPSG:4326');
    this.projectionView = projection;
    const newView = new View({
      projection: this.projectionView,
      center: olProj.fromLonLat([centerLonLat[0], centerLonLat[1]], this.projectionView),
      smoothExtentConstraint: false,
      zoom: this.map.getView().getZoom(),
    });
    this.map.setView(newView);
  }
}
