import { Component, Input, OnInit } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { MessageLogService } from "src/app/services/message-log.service";
import { HttpClient } from "@angular/common/http";
import { GlobalService } from 'ngt-gui/core';
import { CommonModule } from '@angular/common';

declare var MSABrowser: any
declare var MSAProcessor: any
@Component({
    selector: 'app-msa-browser',
    imports: [CommonModule],
    templateUrl: './msa-browser.component.html',
    styleUrls: ['./msa-browser.component.sass']
})
export class MsaBrowserComponent implements OnInit {

  @Input('Url') Url: string;

  private loading: boolean;
  constructor(
    private route: ActivatedRoute,
    private msg: MessageLogService,
    private http: HttpClient,
    private readonly globalVariablesServices: GlobalService,
  ) {
    this.loading = false;
  }

  ab2str(buf) {
    let str = "";
    for (let i = 0; i < buf.length; i++) {
      str += buf[i];
    }
    return str;
  }

  str2ab(str) {
    var buf = new ArrayBuffer(str.length * 2); // 2 bytes for each char
    var bufView = new Uint16Array(buf);
    for (var i = 0, strLen = str.length; i < strLen; i++) {
      bufView[i] = str.charCodeAt(i);
    }
    return buf;
  }

  ngOnInit(): void {
    this.loading = true;
    let viewer;
    this.msg.info('Cargando visor del fichero.');
    const textOption = { responseType: 'text' };
    const options = { ...this.globalVariablesServices.authOptions, ...textOption };
    console.log(this.Url);
    this.http.get(this.Url, options).subscribe(
      fasta => {
        let upperCaseFasta = this.ab2str(fasta).toUpperCase();

        viewer = new MSABrowser({
          id: "MSABrowserDemo",
          msa: MSAProcessor({
            fasta: upperCaseFasta,
            hasConsensus: false,
          }),
          title: "Alignment View",
          colorSchema: "nucleotide",
        });
        viewer.export('MSA_export.fasta');

      }, error => {
        this.loading = false;
        console.log(error);
        this.msg.error(error.message + '. No se pudo cargar el visor del fichero.');
      }, () => {
        this.loading = false;
        this.msg.info('Visor del fichero cargado.');
      });
  }

}

