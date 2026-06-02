import {Component, OnInit} from '@angular/core';
import {ActivatedRoute} from "@angular/router";
import {BackendService} from 'ngt-gui/core';import {ModalInfoService} from "src/app/services/modal-info.service";
import IView from "@interfaces/view.interfaces";
import { CommonModule } from '@angular/common';
import {BlasterjsComponent} from "../../../../components/display/blasterjs/blasterjs.component";
import {NzSpinModule} from "ng-zorro-antd/spin";
import {lastValueFrom} from "rxjs";

@Component({
    selector: 'app-blasterjs-page',
    imports: [
        CommonModule,
        BlasterjsComponent,
        NzSpinModule,
    ],
    templateUrl: './blasterjs-page.component.html',
    styleUrls: ['./blasterjs-page.component.sass']
})
export class BlasterjsPageComponent implements OnInit, IView {

  loading = false;
  requestUrl;
  blasterString;

  BREADCRUMB_NAME = "Blaster";

  constructor(
    private readonly activatedRoute: ActivatedRoute,
    private readonly backendService: BackendService,
    private readonly modalInfoService: ModalInfoService,
  ) {
  }

  async ngOnInit(): Promise<void> {
    this.loading = true;
    this.requestUrl = this.activatedRoute.snapshot.queryParams.requestUrl;
    this.blasterString = await this.getBlasterString();
    this.loading = false;
  }

  async getBlasterString(): Promise<string> {
    try {
      if (this.requestUrl) {
        const response: string = await lastValueFrom(this.backendService.createHttpGet(this.requestUrl, null, 'text'), { defaultValue: undefined }) as any;
        return response;
      }
    } catch (e) {
      this.modalInfoService.showModalInfoDefaultError(e);
    }

    return "";
  }

}
