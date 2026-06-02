import { Component, OnInit } from '@angular/core';
import {NzModalModule, NzModalService} from 'ng-zorro-antd/modal';
import {BackendService} from 'ngt-gui/core';import * as fileSaver from 'file-saver';
import { forkJoin } from 'rxjs';
import {NotificationService, TypeNotificationEnum} from 'src/app/services/notification.service';
import { CommonModule } from '@angular/common';
import {NzSpinModule} from "ng-zorro-antd/spin";
import {SharedModule} from "../../../../shared-module/shared.module";
import {NzSelectModule} from "ng-zorro-antd/select";
import {NzButtonModule} from "ng-zorro-antd/button";
import {FormsModule, ReactiveFormsModule} from "@angular/forms";

@Component({
    selector: 'app-geolayer-export-modal',
    imports: [
        CommonModule,
        NzSpinModule,
        NzModalModule,
        SharedModule,
        NzSelectModule,
        NzButtonModule,
        FormsModule,
        ReactiveFormsModule,
    ],
    templateUrl: './geolayer-export-modal.component.html',
    styleUrls: ['./geolayer-export-modal.component.sass']
})
export class GeolayerExportModalComponent implements OnInit {

  visible = false;
  layers: any;
  loading = false;
  selectModal = [];
  options;
  params;

  visibleModalSpin = false;

  selectOptions = [
    {
      label: "gpkg",
      value: "gpkg",
    },
    {
      label: "shp",
      value: "shp",
    },
    {
      label: "geojson",
      value: "geojson",
    },
    {
      label: "csv",
      value: "csv",
      requirements: {
        layer_type: "no_explicit_geometry_layer",
      }
    },
    {
      label: "xlsx",
      value: "xlsx",
      requirements: {
        layer_type: "no_explicit_geometry_layer",
      }
    },
    {
      label: "csv",
      value: "csv",
    },
  ]

  private readonly fileExtension = {
    "application/geo+json": "geojson",
    "application/geopackage+sqlite3": "gpkg",
    "application/zip": "zip",
    "text/csv": "csv",
  }

  constructor(
    private readonly backendService: BackendService,
    private readonly nzModalService: NzModalService,
    private readonly notificationService: NotificationService,
  ) { }

  ngOnInit(): void {
  }

  async openModal(layers, params?): Promise<void> {
    if (!layers) return;
    console.log(layers)
    this.params = params;
    this.layers = layers;
    this.selectModal = [];
    this.visible = true;
    this.loading = false;
    this.options = this.getOptions();
  }

  getOptions(): { label: string, value: any }[] {
    const options: { label: string, value: any }[] = [];
    for (const option of this.selectOptions) {
      let addOption = true;
      if (option.requirements) {
        for (const layer of this.layers) {
          for (const key in option.requirements) {
            if (layer[key] != option.requirements[key]) {
              addOption = false;
              break;
            }
          }
          if (!addOption) break;
        }
      }
      if (addOption) options.push({ label: option.label, value: option.value });
    }
    return options
  }

  async exportLayers() {
    this.visibleModalSpin = true;
    const observers = [];
    const map = new Map<string, {name, extension}>();
    let number = 0;
    try {
      for (const layer of this.layers) {
          const observer = this.backendService.exportLayerGIS(layer.id, this.selectModal, this.params);
          observers.push();
          map.set(`${number}`, {
            name: layer.name,
            extension: this.selectModal,
          })
          observers[`${number}`] = observer;
          number++;
      }
      const response = await forkJoin(observers).toPromise();
      for (const key in response) {
        const blob = <Blob> response[key];
        fileSaver.saveAs(blob, `${map.get(key).name}.${this.fileExtension[blob.type]}`);
      }
      this.visibleModalSpin = false;
      this.visible = false;
      this.notificationService.createNotificationWithType(TypeNotificationEnum.success, "Exportación de capas", "Se han exportado las capas con éxito.", "bottomRight");
    } catch (error) {
      console.log(error);
      this.nzModalService.error({
        nzTitle: 'Error',
        nzContent: `Ha ocurrio un error al intentar exportar las capas.`,
        nzCentered: true,
      });
      this.visibleModalSpin = false;
      this.loading = false;
    }
  }

}
