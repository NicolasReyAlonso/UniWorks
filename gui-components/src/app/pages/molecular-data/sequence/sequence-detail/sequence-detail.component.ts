import {AfterViewInit, Component, OnDestroy, OnInit, TemplateRef, ViewChild, Inject, NgZone} from '@angular/core';
import {ActivatedRoute, Router} from '@angular/router';
import {
  AuthServiceInterface,
  AUTH_SERVICE_TOKEN, 
  BackendServiceInterface,
  BACKEND_SERVICE,
  MESSAGE_LOG_SERVICE,
  MessageLogServiceInterface,
  NotificationServiceInterface,
  NOTIFICATION_SERVICE,
  StateServiceInterface,
  STATE_SERVICE,
  TypeNotificationEnum,
  GlobalService

} from 'ngt-gui/core';

import {SharedModule} from 'ngt-gui/gui';
import {
  AnnotationsFormComponent
} from 'ngt-gui/gui';
import IView from '@interfaces/view.interfaces';
import {FormsModule, ReactiveFormsModule, UntypedFormBuilder, UntypedFormGroup} from '@angular/forms';
import * as FileSaver from 'file-saver';
import {NzModalService} from 'ng-zorro-antd/modal';
import OBJECT_TYPES from 'src/app/constants/object-types.constants';
import {CommonModule} from "@angular/common";
import {NzSelectModule} from "ng-zorro-antd/select";
import {MsaBrowserComponent} from "src/app/components/display/msa/msa-browser/msa-browser.component";
import {NzCardModule} from "ng-zorro-antd/card";
import {NzTabsModule} from "ng-zorro-antd/tabs";
import {BOCardComponent} from "src/app/components/miscellaneous/bo-card/bo-card.component";
import {NzTableModule} from "ng-zorro-antd/table";
import {NzFormModule} from "ng-zorro-antd/form";
import {DisableControlDirective} from "src/app/directives/disable-control.directive";
import {NzSpinModule} from "ng-zorro-antd/spin";
import {NzPageHeaderModule} from "ng-zorro-antd/page-header";
import {BackButtonComponent} from "../../../../components/miscellaneous/back-button/back-button.component";
import {NzButtonModule} from "ng-zorro-antd/button";
import {NzInputModule} from "ng-zorro-antd/input";
import {NzDatePickerModule} from "ng-zorro-antd/date-picker";
import {
  SelectLazyLoadingComponent
} from 'src/app/components/miscellaneous/select-lazy-loading/select-lazy-loading.component';
import {lastValueFrom} from "rxjs";
import CKEditorAnnotations from 'src/app/components/data/annotations/ckeditor-annotations-form/build/ckeditor';

@Component({
    imports: [
        CommonModule,
        SharedModule,
        FormsModule,
        ReactiveFormsModule,
        NzSelectModule,
        NzCardModule,
        NzTabsModule,
        NzTableModule,
        NzFormModule,
        NzSpinModule,
        NzPageHeaderModule,
        NzButtonModule,
        NzInputModule,
        AnnotationsFormComponent,
        MsaBrowserComponent,
        BOCardComponent,
        DisableControlDirective,
        BackButtonComponent,
        NzDatePickerModule,
        SelectLazyLoadingComponent,
    ],
    selector: 'app-sequence-detail',
    templateUrl: './sequence-detail.component.html',
    styleUrls: ['./sequence-detail.component.sass']
})
export class SequenceDetailComponent implements OnInit, OnDestroy, AfterViewInit, IView {
  CkEditor = CKEditorAnnotations;
  BREADCRUMB_NAME = {
    key: 'MOLECULAR_DATA.SEQUENCES.DETAIL.BREADCRUMB',
    params: {
      name: '',
    }
  };


  sequence;
  generalFormGroup: UntypedFormGroup;
  generalFormGroupChange = false;
  loadingGeneral = false;
  organisms = [];
  selectedFormat = null;

  // tslint:disable-next-line:variable-name
  feature_id: string;
  feature: any = {};
  organism: any = {};
  cvterm: any = {};
  editing = false;
  features: any = [];
  analyses: any = [];
  phylotrees: any = [];
  processes: any = [];
  urlMSA;

  @ViewChild('annotationsForm', {static: false}) annotationsForm: AnnotationsFormComponent;

  constructor(
    @Inject(BACKEND_SERVICE) private readonly backendService: BackendServiceInterface,
    private readonly router: Router,
    private readonly activatedRoute: ActivatedRoute,
    @Inject(AUTH_SERVICE_TOKEN) public readonly authService: AuthServiceInterface,
    private readonly fb: UntypedFormBuilder,
    @Inject(MESSAGE_LOG_SERVICE) private readonly messageLogServices: MessageLogServiceInterface,
    @Inject(NOTIFICATION_SERVICE) private readonly notificationService: NotificationServiceInterface,
    private readonly globalVariablesServices: GlobalService,
    private readonly modalService: NzModalService,
    @Inject(STATE_SERVICE) private readonly stateService: StateServiceInterface,
    private readonly ngZone: NgZone,
  ) {
    const sequence = this.activatedRoute.snapshot.data.sequence;
    this.BREADCRUMB_NAME.params.name = sequence.name;
  }

  async ngOnInit(): Promise<void> {
    this.loadingGeneral = true;
    this.sequence = this.activatedRoute.snapshot.data.sequence;
    this.organisms = this.activatedRoute.snapshot.data.organisms;
    this.features = this.sequence.features;
    this.analyses = this.sequence.analyses;
    this.phylotrees = this.sequence.phylotrees;
    const baseUrl = this.globalVariablesServices.getParameter('host') + this.globalVariablesServices.getParameter('api_prefix');
    this.urlMSA = `${baseUrl}/bos/sequences/${this.sequence.feature_id}.fasta`;
    this.initForGroup();
    
    const response: any = await lastValueFrom(this.backendService.getAnalyses(null, {
      filter: {
        feature_id: this.sequence.feature_id,
      }
    }), { defaultValue: undefined });
    const getState = await this.stateService.getStateCurrenView();
    if (!getState || !getState.generalFormGroupChange) {
      this.resetGeneralFormGroup();
    } else {
      this.generalFormGroup.get('name').setValue(getState.generalFormGroupName ? getState.generalFormGroupName : this.sequence.name);
      this.generalFormGroup.get('uniquename').setValue(getState.generalFormGroupUniqueName ? getState.generalFormGroupUniqueName : this.sequence.uniquename);
      this.generalFormGroupChange = getState.generalFormGroupChange;
    }
    this.loadingGeneral = false;
  }

  ngOnDestroy() {
    if (!this.generalFormGroupChange) {
      this.stateService.setStateCurrentView({
        generalFormGroupChange: this.generalFormGroupChange,
      }).then();
    } else {
      this.stateService.setStateCurrentView({
        generalFormGroupName: this.generalFormGroup.get('name').value,
        generalFormGroupUniqueName: this.generalFormGroup.get('uniquename').value,
        generalFormGroupChange: this.generalFormGroupChange
      }).then();
    }
  }

  recalculateLayout(): void {
  // Forzar un evento de redimensionamiento del navegador (aunque no se redimensione)
  // Esto obliga a NzTabset y Angular Split a recalcular sus dimensiones.
  this.ngZone.runOutsideAngular(() => {
    setTimeout(() => {
      window.dispatchEvent(new Event('resize'));
    }, 50); // Pequeño retraso para asegurar que el DOM ha terminado de cargarse.
  });
}

  initForGroup() {
    this.generalFormGroup = this.fb.group({
      feature_id: [{value: this.sequence.feature_id, disabled: true}],
      name: [''],
      uniquename: [{value: '', disabled: true}],
      organism_id: [this.sequence.organism_id],
      seqlen: [{value: this.sequence.seqlen, disabled: true}],
      timeaccessioned: [{value: this.sequence.timeaccessioned, disabled: true}],
      timelastmodified: [{value: this.sequence.timelastmodified, disabled: true}],
      ontology: [{value: this.sequence.ontology, disabled: true}],
      individual: [{value: this.sequence.individual, disabled: true}],
      srcfeature: [{value: this.sequence.srcfeature, disabled: true}],
    });
    this.generalFormGroup.valueChanges.subscribe({next:(change) => {
      this.generalFormGroupChange = true;
    }});
  }

  ngAfterViewInit(): void {
    this.annotationsForm.object_uuid = this.sequence.uuid;
    this.annotationsForm.loadAnnotations();
  }

  editEvent() {
    this.editing = !this.editing;
  }

  isDisableEdit() {
    return !this.authService.havePermission('gui-seq-edit');
  }

  async updateSequence() {
    this.loadingGeneral = true;
    try {
      const value = {
        name: this.generalFormGroup.get('name').value,
        organism_id: this.generalFormGroup.get('organism_id').value,
        uniquename: this.generalFormGroup.get('uniquename').value,
      };
      const sequencePutResponse: any = await lastValueFrom(this.backendService.putSequences(this.sequence.feature_id, value), { defaultValue: undefined });
      this.messageLogServices.addIssues(sequencePutResponse.issues);
      await this.resetGeneralFormGroup();
    } catch (e) {
      if (e.issues) {
        this.messageLogServices.addIssues(e.issues);
      }
      this.notificationService.createNotificationWithType(
        TypeNotificationEnum.error,
        'MOLECULAR_DATA.SEQUENCES.DETAIL.GENERAL_TAB.UPDATE_ERROR_NOTIFICATION.TITLE',
        'MOLECULAR_DATA.SEQUENCES.DETAIL.GENERAL_TAB.UPDATE_ERROR_NOTIFICATION.CONTENT',
        'bottomRight'
      ).then();
    }
    this.loadingGeneral = false;
  }

  async cancelModifySequence() {
    this.loadingGeneral = true;
    try {
      await this.resetGeneralFormGroup();
    } catch (e) {
      console.log(e);
      if (e.issues) {
        this.messageLogServices.addIssues(e.issues);
      }
    }
    this.loadingGeneral = false;
  }

  async resetGeneralFormGroup(): Promise<void> {
    const responseSequence: any = await lastValueFrom(this.backendService.getSequences(this.sequence.feature_id), { defaultValue: undefined });
    const sequence = responseSequence.content;
    this.messageLogServices.addIssues(responseSequence.issues);

    this.sequence.name = sequence.name ? sequence.name : '';
    this.sequence.uniquename = sequence.uniquename ? sequence.uniquename : '';
    this.sequence.organism_id = sequence.organism_id ? sequence.organism_id : null;
    this.sequence.seqlen = sequence.seqlen ? sequence.seqlen : '';
    this.sequence.timeaccessioned = sequence.timeaccessioned ? sequence.timeaccessioned : null;
    this.sequence.timelastmodified = sequence.timelastmodified ? sequence.timelastmodified : null;
    this.generalFormGroup.get('name').setValue(this.sequence.name);
    this.generalFormGroup.get('uniquename').setValue(this.sequence.uniquename);
    this.generalFormGroup.get('organism_id').setValue(this.sequence.organism_id);
    this.generalFormGroup.get('seqlen').setValue(this.sequence.seqlen);
    this.generalFormGroup.get('timeaccessioned').setValue(this.sequence.timeaccessioned);
    this.generalFormGroup.get('timelastmodified').setValue(this.sequence.timelastmodified);
    this.generalFormGroupChange = false;
  }

  goAnalysisDetail(a) {
    let url = '';
    if (a.object_type) {
      url = OBJECT_TYPES[a.object_type].pageDetail;
    }
    this.router.navigate([url ?? 'analysisDetail', a.analysis_id]);
  }

  goPhylotreeDetail(id) {
    this.router.navigate(['phylotreeDetail', id]);
  }

  goOrganismDetail(): void {
    this.router.navigate(['organismDetail', this.generalFormGroup.get('organism_id').value]);
  }

  goOntologyDetail(): void {
    this.router.navigate(['termDetail', this.generalFormGroup.get('ontology').value.cvterm_id]);
  }

  goIndividualDetail(): void {
    this.router.navigate(['individualDetail', this.generalFormGroup.get('individual').value.stock_id]);
  }

  goSequenceDetail(id): void {
    this.router.navigate(['sequenceDetail', id]);
  }

  exportSequence(form: TemplateRef<any>): void {
    this.modalService.confirm({
      nzTitle: '<i>¿En qué formato desea realizar la descarga?</i>',
      nzContent: form,
      nzCentered: true,
      nzOnOk: () => {
        this.backendService.exportFromChado('sequences', this.sequence.feature_id, this.selectedFormat).subscribe(
          {next: (response: any) => {
            FileSaver.saveAs(new Blob([response]), this.sequence.uniquename + '.' + this.selectedFormat);
          }, error: error => {
            this.messageLogServices.addIssues(error.issues);
          }});
      }
    });
  }

  organismValueChange(event): void {
    this.generalFormGroup.get('organism_id').setValue(event);
    this.generalFormGroupChange = true;
  }

}

