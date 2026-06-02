import {Component, OnInit} from '@angular/core';
import { CommonModule } from '@angular/common';
import IView from "../../../../interfaces/view.interfaces";
import {DynamicAnalysisDetailComponent} from "../../../../components/dynamics/dynamic-analysis-detail/dynamic-analysis-detail.component";

@Component({
  selector: 'app-blast-result-detail',
  standalone: true,
  imports: [
    CommonModule,
    DynamicAnalysisDetailComponent,
  ],
  templateUrl: './blast-result-detail.component.html',
  styleUrls: ['./blast-result-detail.component.sass']
})
export class BlastResultsBrowseComponent implements OnInit, IView {

  loading = false;
  BREADCRUMB_NAME = 'MOLECULAR_DATA.BLAST.BROWSER.BREADCRUMB';

  constructor() { }

  ngOnInit(): void {
  }

}

