import {Component, OnInit, Inject} from '@angular/core';
import {BackendService} from 'ngt-gui/core';import {
  UntypedFormGroup,
  UntypedFormControl,
  FormsModule,
  ReactiveFormsModule,
  AbstractControl,
  ValidationErrors
} from '@angular/forms';
import {MessageLogService} from 'ngt-gui/core';
import IView from '@interfaces/view.interfaces';
import {ActivatedRoute} from '@angular/router';
import { CommonModule } from '@angular/common';
import {SharedModule} from "ngt-gui/gui";
import {NzButtonModule} from "ng-zorro-antd/button";
import {NzDividerModule} from "ng-zorro-antd/divider";
import {NzUploadModule} from "ng-zorro-antd/upload";
import {NzRadioModule} from "ng-zorro-antd/radio";
import {NzFormModule} from "ng-zorro-antd/form";
import {NzSelectModule} from "ng-zorro-antd/select";
import {NzCollapseModule} from "ng-zorro-antd/collapse";
import {NzPageHeaderModule} from "ng-zorro-antd/page-header";
import {NzInputModule} from "ng-zorro-antd/input";
import {NzIconModule} from "ng-zorro-antd/icon";
import {NzCheckboxModule} from "ng-zorro-antd/checkbox";
import { SelectLazyLoadingComponent } from 'src/app/components/miscellaneous/select-lazy-loading/select-lazy-loading.component';
import {NzSwitchModule} from "ng-zorro-antd/switch";
import { MessageLogServiceInterface } from 'ngt-gui/core';
import { MESSAGE_LOG_SERVICE } from 'ngt-gui/core';
import { BackendServiceInterface } from 'ngt-gui/core';
import { BACKEND_SERVICE } from 'ngt-gui/core';

@Component({
    selector: 'app-sequences-import',
    imports: [
        CommonModule,
        FormsModule,
        ReactiveFormsModule,
        SharedModule,
        NzPageHeaderModule,
        NzButtonModule,
        NzDividerModule,
        NzUploadModule,
        NzRadioModule,
        NzFormModule,
        NzSelectModule,
        NzCollapseModule,
        NzInputModule,
        NzIconModule,
        NzCheckboxModule,
        SelectLazyLoadingComponent,
        NzSwitchModule,
    ],
    templateUrl: './sequences-import.component.html',
    styleUrls: ['./sequences-import.component.sass']
})
export class SequencesImportComponent implements OnInit, IView {

  BREADCRUMB_NAME = {
    key: 'MOLECULAR_DATA.SEQUENCES.IMPORT.BREADCRUMB',
    params: {
      name: '',
    }
  };

  constructor(
    @Inject(BACKEND_SERVICE) public backendService: BackendServiceInterface,
    @Inject(MESSAGE_LOG_SERVICE) private logService: MessageLogServiceInterface,
    private readonly activatedRoute: ActivatedRoute,
  ) {}

  fileList = [];
  data: any = {
    organisms: [],
    caseStudies: [],
    collections: [],
    genes: []
  };
  dataForm: UntypedFormGroup = new UntypedFormGroup({
    organism_id: new UntypedFormControl(),
    gene_tags: new UntypedFormControl(),
    case_study_id: new UntypedFormControl([]),
    collection_id: new UntypedFormControl([]),
    target_genes: new UntypedFormControl(),
    duplicates: new UntypedFormControl(''),
    no_annotations: new UntypedFormControl(false),
    split_genes: new UntypedFormControl(true),
  }, {
    validators: [

    ]
  });
  only_individuals = false;
  loading = false;

  ngOnInit(): void {
    this.data = this.activatedRoute.snapshot.data.data;
  }

  beforeUpload = (file): boolean => {
    this.fileList = this.fileList.concat(file);
    return false;
  }

  removeFile = (event): void => {
    for (let index = 0; index < this.fileList.length; index++) {
      if (event['uid'] == this.fileList[index]['uid']) {
        this.fileList.splice(index, 1);
      }
    }
  }

  importFiles(): void {
    this.loading = true;
    if(this.only_individuals) {
      this.backendService.importFromChado('individuals', this.fileList, undefined, this.dataForm.value).subscribe(
        {next: response => {
          this.logService.addIssues(response['issues']);
        }, error: error => {
          this.loading = false;
          this.logService.addIssues(error['issues']);
        }, complete: () => {
          this.loading = false;
          this.fileList = [];
        }});
    } else {
      this.backendService.importFromChado('sequences', this.fileList, undefined, this.dataForm.value).subscribe(
        {next: response => {
          this.logService.addIssues(response['issues']);
        }, error: error => {
          this.loading = false;
          this.logService.addIssues(error['issues']);
        }, complete: () => {
          this.loading = false;
          this.fileList = [];
        }});
    }
  }

  addGene(name: string) {
    if (!name) { return; }
    this.data.genes.push({value: name});
  }

  selectDynamicValueChange(event, field) {
    this.dataForm.get(field).setValue(event);
  }


}
