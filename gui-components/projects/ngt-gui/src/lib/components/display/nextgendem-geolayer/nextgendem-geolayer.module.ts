import { NgModule } from '@angular/core';
import {CommonModule, NgOptimizedImage} from '@angular/common';
import { NextgendemGeolayerComponent } from './nextgendem-geolayer/nextgendem-geolayer.component';
import { NextgendemGeolayerTopAreaComponent } from './nextgendem-geolayer-top-area/nextgendem-geolayer-top-area.component';
import {NzSpinModule} from "ng-zorro-antd/spin";
import {SharedModule} from "../../../shared-module/shared.module";
import {NzIconModule} from "ng-zorro-antd/icon";
import { NextgendemGeolayerMapComponent } from './nextgendem-geolayer-map/nextgendem-geolayer-map.component';
import {NzButtonModule} from "ng-zorro-antd/button";
import { NextgendemGeolayerConfigurationPanelComponent } from './nextgendem-geolayer-configuration-panel/nextgendem-geolayer-configuration-panel.component';
import { NextgendemGeolayerMapSettingsComponent } from './nextgendem-geolayer-map-settings/nextgendem-geolayer-map-settings.component';
import {NzFormModule} from "ng-zorro-antd/form";
import {NzGridModule} from "ng-zorro-antd/grid";
import {NzInputModule} from "ng-zorro-antd/input";
import {NzModalModule} from "ng-zorro-antd/modal";
import {NzRadioModule} from "ng-zorro-antd/radio";
import {NzSelectModule} from "ng-zorro-antd/select";
import {FormsModule, ReactiveFormsModule} from "@angular/forms";
import { NextgendemGeolayerAddAttributeModalComponent } from './nextgendem-geolayer-add-attribute-modal/nextgendem-geolayer-add-attribute-modal.component';
import {NzPaginationModule} from "ng-zorro-antd/pagination";
import {NzCheckboxModule} from "ng-zorro-antd/checkbox";
import {DragDropModule} from "@angular/cdk/drag-drop";
import {NzPopoverModule} from "ng-zorro-antd/popover";
import {NzSliderModule} from "ng-zorro-antd/slider";
import { NextgendemGeolayerConfigurationPanelWindowComponent } from './nextgendem-geolayer-configuration-panel-window/nextgendem-geolayer-configuration-panel-window.component';
import {NzTabsModule} from "ng-zorro-antd/tabs";
import {KeyValueCustomPipe} from "../../../pipes/key-value-custom.pipe";
import { NextgendemGeolayerModalCqlGenerateByFilterComponent } from './nextgendem-geolayer-modal-cql-generate-by-filter/nextgendem-geolayer-modal-cql-generate-by-filter.component';
import {JqueryQuerybuilderComponent} from "../../miscellaneous/jquery-querybuilder/jquery-querybuilder.component";
import { NextgendemGeolayerEditStyleModalComponent } from './nextgendem-geolayer-edit-style-modal/nextgendem-geolayer-edit-style-modal.component';
import { NextgendemGeolayerCreateMapComponent } from './nextgendem-geolayer-create-map/nextgendem-geolayer-create-map.component';
import {GeolayerExportModalComponent} from "../../data/geolayer/geolayer-export-modal/geolayer-export-modal.component";
import {FormlyModule} from "@ngx-formly/core";

@NgModule({
  declarations: [
    NextgendemGeolayerComponent,
    NextgendemGeolayerTopAreaComponent,
    NextgendemGeolayerMapComponent,
    NextgendemGeolayerConfigurationPanelComponent,
    NextgendemGeolayerMapSettingsComponent,
    NextgendemGeolayerAddAttributeModalComponent,
    NextgendemGeolayerConfigurationPanelWindowComponent,
    NextgendemGeolayerModalCqlGenerateByFilterComponent,
    NextgendemGeolayerEditStyleModalComponent,
    NextgendemGeolayerCreateMapComponent
  ],
  exports: [
    NextgendemGeolayerComponent
  ],
  imports: [
    CommonModule,
    NzSpinModule,
    SharedModule,
    NzIconModule,
    NzButtonModule,
    NgOptimizedImage,
    NzFormModule,
    NzGridModule,
    NzInputModule,
    NzModalModule,
    NzRadioModule,
    NzSelectModule,
    NzPaginationModule,
    NzCheckboxModule,
    ReactiveFormsModule,
    FormsModule,
    DragDropModule,
    NzPopoverModule,
    NzSliderModule,
    NzTabsModule,
    KeyValueCustomPipe,
    JqueryQuerybuilderComponent,
    GeolayerExportModalComponent,
    FormlyModule
  ]
})
export class NextgendemGeolayerModule { }
