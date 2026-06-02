import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { CommonModule } from '@angular/common';
import {NextgendemMsaBrowserComponent} from "../../../components/display/nextgendem-msa-browser/nextgendem-msa-browser.component";

@Component({
    selector: 'app-nextgendem-msa-page',
    imports: [
        CommonModule,
        NextgendemMsaBrowserComponent,
    ],
    templateUrl: './nextgendem-msa-page.component.html',
    styleUrls: ['./nextgendem-msa-page.component.sass']
})
export class NextgendemMsaPageComponent implements OnInit {

  url: string;
  analysis_id: number;
  idView: number;

  BREADCRUMB_NAME = {
    key: 'MOLECULAR_DATA.MULTIPLE_ALIGNMENTS.NUCLEOTIDE_EDITOR.BREADCRUMB',
    params: {}
  };

  constructor(
    private readonly route: ActivatedRoute,
    private readonly router: Router,
  ) { }

  ngOnInit(): void {
    if ((!this.route.snapshot.queryParams['url'] || !this.route.snapshot.queryParams['analysis_id']) &&
      !this.route.snapshot.queryParams['view_id']) {
      this.router.navigate(['home']);
    }
    this.url = this.route.snapshot.queryParams['url'];
    this.analysis_id = this.route.snapshot.queryParams['analysis_id'];
    this.idView = this.route.snapshot.queryParams['view_id'];
  }
}

