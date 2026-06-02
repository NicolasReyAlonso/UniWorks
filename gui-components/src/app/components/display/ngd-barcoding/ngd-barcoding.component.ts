import {Component, Input, OnInit} from '@angular/core';
import {CommonModule} from '@angular/common';
import {NzTableModule} from 'ng-zorro-antd/table';
import {KeyValueCustomPipe} from 'src/app/pipes/key-value-custom.pipe';
import {SharedModule} from 'src/app/shared-module/shared.module';
import {NzButtonModule} from 'ng-zorro-antd/button';
import {NzIconModule} from 'ng-zorro-antd/icon';
import {NzTabsModule} from "ng-zorro-antd/tabs";
import {Router} from "@angular/router";
import {
  NextgendemMsaBrowserComponent
} from "../../../components/display/nextgendem-msa-browser/nextgendem-msa-browser.component";
import {NzSelectModule} from "ng-zorro-antd/select";
import {FormsModule} from "@angular/forms";

export interface INgdBarcodingData {
  positions: { [key: string]: INgdBarcodingPosition[] },
  groups: { [key: string]: string[] },
}

export interface INgdBarcodingPosition {
  [key: string]: string,
}

@Component({
    selector: 'app-ngd-barcoding',
    imports: [
        CommonModule,
        SharedModule,
        NzTableModule,
        KeyValueCustomPipe,
        NzButtonModule,
        NzIconModule,
        NzTabsModule,
        NextgendemMsaBrowserComponent,
        NzSelectModule,
        FormsModule,
    ],
    templateUrl: './ngd-barcoding.component.html',
    styleUrls: ['./ngd-barcoding.component.sass']
})
export class NgdBarcodingComponent implements OnInit {

  @Input({required: true}) data: INgdBarcodingData;
  @Input() hiddenTitle = false;
  @Input() alnUrl = '';
  visualizing = false;
  expandDataTableSet = new Set<string>();
  expandDataTableGroupSet = new Set<string>();
  msaBrowserPositions = {};
  readonly dataTableHeader = [
    {
      text: 'NEXTGENDEM_BARCODING.DATA_TABLE.TAXON_TH'
    },
    {
      text: 'NEXTGENDEM_BARCODING.DATA_TABLE.POSITION_TH'
    },
    {
      text: 'NEXTGENDEM_BARCODING.DATA_TABLE.NUCLEOTIDE_TH'
    },
  ];
  readonly dataTableHeader2 = [
    {
      text: 'NEXTGENDEM_BARCODING.DATA_TABLE.POSITION_TH'
    },
    {
      text: 'NEXTGENDEM_BARCODING.DATA_TABLE.NUCLEOTIDE_TH'
    },
  ];
  readonly dataTableGroups = [
    {
      text: '',
      nzWidth: '60px',
    },
    {
      text: 'NEXTGENDEM_BARCODING.DATA_TABLE.GROUPS_TH'
    },
  ];
  readonly dataTablePositions = [
    {
      text: 'NEXTGENDEM_BARCODING.DATA_TABLE.POSITION_TH'
    },
    {
      text: 'NEXTGENDEM_BARCODING.DATA_TABLE.NUCLEOTIDE_TH'
    },
  ];
  readonly dataTableHeaderGroups = [
    {
      text: 'NEXTGENDEM_BARCODING.DATA_TABLE.GROUP_TH'
    },
    {
      text: 'NEXTGENDEM_BARCODING.DATA_TABLE.SEQUENCES_TH'
    },
  ];
  readonly dataTableHeaderSequences = [
    {
      text: 'NEXTGENDEM_BARCODING.DATA_TABLE.SEQUENCES_TH'
    },
  ];
  readonly dataTablecombinations = [
    {
      text: 'NEXTGENDEM_BARCODING.DATA_TABLE.TAXON_TH'
    },
    {
      text: 'NEXTGENDEM_BARCODING.DATA_TABLE.COMBINATION_TH'
    },
    {
      text: 'NEXTGENDEM_BARCODING.DATA_TABLE.POSITION_TH'
    },
    {
      text: 'NEXTGENDEM_BARCODING.DATA_TABLE.NUCLEOTIDE_TH'
    },
  ];
  readonly dataTablecombinations2 = [
    {
      text: 'NEXTGENDEM_BARCODING.DATA_TABLE.COMBINATION_TH'
    },
    {
      text: 'NEXTGENDEM_BARCODING.DATA_TABLE.POSITION_TH'
    },
    {
      text: 'NEXTGENDEM_BARCODING.DATA_TABLE.NUCLEOTIDE_TH'
    },
  ];
  groups: { [key: string]: string[] } = {};
  msaGroups: { [key: string]: string[] } = {};
  pures: { [key: string]: INgdBarcodingPosition[] } = {}
  combinations: { [key: string]: INgdBarcodingPosition[] } = {}
  numberOfCombinations = 0
  numberOfPures = 0
  selectedPure = null
  selectedCombination = null
  readonly rangedLengthPure = 1000
  readonly rangedLengthCombinations = 1000

  constructor(
    private readonly router: Router
  ) {
  }

  ngOnInit(): void {
    this.groups = this.data.groups
    const auxPures = {}
    const auxCombinations = {}
    let firstItemPure = false
    let firstItemCombination = false
    Object.keys(this.data.positions).forEach((k) => {
      let p = this.data.positions[k].filter((v) => Object.keys(v).length === 1);
      let c = this.data.positions[k].filter((v) => Object.keys(v).length > 1);
      if (p.length > 0)
        this.numberOfPures += p.length
      auxPures[k] = p;
      if (!firstItemPure) {
        this.selectedPure = k
        firstItemPure = true
      }
      if (c.length > 0)
        this.numberOfCombinations += c.length
      auxCombinations[k] = c
      if (!firstItemCombination) {
        this.selectedCombination = k
        firstItemCombination = true
      }
    });
    this.pures = { ...auxPures }
    this.combinations = { ...auxCombinations }
    console.log(this.combinations)
  }

  getNumPositionsInCombination(comb): number {
    let numPositions = 0;
    for (let c of comb) {
      numPositions += Object.keys(c).length;
    }
    return numPositions;
  }

  onExpandChange(sequence: string, checked: boolean): void {
    if (checked) {
      this.expandDataTableSet.add(sequence);
    } else {
      this.expandDataTableSet.delete(sequence);
    }
  }

  onExpandGroupChange(key: string, checked: boolean) {
    if (checked) {
      this.expandDataTableGroupSet.add(key);
    } else {
      this.expandDataTableGroupSet.delete(key);
    }
  }

  openSequence(item) {
    console.log(item)
    this.router.navigate(['sequenceDetail'], {queryParams: {uniquename: item}})
  }

  visualizePures() {
    this.msaBrowserPositions = {};
    for (let p of Object.keys(this.pures)) {
      this.msaBrowserPositions[p] = [];
      for (let posMap of this.pures[p]) {
        for (let pos of Object.keys(posMap)) {
          this.msaBrowserPositions[p].push(parseInt(pos));
        }
      }
    }
    this.msaGroups = this.groups;
    this.visualizing = true;
  }

  visualizeCombinations() {
    this.msaBrowserPositions = {};
    this.msaGroups = {};
    let comb_key = '';
    for (let p of Object.keys(this.combinations)) {
      for (let i = 0; i < this.combinations[p].length; i++) {
        comb_key = `${p}_DNC_${i + 1}`;
        this.msaGroups[comb_key] = this.groups[p];
        this.msaBrowserPositions[comb_key] = [];
        for (let pos of Object.keys(this.combinations[p][i])) {
          this.msaBrowserPositions[comb_key].push(parseInt(pos));
        }
      }
    }
    this.visualizing = true;
  }

  protected readonly Object = Object
}
