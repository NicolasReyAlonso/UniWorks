import {AfterViewInit, Component, Input, ViewEncapsulation} from '@angular/core';
import {FilesService} from "src/app/services/files.service";
import {BackendService} from 'ngt-gui/core';import {ModalInfoService} from "src/app/services/modal-info.service";
import { CommonModule } from '@angular/common';
import {NzIconModule} from "ng-zorro-antd/icon";
import {SharedModule} from "../../../shared-module/shared.module";
import {NzButtonModule} from "ng-zorro-antd/button";
import {NzCollapseModule} from "ng-zorro-antd/collapse";

@Component({
    selector: 'app-process-log',
    imports: [
        CommonModule,
        NzIconModule,
        SharedModule,
        NzButtonModule,
        NzCollapseModule,
    ],
    templateUrl: './process-log.component.html',
    styleUrls: ['./process-log.component.sass'],
    encapsulation: ViewEncapsulation.None
})
export class ProcessLogComponent implements AfterViewInit {

  @Input() jobId;
  textFormatted: string;

  constructor(
    private readonly filesService: FilesService,
    private readonly backendService: BackendService,
    private readonly modalInfoService: ModalInfoService,
  ) {

  }

  async ngAfterViewInit(): Promise<void> {
    const url = this.filesService.getFileFromJobRequestUrl(this.jobId, 'jobs.stdout.log');
    try {
      const response: any = await (this.backendService.createHttpGet(url, null, 'text/plain').toPromise());
      this.formatLogToHTML(response);
    } catch (e) {
      this.modalInfoService.showModalInfoDefaultError(e);
    }
  }

  async downloadFile(event: MouseEvent): Promise<void> {
    event.stopPropagation();
    this.filesService.downloadJobResult(this.jobId, 'jobs.stdout.log');
  }

  formatLogToHTML(log: string): void {
    let output = '';
    output = log;
    output = output.substring(1);
    output = output.split('<NGD_STDERR>\n</NGD_STDERR>').join('');
    output = output.split('<NGD_STDOUT>\n').join('<div class="log-stdout">');
    output = output.split('\n</NGD_STDOUT>').join('</div>');
    output = output.split('<NGD_STDERR>\n').join('<div class="log-stderr">');
    output = output.split('\n</NGD_STDERR>').join('</div>');
    output = output.split('\n').map( (element) => {
      return element.startsWith('<div class="log-stdout">#') ? `${element.substring(0, 24)}<div class="log-stdout-title">${element.substring(24)}</div>` : element;
    }).join('\n');
    output = output.replace(/\n+/g, "<br>");
    output = `<code class="log-code">${output}</code>`;
    this.textFormatted = output;
  }
}
