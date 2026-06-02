import {Component, Input} from '@angular/core';
import { CommonModule } from '@angular/common';
import {NzDescriptionsModule} from "ng-zorro-antd/descriptions";
import {NzButtonModule} from "ng-zorro-antd/button";
import {RouterModule} from "@angular/router";
import {NzCardModule} from "ng-zorro-antd/card";

@Component({
    selector: 'app-bo-card',
    imports: [
        CommonModule,
        NzDescriptionsModule,
        NzButtonModule,
        NzCardModule,
        RouterModule,
    ],
    templateUrl: './bo-card.component.html',
    styleUrls: ['./bo-card.component.sass']
})
export class BOCardComponent {
  @Input() data: any = {};
  @Input() type: string = '';

  getDetailsRoute() {
    switch (this.type) {
      case 'sequence':
        return `/${this.type}Detail/${this.data.feature_id}`;
      case 'alignment':
        return `/${this.type}Detail/${this.data.analysis_id}`;
      case 'phylotree':
        return `/${this.type}Detail/${this.data.analysis_id}`;
      case 'analysis':
        return `/${this.type}Detail/${this.data.analysis_id}`;
      case 'taxonomy':
        return `/${this.type}Detail/${this.data.phylotree_id}`;
      case 'organism':
        return `/${this.type}Detail/${this.data.organism_id}`;
      case 'ontology':
        return `/${this.type}Detail/${this.data.cv_id}`;
      case 'cvterm':
        return `/${this.type}Detail/${this.data.cvterm_id}`;
      case 'db':
        return `/${this.type}Detail/${this.data.db_id}`;
      case 'dbxref':
        return `/${this.type}Detail/${this.data.dbxref_id}`;
      default:
        return '';
    }
  }
}
