import {AfterViewInit, Component, Input, OnInit} from '@angular/core';
import {CommonModule} from "@angular/common";
import {NzTabsModule} from "ng-zorro-antd/tabs";
import {NzSelectModule} from "ng-zorro-antd/select";
import {FormsModule, ReactiveFormsModule} from "@angular/forms";

@Component({
    imports: [
        CommonModule,
        FormsModule,
        ReactiveFormsModule,
        NzTabsModule,
        NzSelectModule,
    ],
    selector: 'app-blasterjs',
    templateUrl: './blasterjs.component.html',
    styleUrls: ['./blasterjs.component.sass']
})
export class BlasterjsComponent implements OnInit, AfterViewInit {

  @Input('blasterString') blasterString: string = "";
  selectSequenceOptions = [];
  selectSequenceValue;
  instance;

  constructor() {
  }

  ngOnInit(): void {

  }

  ngAfterViewInit() {
    const blasterjs = require("biojs-vis-blasterjs");
    this.instance = new blasterjs({
      string: this.blasterString,
      multipleAlignments: "blast-multiple-alignments",
      alignmentsTable: "blast-alignments-table",
      singleAlignment: "blast-single-alignment",
      onSelectCreated: () => {
        this.selectSequenceOptions = this.instance.selectOptions;
        this.selectSequenceValue = 0;
      }
    });
  }

  onSelectSequenceChange(value) {
    this.instance.customGoToQuery(value);
  }

}
