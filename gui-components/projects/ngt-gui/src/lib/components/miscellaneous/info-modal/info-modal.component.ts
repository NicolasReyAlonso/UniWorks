import { Component, EventEmitter, Input, OnInit, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import {SharedModule} from "../../../modules/shared.module";
import {NzButtonModule} from "ng-zorro-antd/button";
import {NzIconModule} from "ng-zorro-antd/icon";
import {NzModalModule} from "ng-zorro-antd/modal";

export interface ButtonsInfoModal {
  text: string,
  func: () => void,
  options: { isDanger: boolean }
}
@Component({
    selector: 'app-info-modal',
    imports: [
        CommonModule,
        SharedModule,
        NzButtonModule,
        NzIconModule,
        NzModalModule,
    ],
    templateUrl: './info-modal.component.html',
    styleUrls: ['./info-modal.component.sass']
})
export class InfoModalComponent implements OnInit {

  @Input() isVisible = false;
  @Output() isVisibleChange = new EventEmitter<boolean>();
  @Input() typeIcon = "info-circle"
  @Input() themeIcon = "twotone";
  @Input() twotoneColorIcon = "#e30808";
  @Input() title = "";
  @Input() content = "";
  @Input() contentParams = {};
  @Input() buttons: ButtonsInfoModal[] = [];


  constructor() {
  }

  ngOnInit(): void {
  }

  changeIsVisible(value: boolean) {
    this.isVisible = value;
    this.isVisibleChange.emit(this.isVisible);
  }

  closeModal() {
    this.changeIsVisible(false);
  }
}
