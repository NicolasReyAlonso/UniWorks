import {Component, OnInit} from '@angular/core';
import { CommonModule } from '@angular/common';
import { ModalInfoService } from 'src/app/services/modal-info.service';
import {SharedModule} from "ngt-gui/gui";
import {NzModalModule} from "ng-zorro-antd/modal";
import {NzIconModule} from "ng-zorro-antd/icon";
import {NzButtonModule} from "ng-zorro-antd/button";

export interface IButtonsModalInfo {
  text: string,
  type?: any,
  danger?: boolean,
  onClickFunc: () => void,
}

@Component({
    selector: 'app-modal-info',
    imports: [
        CommonModule,
        SharedModule,
        NzModalModule,
        NzIconModule,
        NzButtonModule,
    ],
    templateUrl: './modal-info.component.html',
    styleUrls: ['./modal-info.component.sass']
})
export class ModalInfoComponent implements OnInit {

  constructor(public readonly modalInfoService: ModalInfoService) { }

  ngOnInit(): void {
  }

  close() {
    this.modalInfoService.isVisibleModalInfo = false;
    this.modalInfoService.closeFunc && this.modalInfoService.closeFunc()
  }

}
