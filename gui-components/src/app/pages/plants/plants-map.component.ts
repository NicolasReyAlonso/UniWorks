import {
  AfterViewInit,
  Component,
  ElementRef,
  OnDestroy,
  ViewChild,
  inject,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

// NG-ZORRO (ya provisto por la app)
import { NzButtonModule } from 'ng-zorro-antd/button';
import { NzCardModule } from 'ng-zorro-antd/card';
import { NzTagModule } from 'ng-zorro-antd/tag';
import { NzMessageService } from 'ng-zorro-antd/message';

// Piezas genéricas del framework (ngt-gui)
import {
  ApiResponse,
  DynamicFormComponent,
  EntityClient,
  Issue,
  firstError,
  hasErrors,
} from 'ngt-gui';

// OpenLayers
import Map from 'ol/Map';
import View from 'ol/View';
import TileLayer from 'ol/layer/Tile';
import OSM from 'ol/source/OSM';
import VectorLayer from 'ol/layer/Vector';
import VectorSource from 'ol/source/Vector';
import Feature from 'ol/Feature';
import Point from 'ol/geom/Point';
import { fromLonLat, toLonLat } from 'ol/proj';
import { Style, Circle as CircleStyle, Fill, Stroke, Text as TextStyle } from 'ol/style';
import type { MapBrowserEvent } from 'ol';

/** Forma de una planta tal y como la sirve el backend (entidad `plants`). */
interface Plant {
  id?: number;
  name?: string;          // nombre común (heredado de FunctionalObject)
  species?: string;       // nombre científico
  latitude?: number;
  longitude?: number;
  planted_on?: string;
  health?: 'healthy' | 'attention' | 'sick' | 'dead' | string;
  notes?: string;
}

/** Colores de marcador y etiqueta por estado de salud. */
const HEALTH_COLORS: Record<string, string> = {
  healthy: '#52c41a',
  attention: '#faad14',
  sick: '#fa541c',
  dead: '#8c8c8c',
};

/**
 * Demo "Plantas en el mapa".
 *
 * Página de aplicación REAL construida sobre el framework. Compone tres piezas:
 *   1. `EntityClient.for('/plants')`  → CRUD genérico contra el backend.
 *   2. `<ngt-dynamic-form entityPath="/plants">` → formulario generado solo
 *       a partir del JSON Schema del backend (no se escribe HTML de campos).
 *   3. OpenLayers → mapa con un marcador por planta; al pulsar en el mapa se
 *       fijan latitude/longitude en el formulario ("marcar dónde está").
 *
 * Ni el backend ni la librería saben nada de "plantas": todo el dominio vive en
 * el plugin `src/plugins/plants` (back) y en esta página (front).
 */
@Component({
  selector: 'app-plants-map',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    NzButtonModule,
    NzCardModule,
    NzTagModule,
    DynamicFormComponent,
  ],
  templateUrl: './plants-map.component.html',
  styleUrls: ['./plants-map.component.sass'],
})
export class PlantsMapComponent implements AfterViewInit, OnDestroy {
  @ViewChild('mapEl', { static: true }) mapEl!: ElementRef<HTMLDivElement>;

  private readonly client = inject(EntityClient);
  private readonly message = inject(NzMessageService);

  /** Recurso tipado del cliente genérico. */
  private readonly plants$ = this.client.for<Plant>('/plants');

  plants: Plant[] = [];
  selected: Plant | null = null;
  formMode: 'create' | 'edit' = 'create';

  /** Modelo bidireccional del formulario dinámico. */
  model: Record<string, unknown> = {};
  issues: Issue[] = [];
  loading = false;

  private map!: Map;
  private markerSource = new VectorSource();
  /** Marcador "fantasma" de la posición que se está eligiendo en el mapa. */
  private draftSource = new VectorSource();

  // ── Ciclo de vida ───────────────────────────────────────────────
  ngAfterViewInit(): void {
    this.initMap();
    this.loadPlants();
  }

  ngOnDestroy(): void {
    this.map?.setTarget(undefined);
  }

  // ── Mapa ────────────────────────────────────────────────────────
  private initMap(): void {
    this.map = new Map({
      target: this.mapEl.nativeElement,
      layers: [
        new TileLayer({ source: new OSM() }),
        new VectorLayer({ source: this.markerSource }),
        new VectorLayer({ source: this.draftSource }),
      ],
      view: new View({
        center: fromLonLat([-15.45, 28.05]), // Gran Canaria
        zoom: 10,
      }),
    });

    this.map.on('click', (evt: MapBrowserEvent<PointerEvent>) => this.onMapClick(evt));
    this.map.getViewport().style.cursor = 'crosshair';
  }

  private onMapClick(evt: MapBrowserEvent<PointerEvent>): void {
    // ¿Se ha pulsado sobre un marcador existente? → seleccionar esa planta.
    const hit = this.map.forEachFeatureAtPixel(evt.pixel, f => f.get('plantId') as number | undefined);
    if (hit != null) {
      const plant = this.plants.find(p => p.id === hit);
      if (plant) { this.selectPlant(plant); return; }
    }

    // Si no, fijar las coordenadas pulsadas en el formulario.
    const [lng, lat] = toLonLat(evt.coordinate);
    this.model = { ...this.model, latitude: round(lat), longitude: round(lng) };
    this.drawDraft(lng, lat);
    this.message.info(`Coordenadas fijadas: ${round(lat)}, ${round(lng)}`);
  }

  private renderMarkers(): void {
    this.markerSource.clear();
    for (const p of this.plants) {
      if (p.latitude == null || p.longitude == null) continue;
      const feature = new Feature({ geometry: new Point(fromLonLat([p.longitude, p.latitude])) });
      feature.set('plantId', p.id);
      feature.setStyle(markerStyle(p, this.selected?.id === p.id));
      this.markerSource.addFeature(feature);
    }
  }

  private drawDraft(lng: number, lat: number): void {
    this.draftSource.clear();
    const feature = new Feature({ geometry: new Point(fromLonLat([lng, lat])) });
    feature.setStyle(new Style({
      image: new CircleStyle({
        radius: 9,
        fill: new Fill({ color: 'rgba(24,144,255,0.35)' }),
        stroke: new Stroke({ color: '#1890ff', width: 2 }),
      }),
    }));
    this.draftSource.addFeature(feature);
  }

  // ── CRUD vía cliente genérico ───────────────────────────────────
  loadPlants(): void {
    this.loading = true;
    this.plants$.list().subscribe({
      next: (res: ApiResponse<Plant[]>) => {
        this.loading = false;
        this.plants = res.content ?? [];
        this.renderMarkers();
      },
      error: () => {
        this.loading = false;
        this.message.error('No se pudieron cargar las plantas');
      },
    });
  }

  selectPlant(plant: Plant): void {
    this.selected = plant;
    this.formMode = 'edit';
    this.model = { ...plant };
    this.issues = [];
    this.draftSource.clear();
    this.renderMarkers();
    if (plant.longitude != null && plant.latitude != null) {
      this.map.getView().animate({ center: fromLonLat([plant.longitude, plant.latitude]), duration: 350 });
    }
  }

  newPlant(): void {
    this.selected = null;
    this.formMode = 'create';
    this.model = {};
    this.issues = [];
    this.draftSource.clear();
    this.renderMarkers();
    this.message.info('Pulsa en el mapa para situar la nueva planta');
  }

  /** Se dispara al enviar el formulario dinámico. */
  save(model: Record<string, unknown>): void {
    const payload = model as Partial<Plant>;
    const request$ = this.selected?.id
      ? this.plants$.update(this.selected.id, payload)
      : this.plants$.create(payload);

    request$.subscribe({
      next: (res: ApiResponse<Plant>) => {
        this.issues = res.issues ?? [];
        if (hasErrors(res)) {
          this.message.error(firstError(res)?.message ?? 'Error al guardar');
          return;
        }
        this.message.success(this.selected ? 'Planta actualizada' : 'Planta creada');
        this.newPlant();
        this.loadPlants();
      },
      error: () => this.message.error('Error al guardar la planta'),
    });
  }

  remove(plant: Plant): void {
    if (!plant.id) return;
    this.plants$.delete(plant.id).subscribe({
      next: () => {
        this.message.success('Planta eliminada');
        if (this.selected?.id === plant.id) this.newPlant();
        this.loadPlants();
      },
      error: () => this.message.error('Error al eliminar'),
    });
  }

  // ── Helpers de plantilla ────────────────────────────────────────
  healthColor(health?: string): string {
    return HEALTH_COLORS[health ?? ''] ?? '#8c8c8c';
  }

  trackById = (_: number, p: Plant) => p.id;
}

// ── Utilidades de módulo ──────────────────────────────────────────
function round(n: number): number {
  return Math.round(n * 1e6) / 1e6;
}

function markerStyle(plant: Plant, isSelected: boolean): Style {
  const color = HEALTH_COLORS[plant.health ?? ''] ?? '#8c8c8c';
  return new Style({
    image: new CircleStyle({
      radius: isSelected ? 10 : 7,
      fill: new Fill({ color }),
      stroke: new Stroke({ color: isSelected ? '#000' : '#fff', width: 2 }),
    }),
    text: new TextStyle({
      text: plant.name ?? '',
      offsetY: -16,
      font: '12px sans-serif',
      fill: new Fill({ color: '#222' }),
      stroke: new Stroke({ color: '#fff', width: 3 }),
    }),
  });
}
