import {Component, OnInit} from '@angular/core';
import {ActivatedRoute} from '@angular/router';
import IView from '../../../../interfaces/view.interfaces';
import { CommonModule } from '@angular/common';
import {DynamicAnalysesImportComponent} from "ngt-gui/gui";

@Component({
    selector: 'app-alignments-import',
    imports: [
        CommonModule,
        DynamicAnalysesImportComponent,
    ],
    templateUrl: './alignments-import.component.html',
    styleUrls: ['./alignments-import.component.sass']
})
export class AlignmentsImportComponent implements OnInit, IView {
  private data: any;

  constructor(private activatedRoute: ActivatedRoute) {}

  BREADCRUMB_NAME = {
    key: 'MOLECULAR_DATA.MULTIPLE_ALIGNMENTS.IMPORT.BREADCRUMB',
    params: {
      name: '',
    }
  };

  ngOnInit(): void {
    this.data = this.activatedRoute.snapshot.data.data;
  }
}
