import { Component, OnInit } from '@angular/core';
import IView from '@interfaces/view.interfaces';
import { CommonModule } from '@angular/common';
import {DynamicBrowseComponent} from "../../../../components/dynamics/dynamic-browse/dynamic-browse.component";

@Component({
    selector: 'app-discriminant-matrix-browse',
    imports: [
        CommonModule,
        DynamicBrowseComponent,
    ],
    templateUrl: './discriminant-matrix-browse.component.html',
    styleUrls: ['./discriminant-matrix-browse.component.sass']
})
export class DiscriminantMatrixBrowseComponent implements OnInit, IView {

  loading = false;
  BREADCRUMB_NAME = 'MOLECULAR_DATA.DISCRIMINANT_MATRIX.BROWSER.BREADCRUMB';

  constructor() { }

  ngOnInit(): void {
  }

}
