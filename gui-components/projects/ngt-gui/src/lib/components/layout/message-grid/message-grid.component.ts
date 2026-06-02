import { Component, ElementRef, OnInit, ViewChild, Inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import {NzTableModule} from "ng-zorro-antd/table";
import {NzDrawerModule} from "ng-zorro-antd/drawer";
import {NzBadgeModule} from "ng-zorro-antd/badge";
import {NzSpinModule} from "ng-zorro-antd/spin";
import {NzButtonModule} from "ng-zorro-antd/button";
import {NzIconModule} from "ng-zorro-antd/icon";

//Library Services
import {
  MessageLogServiceInterface,
  MESSAGE_LOG_SERVICE

} from "ngt-gui/core";

//Library Modules
import {SharedModule} from "../../../modules/shared.module";

@Component({
    selector: 'app-message-grid',
    imports: [
        CommonModule,
        SharedModule,
        NzTableModule,
        NzDrawerModule,
        NzBadgeModule,
        NzSpinModule,
        NzButtonModule,
        NzIconModule,
    ],
    templateUrl: './message-grid.component.html',
    styleUrls: ['./message-grid.component.sass']
})
export class MessageGridComponent implements OnInit {
  showFilter: boolean = false;

  @ViewChild('buttonRegisters') buttonRegisters: ElementRef;

  constructor(@Inject(MESSAGE_LOG_SERVICE) public messages: MessageLogServiceInterface) { }

  ngOnInit(): void {
  }

  showDrawer() {
    this.showFilter = true;
    this.messages.alreadySeen();
  }

  closeDrawer() {
    this.showFilter = false;
  }
}
