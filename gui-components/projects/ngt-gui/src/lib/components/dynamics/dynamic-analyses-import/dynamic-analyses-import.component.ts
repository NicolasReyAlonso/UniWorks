import {Component, Input, OnInit} from '@angular/core';
import {BackendService} from 'ngt-gui/core';import {FormsModule, ReactiveFormsModule, UntypedFormControl, UntypedFormGroup} from '@angular/forms';
import {ActivatedRoute} from '@angular/router';
import {MessageLogService} from 'src/app/services/message-log.service';
import IView from '@interfaces/view.interfaces';
import { CommonModule } from '@angular/common';
import {SharedModule} from "../../../shared-module/shared.module";
import {NzButtonModule} from "ng-zorro-antd/button";
import {NzDividerModule} from "ng-zorro-antd/divider";
import {NzUploadModule} from "ng-zorro-antd/upload";
import {NzFormModule} from "ng-zorro-antd/form";
import {NzSelectModule} from "ng-zorro-antd/select";
import {NzCollapseModule} from "ng-zorro-antd/collapse";
import {NzPageHeaderModule} from "ng-zorro-antd/page-header";
import {NzInputModule} from "ng-zorro-antd/input";
import {NzIconModule} from "ng-zorro-antd/icon";
import {SelectLazyLoadingComponent} from "../../miscellaneous/select-lazy-loading/select-lazy-loading.component";

@Component({
    selector: 'app-dynamic-analyses-import',
    imports: [
        CommonModule,
        SharedModule,
        FormsModule,
        ReactiveFormsModule,
        NzButtonModule,
        NzDividerModule,
        NzUploadModule,
        NzFormModule,
        NzSelectModule,
        NzCollapseModule,
        NzPageHeaderModule,
        NzInputModule,
        NzIconModule,
        SelectLazyLoadingComponent,
    ],
    templateUrl: './dynamic-analyses-import.component.html',
    styleUrls: ['./dynamic-analyses-import.component.sass']
})
export class DynamicAnalysesImportComponent implements OnInit, IView {

  constructor(public backendService: BackendService,
              private logService: MessageLogService,
              private activatedRoute: ActivatedRoute
  ) {}

  BREADCRUMB_NAME = {
    key: 'MOLECULAR_DATA.IMPORT.BREADCRUMB',
    params: {
      name: '',
    }
  };

  @Input('objectType') objectType: string;
  fileList = [];
  data: any = {
    organisms: [],
    caseStudies: [],
    collections: [],
    genes: []
  };
  loading = false;
  dataForm: UntypedFormGroup = new UntypedFormGroup({
    program: new UntypedFormControl(),
    programversion: new UntypedFormControl(),
    name: new UntypedFormControl(),
    algorithm: new UntypedFormControl(),
    description: new UntypedFormControl(),
    // organism_id: new FormControl(),
    // region: new FormControl(),
    derives_from: new UntypedFormControl([]),
    case_study_id: new UntypedFormControl([]),
    collection_id: new UntypedFormControl([]),
    gene_tags: new UntypedFormControl(),
    analysis_id: new UntypedFormControl(),
  });

  ngOnInit(): void {
    this.data = this.activatedRoute.snapshot.data.data;
  }

  beforeUpload = (file): boolean => {
    this.fileList = [file];
    return false;
  }

  removeFile = (event): void => {
    for (let index = 0; index < this.fileList.length; index++) {
      if (event['uid'] === this.fileList[index]['uid']) {
        this.fileList.splice(index, 1);
      }
    }
  }

  importFiles(): void {
    this.loading = true;
    const params = {};
    for (const [k, v] of Object.entries(this.dataForm.value)) {
      if (v && k !== 'analysis_id') { params[k] = v; }
    }
    this.backendService.importFromChado(this.objectType, this.fileList, this.dataForm.value.analysis_id, params).subscribe(
      response => {
        this.logService.addIssues(response['issues']);
      }, error => {
        this.loading = false;
        this.logService.addIssues(error['issues']);
      }, () => {
        this.loading = false;
        this.fileList = [];
      });
  }

  addGene(name: string) {
    if (!name) { return; }
    this.data.genes.push({value: name});
  }

  overwriteSelect(event) {
    this.data.analyses.forEach(e => {
      if (e.analysis_id == event) {
        this.dataForm.patchValue({
          name: e.name, program: e.program, programversion: e.programversion,
          algorithm: e.algorithm, description: e.description
        });
      }});
  }

  selectDynamicValueChange(event, field) {
    this.dataForm.get(field).setValue(event);
  }
}

