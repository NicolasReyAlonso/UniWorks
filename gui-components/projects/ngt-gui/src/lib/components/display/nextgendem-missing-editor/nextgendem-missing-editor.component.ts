import {AfterViewInit, Component, EventEmitter, Input, OnDestroy, OnInit, Output, ViewChild} from '@angular/core';
import {v4 as uuidv4} from 'uuid';
import * as d3 from 'd3';
import Plotly from 'plotly.js-dist-min'
import {ModalInfoService} from "src/app/services/modal-info.service";
import {NotificationService, TypeNotificationEnum} from "src/app/services/notification.service";
import {FilesService} from "src/app/services/files.service";
import {BackendService} from 'ngt-gui/core';import {MessageLogService} from "src/app/services/message-log.service";
import {DynamicInputModalComponent} from "src/app/components/dynamics/dynamic-input-modal/dynamic-input-modal.component";
import { CommonModule } from '@angular/common';
import {SharedModule} from "../../../shared-module/shared.module";
import {NzTabsModule} from "ng-zorro-antd/tabs";
import {NzSelectModule} from "ng-zorro-antd/select";
import {FormsModule, ReactiveFormsModule} from "@angular/forms";
import {NzSpinModule} from "ng-zorro-antd/spin";
import {NzDropDownModule} from "ng-zorro-antd/dropdown";
import {NzButtonModule} from "ng-zorro-antd/button";
import {NzInputModule} from "ng-zorro-antd/input";
import {NzIconModule} from "ng-zorro-antd/icon";
import {NzRadioModule} from "ng-zorro-antd/radio";

@Component({
    selector: 'app-nextgendem-missing-editor',
    imports: [
        CommonModule,
        FormsModule,
        ReactiveFormsModule,
        SharedModule,
        NzTabsModule,
        NzSelectModule,
        NzSpinModule,
        NzButtonModule,
        NzInputModule,
        NzDropDownModule,
        NzIconModule,
        NzRadioModule,
        DynamicInputModalComponent,
    ],
    templateUrl: './nextgendem-missing-editor.component.html',
    styleUrls: ['./nextgendem-missing-editor.component.sass']
})
export class NextgendemMissingEditorComponent implements OnInit, AfterViewInit, OnDestroy {
  @Input() fastaText = "";
  @Input() analysisId;
  @Input() seqLen = []
  @Output() newAlignmentEvent = new EventEmitter<{analysisId: string}>();

  data: any[] = [];
  seqLenSelected = 0;
  id = uuidv4();
  rangeNucleotidesGroups = 50;
  maximumNucleotidePosition = 0;
  sequenceElementContainer: HTMLElement;
  minimumRange = 0;
  numberOfNucleotidesStatus = '';
  numberOfNucleotidesTypeError: { message: string, params?: any } = null;
  removeNucleotidesInitialIndex = "";
  removeNucleotidesFinalIndex = "";
  removeNucleotidesInputStatus = "";
  removeNucleotidesTypeError: { message: string, params?: any } = null;
  history: { type: string, data: any }[] = [];
  countType = '-?';
  selectedSequencesDelete = [];
  loading = true;
  layout: Partial<Plotly.Layout>;

  //Modal
  modalTitle = 'NEXTGENDEM_MISSING_EDITOR.NEW_ALIGNMENT_MODAL.TITLE';
  modalFields;
  isVisibleModal = false;
  typeModal = '';
  @ViewChild(DynamicInputModalComponent) dynamicInputModalComponent: DynamicInputModalComponent;


  constructor(
    private readonly modalInfoService: ModalInfoService,
    private readonly notificationService: NotificationService,
    private readonly filesService: FilesService,
    private readonly backendService: BackendService,
    private readonly messageLogSerivce: MessageLogService,
  ) {
  }

  async ngOnInit(): Promise<void> {

  }

  ngOnDestroy() {
    this.sequenceElementContainer.innerHTML = '';
  }

  calculate_min_range(): void {
    const maximum_data_points = 250000;
    const aln_seqs = this.data.length;
    const aln_length = this.data[0].sequences.length;
    const max_width = maximum_data_points / aln_seqs;
    this.minimumRange = Math.ceil(aln_length / max_width);
  }

  async ngAfterViewInit(): Promise<void> {
    await this.parseFasta2Data();
    this.calculate_min_range();
    this.rangeNucleotidesGroups = Math.max(this.rangeNucleotidesGroups, this.minimumRange);
    this.sequenceElementContainer = document.getElementById(`${this.id}`);
    await this.restartNucleotidesHeatmap();
  }

  async parseFasta2Data(): Promise<void> {
    let counterSequences = -1;
    this.fastaText.split('\n').map((line) => {
      if (line.startsWith('>')) {
        counterSequences++;
        this.data[counterSequences] = {name: line, sequences: []};
      } else {
        this.data[counterSequences].sequences.push(...line.split(''));
        this.maximumNucleotidePosition = this.data[counterSequences].sequences.length > this.maximumNucleotidePosition ? this.data[counterSequences].sequences.length : this.maximumNucleotidePosition;
      }
    });
  }

  parseData2Fasta(): string {
    let fasta = '';
    let firstElement = true;
    for (const element of this.data) {
      if (firstElement) {
        firstElement = false;
      } else {
        fasta += '\n';
      }
      fasta += `${element.name}\n`;
      for (const nucleotide of element.sequences) {
        fasta += nucleotide;
      }
    }
    return fasta;
  }

  async restartNucleotidesHeatmap() {
    this.loading = true;
    setTimeout(async () => {
      this.sequenceElementContainer.innerHTML = '';
      const params = await this.calcNucleotidesHeatmapParams();
      await this.drawNucleotidesHeatmap(params);
      this.loading = false;
    }, 100);
    let changedYTicks = false;
    setTimeout(() => {
      const yticks = document.querySelectorAll('g.ytick text');
      for (let i = 0; i < yticks.length; i++) {
        yticks[i]['__data__'].text = `${yticks[i]['__data__'].text.substring(0,27)}...`;
        changedYTicks = true;
      }
    }, 100)
  }

  async calcNucleotidesHeatmapParams() {
    const params = {
      y: [],
      z: [],
      annotations: [],
      maximumNucleotidesIndex: 0,
    };
    let data = []
    if (this.seqLen.length > 0) {
      data = this.data.map(element => {
        const newElement = {...element}
        const sequences = element.sequences.slice(this.seqLen[this.seqLenSelected].startSequenceLen, this.seqLen[this.seqLenSelected].endSequenceLen)
        newElement.sequences = sequences
        return newElement
      })
    } else {
      data = [...this.data]
    }
    for (let elementIndex = 0; elementIndex < data.length; elementIndex++) {
      params.y.unshift(data[elementIndex].name);
      const groupsNucleotides = [];
      const chuckArrayInstance = this.chunkArray(data[elementIndex].sequences, this.rangeNucleotidesGroups);
      for (let nucleotidesIndex = 0; nucleotidesIndex < chuckArrayInstance.length; nucleotidesIndex++) {
        const missingValues = d3.count(chuckArrayInstance[nucleotidesIndex], (nucleotide) => {
          if (nucleotide === '-' && (this.countType === '-?' || this.countType === '-')) {
            return 1;
          }
          if (nucleotide === '?' && (this.countType === '-?' || this.countType === '?')) {
            return 1;
          }
          return null;
        });
        groupsNucleotides.push(missingValues);
        const colorText = missingValues < chuckArrayInstance[nucleotidesIndex].length / 2 ? 'black' : 'white';
        const result = {
          xref: 'x1',
          yref: 'y1',
          x: nucleotidesIndex,
          y: elementIndex,
          showarrow: false,
        };
        params.annotations.push(result);
        params.maximumNucleotidesIndex = nucleotidesIndex > params.maximumNucleotidesIndex ? nucleotidesIndex : params.maximumNucleotidesIndex;
      }
      params.z.unshift(groupsNucleotides);
    }
    return params
  }

  async drawNucleotidesHeatmap(params: any) {
    let countTypeText = '';
    switch (this.countType) {
      case '?':
        countTypeText = 'missing values'
        break;
      case '-':
        countTypeText = 'gaps'
        break;
      case '-?':
        countTypeText = 'gaps and missing values'
        break;
    }
    let data: Plotly.Data[] = [
      {
        z: params.z,
        y: params.y,
        xgap: 1,
        ygap: 1,
        type: 'heatmap',
        colorscale: [
          [0, '#d0d3d4'],
          [1, 'red'],
        ],
        showscale: false,
        hovertemplate: `Secuencia: %{y}<br>Catidad de ${countTypeText}: %{z}<br>Agrupación: %{x}`,
      }
    ];
    this.layout = {
      margin: {
        t: 0,
        r: 0,
        b: 40,
        l: 200
      },
      font: {//Family copied from other strings in the webpage
        family: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, "Noto Sans", "Liberation Sans", sans-serif, "Apple Color Emoji", "Segoe UI Emoji", "Segoe UI Symbol", "Noto Color Emoji"',
        size: 12
      },
      xaxis: {
        ticks: '',
        zeroline: false,
        showgrid: false,
        fixedrange: true,
      },
      yaxis: {
        automargin: true,
        zeroline: false,
        showgrid: false,
        fixedrange: true,
      },
      showlegend: false,
      autosize: false,
      width: params.maximumNucleotidesIndex * 20 + 200,
      height: this.data.length * 20 + 40,
      //annotations: params.annotations,
    };
    await Plotly.newPlot(this.sequenceElementContainer, data, this.layout);

  }

  chunkArray(arr, size): any[][] {
    return arr.length > size ? [arr.slice(0, size), ...this.chunkArray(arr.slice(size), size)] : [arr];
  }

  async changeRangeNucleotidesGroupsOnClick(target) {
    let value = parseInt(target.value);
    if (isNaN(value) || value < 1) {
      this.numberOfNucleotidesTypeError = {
        message: 'NEXTGENDEM_MISSING_EDITOR.INPUTS.NUMBER_NUCLEOTIDES_PER_GROUP.NOT_NUMBER_ERROR',
      };
      this.numberOfNucleotidesStatus = 'error';
      return;
    }
    if (value < this.minimumRange) {
      this.numberOfNucleotidesTypeError = {
        message: 'NEXTGENDEM_MISSING_EDITOR.INPUTS.NUMBER_NUCLEOTIDES_PER_GROUP.LESS_THAN_MINIMUM_ERROR',
        params: {
          number: this.minimumRange,
        }
      };
      this.numberOfNucleotidesStatus = 'error';
      return;
    }
    await this.changeRangeNucleotidesGroups(value);
    this.numberOfNucleotidesTypeError = null;
    this.numberOfNucleotidesStatus = '';
  }

  focusOutChangeRangeNucleotidesGroups(target): void {
    let value = parseInt(target.value);
    this.numberOfNucleotidesTypeError = null;
    this.numberOfNucleotidesStatus = '';
    if (isNaN(value) || value < 1) {
      target.value = this.rangeNucleotidesGroups;
      this.notificationService.createNotificationWithType(
        TypeNotificationEnum.error,
        'Error',
        'NEXTGENDEM_MISSING_EDITOR.INPUTS.NUMBER_NUCLEOTIDES_PER_GROUP.NOT_NUMBER_ERROR',
        'bottomRight'
      );
      target.value = this.rangeNucleotidesGroups;
    }
    if (value < this.minimumRange) {
      this.notificationService.createNotificationWithType(
        TypeNotificationEnum.error,
        'Error',
        'NEXTGENDEM_MISSING_EDITOR.INPUTS.NUMBER_NUCLEOTIDES_PER_GROUP.LESS_THAN_MINIMUM_ERROR',
        'bottomRight',
        {number: this.minimumRange},
      );
      target.value = this.rangeNucleotidesGroups;
    }
  }

  async changeRangeNucleotidesGroups(value) {
    this.rangeNucleotidesGroups = value;
    await this.restartNucleotidesHeatmap();
  }

  removeNucleotidesOnClick(initialTarget, finalTarget) {
    let initialValue = parseInt(initialTarget.value);
    let finalValue = parseInt(finalTarget.value);
    if (isNaN(initialValue) || isNaN(finalValue) || initialValue < 1 || finalValue < 1) {
      this.removeNucleotidesTypeError = {
        message: 'NEXTGENDEM_MISSING_EDITOR.INPUTS.DELETE_NUCLEOTIDES_PER_GROUP.NOT_NUMBER_ERROR',
      };
      this.removeNucleotidesInputStatus = 'error';
      return;
    }
    if (initialValue > finalValue) {
      this.removeNucleotidesTypeError = {
        message: 'NEXTGENDEM_MISSING_EDITOR.INPUTS.DELETE_NUCLEOTIDES_PER_GROUP.INITIAL_GREATER_THAN_FINAL',
      };
      this.removeNucleotidesInputStatus = 'error';
      return;
    }
    this.removeNucleotidesByNumberGroup(initialValue - 1, finalValue - 1);
    initialTarget.value = "";
    finalTarget.value = "";
  }

  async removeNucleotidesByNumberGroup(initialGroup, finalGroup) {
    const startIndex = initialGroup * this.rangeNucleotidesGroups;
    const deleteCount = (this.rangeNucleotidesGroups * (finalGroup + 1)) - startIndex;
    const newItemHistory = {
      type: 'removeNucleotides',
      data: {
        startIndex: startIndex,
        endIndex: startIndex + deleteCount - 1,
        elementsRemoves: [],
      }
    };
    for (let i = 0; i < this.data.length; i++) {
      const elementsRemove = this.data[i].sequences.splice(startIndex, deleteCount);
      newItemHistory.data.elementsRemoves.push(elementsRemove);
    }
    this.history.unshift(newItemHistory);
    this.calculate_min_range();
    await this.restartNucleotidesHeatmap();
  }


  async undoHistoryClick(index) {
    for (let i = 0; i <= index; i++) {
      switch (this.history[i].type) {
        case 'removeNucleotides':
          this.addNucleotidesByHistory(this.history[i]);
          break;
        case 'removeSequences':
          this.removeSequencesByHistory(this.history[i]);
          break;
      }
    }
    this.history.splice(0, index + 1);
    this.calculate_min_range();
    await this.restartNucleotidesHeatmap();
  }

  addNucleotidesByHistory(historyItem) {
    for (let i = 0; i < this.data.length; i++) {
      this.data[i].sequences.splice(historyItem.data.startIndex, 0, ...historyItem.data.elementsRemoves[i]);
    }
  }

  removeSequencesByHistory(historyItem) {
    const elementsRemoveSorts = [...historyItem.data.elementsRemoves].sort((a, b) => {
      return a.index - b.index
    });
    for (const element of elementsRemoveSorts) {
      this.data.splice(element.index, 0, element.element);
    }
  }

  async countTypeChange() {
    this.calculate_min_range();
    await this.restartNucleotidesHeatmap();
  }

  getArraySequencesNames(): string[] {
    return this.data.map(element => {
      return element.name;
    });
  }

  async sequencesDeleteClick() {
    const newItemHistory = {
      type: 'removeSequences',
      data: {
        elementsRemoves: [],
      }
    };
    const sortSelectedSequencesDelete = [...this.selectedSequencesDelete].sort((a, b) => {
      return b - a
    });
    for (let index of sortSelectedSequencesDelete) {
      const elementRemove = this.data.splice(index, 1);
      if (elementRemove.length === 1)
        newItemHistory.data.elementsRemoves.push({
          index,
          element: elementRemove[0],
        });
    }
    this.history.unshift(newItemHistory);
    this.calculate_min_range();
    await this.restartNucleotidesHeatmap();
    this.selectedSequencesDelete = [];
  }

  async exportImage(): Promise<void> {
    this.loading = true;
    await Plotly.downloadImage(this.sequenceElementContainer, {
      format: 'png',
      filename: `${uuidv4()}`,
      width: this.layout.width,
      height: this.layout.height
    });
    this.loading = false;
  }

  async exportFasta(): Promise<void> {
    this.filesService.convertStringToDownloadFile(`${uuidv4()}.fasta`, this.parseData2Fasta(), 'text/plain');
  }

  async importNewVersion(): Promise<void> {
    const blob = new Blob([this.parseData2Fasta()], {type: 'text/plain'})
    const file = new File([blob], 'missing-data-msa-editor', {type: "text/plain"});
    const params = {
      program: 'Summary Of Missing Data',
      programversion: '1.0'
    }
    try {
      const response = await this.backendService.putAlignments(this.analysisId, file, params).toPromise();
      this.messageLogSerivce.addIssues(response['issues']);
    } catch (e) {
      this.modalInfoService.showModalInfoDefaultError(e);
      this.messageLogSerivce.addIssues(e['issues']);
    }
  }

  async importNewAlignment(): Promise<void> {
    this.typeModal = 'newAlignment';
    this.modalFields = [{
      key: 'name',
      type: 'input',
      props: {
        required: true,
        label: 'Nombre'
      }
    }];
    this.dynamicInputModalComponent.model = {};
    this.isVisibleModal = true;
  }

  async saveNewAlignment(event) {
    const blob = new Blob([this.parseData2Fasta()], {type: 'text/plain'})
    const file = new File([blob], 'missing-data-msa-editor', {type: "text/plain"});
    const params = {
      program: 'Summary Of Missing Data',
      programversion: '1.0',
      name: event.name,
      algorithm: null,
      description: null
    }
    try {
      const response = await this.backendService.importAlignments([file], params).toPromise();
      const analysisId = response['content'][0]['analysis_id'];
      this.newAlignmentEvent.emit({analysisId})
      this.messageLogSerivce.addIssues(response['issues']);
    } catch (e) {
      this.modalInfoService.showModalInfoDefaultError(e);
      this.messageLogSerivce.addIssues(e['issues']);
    }
  }

  async saveModal(event): Promise<void> {
    switch (this.typeModal) {
      case 'newAlignment':
        await this.saveNewAlignment(event);
        break;
    }
  }

  async seqLenSelectedChange(event): Promise<void> {
    this.seqLenSelected = event
    await this.restartNucleotidesHeatmap();
  }


}

