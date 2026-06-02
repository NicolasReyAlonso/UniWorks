import {Component, OnInit} from '@angular/core';
import { CommonModule } from '@angular/common';
import IView from "../../../../interfaces/view.interfaces";
import {DynamicBrowseComponent} from "../../../../components/dynamics/dynamic-browse/dynamic-browse.component";

@Component({
  selector: 'app-blast-results-browse',
  standalone: true,
  imports: [
    CommonModule,
    DynamicBrowseComponent,
  ],
  templateUrl: './blast-results-browse.component.html',
  styleUrls: ['./blast-results-browse.component.sass']
})
export class BlastResultsBrowseComponent implements OnInit, IView {

  loading = false;
  BREADCRUMB_NAME = 'MOLECULAR_DATA.BLAST.BROWSER.BREADCRUMB';

  constructor() {
  }

  ngOnInit(): void {
  }

}
