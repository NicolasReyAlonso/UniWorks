import {AfterContentInit, ChangeDetectorRef, Component, OnInit, ViewChild, Inject} from '@angular/core';
import {FilesServiceInterface, FILES_SERVICE_TOKEN} from "ngt-gui/core";
import {GlobalServiceInterface, GLOBAL_SERVICE} from "ngt-gui/core";
import { HttpClient } from "@angular/common/http";
import {ModalInfoService} from "ngt-gui/gui";
import {ActivatedRoute} from "@angular/router";
import {Location} from '@angular/common';
import {NextgendemMissingEditorComponent} from "src/app/components/display/nextgendem-missing-editor/nextgendem-missing-editor.component";
import IView from "../../../../interfaces/view.interfaces";
import {BackendService} from 'ngt-gui/core';import { CommonModule } from '@angular/common';
import {forkJoin, lastValueFrom} from "rxjs";

@Component({
    selector: 'app-alignment-nextgendem-missing-editor',
    imports: [
        CommonModule,
        NextgendemMissingEditorComponent,
    ],
    templateUrl: './alignment-nextgendem-missing-editor.component.html',
    styleUrls: ['./alignment-nextgendem-missing-editor.component.sass']
})
export class AligmentNextgendemMissingEditorComponent implements OnInit, IView {

  BREADCRUMB_NAME = {
    key: 'MOLECULAR_DATA.MULTIPLE_ALIGNMENTS.NEXTGENDEM_MISSING_VALUES.BREADCRUMB',
    params: {},
  }

  fastaText;
  id;
  requestURL;
  requestParams;
  seqLen = []
  @ViewChild(NextgendemMissingEditorComponent) nextgendemMissingEditorComponent: NextgendemMissingEditorComponent;

  constructor(
    @Inject(FILES_SERVICE_TOKEN) private readonly filesService: FilesServiceInterface,
    @Inject(GLOBAL_SERVICE) private readonly globalVariablesServices: GlobalServiceInterface,
    private readonly httpClient: HttpClient,
    private modalInfoService: ModalInfoService,
    private cd: ChangeDetectorRef,
    private readonly activatedRoute: ActivatedRoute,
    private readonly location: Location,
    private readonly backendService: BackendService,
  ) {
  }

  async ngOnInit(): Promise<void> {
    this.id = this.activatedRoute.snapshot.params.id;
    if (!this.id) {
      this.BREADCRUMB_NAME.key = 'MOLECULAR_DATA.MULTIPLE_ALIGNMENTS.NEXTGENDEM_MISSING_VALUES.BREADCRUMB_NOT_ID'
    }
    this.requestURL = this.activatedRoute.snapshot.queryParams.requestURL;
    this.requestParams = this.activatedRoute.snapshot.queryParams.requestParams;
    this.BREADCRUMB_NAME.params['name'] = `${this.id}`;
    await this.getFasta();
    this.cd.detectChanges();
  }

  async getFasta(): Promise<void> {
    try {
      let url, responseType, params, Accept;
      if (this.id) {
        url = this.filesService.getFileFromBosRequestUrl('alignments', this.id, 'fasta');
        responseType = 'text';
      } else if (this.requestURL) {
        url = this.requestURL;
        params = this.requestParams ? JSON.parse(this.requestParams) : null;
        Accept = 'text/fasta';
        responseType = 'text';
      }
      if (url) {
        let concat = params.concat
        if (concat) {
          const requests = {}
          concat = concat.substring(1)
          concat = concat.substring(0, concat.length - 1)
          concat = concat.split(',')
          if (concat.length > 0) {
            const requests = {}
            concat.forEach(element => {
              requests[element] = this.backendService.getAlignments(element)
            })
            const responseAlignments: any = await lastValueFrom(forkJoin(requests))
            let auxStartSequenceLen = 0;
            Object.keys(responseAlignments).forEach((element, index) => {
              const alignment = responseAlignments[element].content
              this.seqLen.push({name: alignment.name,seqLen: alignment.seqlen, startSequenceLen: auxStartSequenceLen, endSequenceLen: auxStartSequenceLen + alignment.seqlen})
              auxStartSequenceLen += alignment.seqlen;
            })
            this.seqLen.push({name: 'all', seqLen: auxStartSequenceLen, startSequenceLen: 0, endSequenceLen: auxStartSequenceLen})
          }
        }
        const response: string = await lastValueFrom(this.backendService.createHttpGet(url, params, responseType, Accept), { defaultValue: undefined }) as any;
        this.fastaText = response;
      }
    } catch (e) {
      this.modalInfoService.showModalInfoError(e);
    }
  }

  newAlignmentEvent(event) {
    this.location.replaceState(`/alignmentNextgendemMissingEditor/${event.analysisId}`);
    this.nextgendemMissingEditorComponent.analysisId = event.analysisId;
    this.id = event.analysisId;
    this.BREADCRUMB_NAME.params['name'] = `${this.id}`;
  }

}

