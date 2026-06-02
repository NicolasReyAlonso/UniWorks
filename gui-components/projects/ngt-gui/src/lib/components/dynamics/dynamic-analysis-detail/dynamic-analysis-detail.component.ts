import {AfterViewInit, Component, EventEmitter, OnInit, Output, TemplateRef, ViewChild} from '@angular/core';
import {BackendService} from 'ngt-gui/core';import {ActivatedRoute, Router} from '@angular/router';
import {FormsModule, ReactiveFormsModule, UntypedFormBuilder, UntypedFormGroup} from '@angular/forms';
import {AuthService} from "ngt-gui/core";
import {MessageLogService} from 'ngt-gui/core';
import {NotificationService, TypeNotificationEnum} from 'ngt-gui/core';
import { GlobalService } from 'ngt-gui/core';
import * as FileSaver from 'file-saver';
import {NzModalService} from 'ng-zorro-antd/modal';
import {
  AnnotationsFormComponent
} from 'src/app/components/data/annotations/annotations-form/annotations-form.component';
import {FilesService} from 'src/app/services/files.service';
import OBJECT_TYPES from 'src/app/constants/object-types.constants';
import {CommonModule} from "@angular/common";
import {NzSelectModule} from "ng-zorro-antd/select";
import {SharedModule} from "../../../shared-module/shared.module";
import {NzTabsModule} from "ng-zorro-antd/tabs";
import {BOCardComponent} from "../../miscellaneous/bo-card/bo-card.component";
import {NzTableModule} from "ng-zorro-antd/table";
import {NzSpinModule} from "ng-zorro-antd/spin";
import {NzButtonModule} from "ng-zorro-antd/button";
import {NzFormModule} from "ng-zorro-antd/form";
import {NzDatePickerModule} from "ng-zorro-antd/date-picker";
import {DisableControlDirective} from "../../../directives/disable-control.directive";
import {NzPageHeaderModule} from "ng-zorro-antd/page-header";
import {BackButtonComponent} from "../../miscellaneous/back-button/back-button.component";
import {NzInputModule} from "ng-zorro-antd/input";
import {DynamicTableObjectsComponent} from "../dynamic-table-objects/dynamic-table-objects.component";

@Component({
    imports: [
        CommonModule,
        SharedModule,
        FormsModule,
        ReactiveFormsModule,
        NzSelectModule,
        NzTabsModule,
        NzTableModule,
        NzSpinModule,
        NzButtonModule,
        NzFormModule,
        NzDatePickerModule,
        NzPageHeaderModule,
        NzInputModule,
        BackButtonComponent,
        BOCardComponent,
        AnnotationsFormComponent,
        DisableControlDirective,
        DynamicTableObjectsComponent,
    ],
    selector: 'app-dynamic-analysis-detail',
    templateUrl: './dynamic-analysis-detail.component.html',
    styleUrls: ['./dynamic-analysis-detail.component.sass']
})
export class DynamicAnalysisDetailComponent implements OnInit, AfterViewInit {

  analysis;
  generalFormGroup: UntypedFormGroup;
  loadingGeneral = false;
  sequences: any[] = [];

  baseUrl;
  format = 'fasta';
  editing = false;
  features: any = [];
  processes: any = [];
  objType = 'analysis';
  urlMSA;
  selectedFormat = null;
  generalFormGroupChange = false;
  @ViewChild('annotationsForm', {static: false}) annotationsForm: AnnotationsFormComponent;
  @Output() changeNameEvent = new EventEmitter<string>();
  headerTableCasesStudiesAndCollections = [
    {
      variable: 'name',
      translation: 'DYNAMIC_TABLE_OBJECTS.NAME_TH'
    }
  ]

  constructor(
    private backendService: BackendService,
    private router: Router,
    private readonly activatedRoute: ActivatedRoute,
    private readonly fb: UntypedFormBuilder,
    public readonly authService: AuthService,
    private readonly messageLogService: MessageLogService,
    private readonly notificationService: NotificationService,
    private readonly globalVariablesServices: GlobalService,
    private readonly modalService: NzModalService,
    private readonly filesService: FilesService
  ) {
    const analysis = this.activatedRoute.snapshot.data.analysis;
  }

  async ngOnInit(): Promise<void> {
    this.loadingGeneral = true;
    this.analysis = this.activatedRoute.snapshot.data.analysis;
    console.log(this.analysis);
    this.objType = this.analysis.object_type;
    this.initGeneralFormGroup();
    this.baseUrl = this.globalVariablesServices.getParameter('host') + this.globalVariablesServices.getParameter('api_prefix');
    this.urlMSA = `${this.baseUrl}/bos/analyses/${this.analysis.analysis_id}.fasta`;
    this.generalFormGroup.get('name').setValue(this.analysis.name ? this.analysis.name : '');
    this.changeNameEvent.emit(this.generalFormGroup.get('name').value);
    this.generalFormGroup.get('description').setValue(this.analysis.description ? this.analysis.description : '');
    this.loadingGeneral = false;
  }

  async ngAfterViewInit(): Promise<void> {
    this.annotationsForm.object_uuid = this.analysis.uuid;
    this.annotationsForm.loadAnnotations();
  }

  initGeneralFormGroup() {
    this.generalFormGroup = this.fb.group({
      analysis_id: [{value: this.analysis.analysis_id, disabled: true}],
      name: [''],
      program: [{value: this.analysis.program, disabled: true}],
      programversion: [{value: this.analysis.programversion, disabled: true}],
      algorithm: [{value: this.analysis.algorithm, disabled: true}],
      sourcename: [{value: this.analysis.sourcename, disabled: true}],
      sourceuri: [{value: this.analysis.sourceuri, disabled: true}],
      sourceversion: [{value: this.analysis.sourceversion, disabled: true}],
      timeexecuted: [{value: this.analysis.timeexecuted, disabled: true}],
      seqlen: [{value: this.analysis.seqlen, disabled: true}],
      seqnum: [{value: this.analysis.seqnum ?? this.analysis.sequences.length, disabled: true}],
      description: ['']
    });
    this.generalFormGroup.valueChanges.subscribe((change) => {
      this.generalFormGroupChange = true;
    });
  }

  isDisableEdit() {
    return !this.authService.havePermission('gui-ma-edit');
  }

  async updateAnalysis() {
    const value = {
      name: this.generalFormGroup.get('name').value,
      description: this.generalFormGroup.get('description').value,
    };
    this.loadingGeneral = true;
    try {
      const updateResponse: any = await this.backendService.putFromChado(this.objType, this.analysis.analysis_id, value).toPromise();
      this.messageLogService.addIssues(updateResponse.issues);
      this.changeNameEvent.emit(this.generalFormGroup.get('name').value);
      await this.resetGeneralFormGroup();
    } catch (e) {
      if (e.issues) {
        this.messageLogService.addIssues(e.issues);
      }
      this.notificationService.createNotificationWithType(
        TypeNotificationEnum.error,
        'MOLECULAR_DATA.ANALYSES.DETAIL.GENERAL_TAB.ERROR_UPDATE_NOTIFICATION.TITLE',
        'MOLECULAR_DATA.ANALYSES.DETAIL.GENERAL_TAB.ERROR_UPDATE_NOTIFICATION.CONTENT',
        'bottomRight'
      ).then();
    }
    this.loadingGeneral = false;
  }

  async cancelModifyAnalysis() {
    this.loadingGeneral = true;
    try {
      await this.resetGeneralFormGroup();
    } catch (e) {
      console.log(e);
      if (e.issues) {
        this.messageLogService.addIssues(e.issues);
      }
    }
    this.loadingGeneral = false;
  }

  async resetGeneralFormGroup(): Promise<void> {
    const responseAnalysis: any = await this.backendService.getGenericRequest(this.objType, this.analysis.analysis_id).toPromise();
    const analysis = responseAnalysis.content;
    this.messageLogService.addIssues(responseAnalysis.issues);
    this.analysis.name = analysis.name ? analysis.name : '';
    this.analysis.description = analysis.description ? analysis.description : '';
    this.generalFormGroup.get('name').setValue(this.analysis.name);
    this.generalFormGroup.get('description').setValue(this.analysis.description);
    this.generalFormGroupChange = false;
  }

  getSequencesById(id) {
    return this.sequences.find((value) => {
      return value.feature_id === id;
    });
  }

  navigateSequence(id) {
    if (!this.authService.havePermission('gui-seq-read')) {
      return;
    }
    this.router.navigate(['sequenceDetail', id]);
  }

  navigateOrganism(id) {
    if (!this.authService.havePermission('gui-organism-read')) {
      return;
    }
    this.router.navigate(['organismDetail', id]);
  }

  navigateAnalysis(a) {
    if (!this.authService.havePermission('gui-analysis-read')) {
      return;
    }
    let url = '';
    if (a.object_type) {
      url = OBJECT_TYPES[a.object_type].pageDetail;
    }
    this.router.navigate([url ?? 'analysisDetail', a.analysis_id]);
  }

  navigateIndividual(id: any) {
    if (!this.authService.havePermission('gui-individual-read')) {
      return;
    }
    this.router.navigate(['individualDetail', id]);
  }

  exportAnalysis(form: TemplateRef<any>): void {
    this.modalService.confirm({
      nzTitle: '<i>¿En qué formato desea realizar la descarga?</i>',
      nzContent: form,
      nzCentered: true,
      nzOnOk: () => {
        this.backendService.exportFromChado(this.objType ?? 'analyses', this.analysis.analysis_id, this.selectedFormat).subscribe(
          (response: any) => {
            FileSaver.saveAs(new Blob([response]), `analyses.${this.selectedFormat}`);
          }, error => {
            this.messageLogService.addIssues(error.issues);
          }, () => {
          });
      }
    });
  }

  goSubTreeView(id): void {
    this.router.navigate(['archaeopteryxBrowser'], {
      queryParams: {
        url: this.filesService.getFileFromBosRequestUrl('phylotrees',
          this.analysis.analysis_id, 'newick', {phylotree_id: id})
      }
    });
  }

  goJobDetail() {
    this.router.navigate(['process/processDetail', this.generalFormGroup.get('sourcename').value]);
  }
}

