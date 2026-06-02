import {Component, EventEmitter, Input, Output, Inject} from '@angular/core';
import {BackendServiceInterface, BACKEND_SERVICE} from 'ngt-gui/core';
import { CommonModule } from '@angular/common';
import {SharedModule} from "ngt-gui/gui";
import {NzTableModule} from "ng-zorro-antd/table";
import {NzListModule} from "ng-zorro-antd/list";
import {NzSpinModule} from "ng-zorro-antd/spin";
import {NzModalModule} from "ng-zorro-antd/modal";
import {NzButtonModule} from "ng-zorro-antd/button";

@Component({
    selector: 'app-acl-rules-modal',
    imports: [
        CommonModule,
        SharedModule,
        NzTableModule,
        NzListModule,
        NzSpinModule,
        NzModalModule,
        NzButtonModule,
    ],
    templateUrl: './acl-rules-modal.component.html',
    styleUrls: ['./acl-rules-modal.component.sass']
})
export class AclRulesModalComponent {

  _isVisible: boolean;
  explanations: string[];
  rulesHeader: string[];
  rulesContent: string[][]
  loadingModal: boolean;
  @Input() objectUUID;
  @Output() isVisibleChange = new EventEmitter<boolean>();
  constructor(
    @Inject (BACKEND_SERVICE) private readonly backendService: BackendServiceInterface
  ) { }

  set isVisible(val) {
    if (val) {
      this.initModal();
    }
    this._isVisible = val;
    this.isVisibleChange.emit(this._isVisible);
  }

  @Input()
  get isVisible() {
    return this._isVisible;
  }

  async initModal() {
    this.loadingModal = true;
    const content = (await this.backendService.getAuthrExplain(undefined, {object_uuid: this.objectUUID}).toPromise())['content'];
    this.explanations = content['explanation'];
    this.rulesHeader = content['rules'][0];
    this.rulesContent = content['rules'].slice(1);
    this.loadingModal = false;
  }

}
