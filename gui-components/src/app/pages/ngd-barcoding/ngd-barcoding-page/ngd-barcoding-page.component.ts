import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import {BackendService} from 'ngt-gui/core';import { ModalInfoService } from 'src/app/services/modal-info.service';
import { INgdBarcodingData, NgdBarcodingComponent } from 'src/app/components/display/ngd-barcoding/ngd-barcoding.component';
import { NzSpinModule } from 'ng-zorro-antd/spin';
import IView from '@interfaces/view.interfaces';
import {BackButtonComponent} from "../../../components/miscellaneous/back-button/back-button.component";
import {NzButtonModule} from "ng-zorro-antd/button";
import {NzPageHeaderModule} from "ng-zorro-antd/page-header";
import {NzWaveModule} from "ng-zorro-antd/core/wave";
import {TranslateModule} from "@ngx-translate/core";
import {lastValueFrom} from "rxjs";

@Component({
    selector: 'app-ngd-barcoding-page',
    imports: [
        CommonModule,
        NgdBarcodingComponent,
        NzSpinModule,
        BackButtonComponent,
        NzButtonModule,
        NzPageHeaderModule,
        NzWaveModule,
        TranslateModule,
    ],
    templateUrl: './ngd-barcoding-page.component.html',
    styleUrls: ['./ngd-barcoding-page.component.sass']
})
export class NgdBarcodingPageComponent implements OnInit, IView {

  BREADCRUMB_NAME: string | { key: string; params: any; } = 'NGD Bardcoding';

  loading = false;
  data: INgdBarcodingData;
  requestUrl: string;
  alnUrl: string;

  constructor(
    private readonly activatedRoute: ActivatedRoute,
    private readonly backendService: BackendService,
    private readonly modalInfoService: ModalInfoService,
    private readonly router: Router,
  ) {
  }

  async ngOnInit(): Promise<void> {
    this.loading = true;
    this.requestUrl = this.activatedRoute.snapshot.queryParams.requestUrl;
    this.alnUrl = this.activatedRoute.snapshot.queryParams.alnUrl;
    if (this.requestUrl) {
      this.data = await this.getDataToRequest();
    } else {
      this.router.navigate(['']);
    }
    this.loading = false;
  }

  async getDataToRequest(): Promise<INgdBarcodingData | null> {
    try {
      if (this.requestUrl) {
        const response: string = await lastValueFrom(this.backendService.createHttpGet(this.requestUrl, null, 'text'), { defaultValue: undefined }) as any;
        return JSON.parse(response);
      }
    } catch (e) {
      this.modalInfoService.showModalInfoDefaultError(e);
    }
    return null;
  }

}
