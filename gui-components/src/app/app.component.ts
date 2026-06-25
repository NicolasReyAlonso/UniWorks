import {Component} from '@angular/core';
import {SharedModule} from "ngt-gui/gui";
import {NzSelectModule} from "ng-zorro-antd/select";
import {FormsModule, ReactiveFormsModule} from "@angular/forms";
import {NzModalModule} from "ng-zorro-antd/modal";
import {NzSpinModule} from "ng-zorro-antd/spin";
import {NzMessageModule} from "ng-zorro-antd/message";
import {NzNotificationModule} from "ng-zorro-antd/notification";
import {NzIconModule} from "ng-zorro-antd/icon";
import {CommonModule} from "@angular/common";
// Layout MDI (ventanas). Para volver al layout de pestañas clásico, importa
// TabLayoutComponent en su lugar y usa <app-tab-layout> en app.component.html.
import { MdiLayoutComponent } from 'ngt-gui/gui';
import { AssistantOverlayComponent } from './components/assistant-overlay/assistant-overlay.component';

@Component({
  imports: [
    CommonModule,
    SharedModule,
    NzSelectModule,
    FormsModule,
    ReactiveFormsModule,
    NzModalModule,
    NzSpinModule,
    NzMessageModule,
    NzNotificationModule,
    NzIconModule,
    // Components
    MdiLayoutComponent,
    AssistantOverlayComponent
],
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: [
    './app.component.sass',
    './ng-zorro.sass',
  ],
})
export class AppComponent {
}
