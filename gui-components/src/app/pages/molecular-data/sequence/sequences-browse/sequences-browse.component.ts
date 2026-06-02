import {Component, OnInit, Output, EventEmitter, ViewChild, TemplateRef, Inject} from '@angular/core';
import {NzModalService} from 'ng-zorro-antd/modal';
import * as FileSaver from 'file-saver';
import {Router} from '@angular/router';
import {DynamicBrowseComponent} from 'ngt-gui/gui';
import {FormsModule, ReactiveFormsModule, UntypedFormControl, UntypedFormGroup, Validators} from '@angular/forms';
import {AclModalComponent} from 'src/app/components/admin/acl/acl-modal/acl-modal.component';
import {AuthService} from "ngt-gui/core";
import IView from '@interfaces/view.interfaces';
import {
  CaseStudiesAddItemsModalComponent
} from "src/app/components/data/case-studies/case-studies-add-items-modal/case-studies-add-items-modal.component";
import {ModalInfoService} from "../../../../services/modal-info.service";
import {
  CollectionsAddItemsModalComponent
} from "src/app/components/data/collection/collections-add-items-modal/collections-add-items-modal.component";
import { CommonModule } from '@angular/common';
import {NzSelectModule} from "ng-zorro-antd/select";
import {lastValueFrom} from "rxjs";
import { BackendServiceInterface } from 'ngt-gui/core';
import { BACKEND_SERVICE } from 'ngt-gui/core';
import { StateServiceInterface } from 'ngt-gui/core';
import { STATE_SERVICE } from 'ngt-gui/core';
import { MessageLogServiceInterface } from 'ngt-gui/core';
import { AuthServiceInterface } from 'ngt-gui/core';
import { AUTH_SERVICE_TOKEN } from 'ngt-gui/core';
import { MESSAGE_LOG_SERVICE } from 'ngt-gui/core';

@Component({
    selector: 'app-sequences-browse',
    imports: [
        CommonModule,
        FormsModule,
        ReactiveFormsModule,
        NzSelectModule,
        CollectionsAddItemsModalComponent,
        CaseStudiesAddItemsModalComponent,
        AclModalComponent,
        DynamicBrowseComponent,
    ],
    templateUrl: './sequences-browse.component.html',
    styleUrls: ['./sequences-browse.component.sass']
})
export class SequencesBrowseComponent implements OnInit, IView {

  BREADCRUMB_NAME = 'MOLECULAR_DATA.SEQUENCES.BROWSER.BREADCRUMB';

  @Output() sequenceSelection = new EventEmitter();
  @ViewChild(DynamicBrowseComponent)
  private dynamicBrowser: DynamicBrowseComponent;
  @ViewChild(CaseStudiesAddItemsModalComponent) caseStudiesAddItemsModalComponent: CaseStudiesAddItemsModalComponent;
  @ViewChild(CollectionsAddItemsModalComponent) collectionsAddItemsModalComponent: CollectionsAddItemsModalComponent;
  customButtonsBrowser: { [key: string]: any, eventEmitter: EventEmitter<any> }[] = [];

  loading = false;
  formats: string[] = [];
  selectedFormat = '';
  dataForm: UntypedFormGroup = new UntypedFormGroup({
    uniquename: new UntypedFormControl(null, Validators.required),
    name: new UntypedFormControl(),
  });

  @ViewChild('modalAclRef', {static: false}) modalAclRef: AclModalComponent;
  isVisibleAclModal = false;
  headersOptions = []
  headerSelected = 'Accession';


  constructor(
   @Inject(BACKEND_SERVICE) private backendService: BackendServiceInterface,
    @Inject(MESSAGE_LOG_SERVICE) private logService: MessageLogServiceInterface,
    private modal: NzModalService,
    @Inject(STATE_SERVICE) private stateService: StateServiceInterface,
    private router: Router,
    @Inject(AUTH_SERVICE_TOKEN) public authService: AuthServiceInterface,
    private readonly modalInfoService: ModalInfoService,
  ) {
  }

  ngOnInit(): void {
    this.createCustomButtonsBrowser();
    this.backendService.getFormats('sequences').subscribe(
      {next: (response: any) => {
        this.formats = response.content;
      }});
    this.backendService.getBoHeaders().subscribe({next: (response: any) => {
      this.headersOptions = response.content

    }})
  }

  private createCustomButtonsBrowser(): void {
    // Create
    const addItemCasesStudies = {
      title: 'STUDY_CASES.ADD_ITEM_CUSTOM_BUTTON_BROWSERS.TEXT',
      needCheckedItem: true,
      eventEmitter: new EventEmitter(),
      cantCheckedAllItem: true,
      funcCondition: () => {
        return this.authService.havePermission('gui-case-study-edit');
      }
    };

    const addItemCollection = {
      title: 'MOLECULAR_DATA.COLLECTIONS.ADD_BUTTON_ITEM',
      needCheckedItem: true,
      eventEmitter: new EventEmitter(),
      cantCheckedAllItem: true,
      funcCondition: () => {
        return this.authService.havePermission('gui-collection-edit');
      }
    };

    // Events
    addItemCasesStudies.eventEmitter.subscribe({next: async (event) => {
      this.loading = true;
      try {
        const response: any = await this.getSequencesByChecks(event);
        const entitiesId = response.content.map((entity) => {
          return entity.id;
        });
        await this.caseStudiesAddItemsModalComponent.openModal(entitiesId);
      } catch (e) {
        this.modalInfoService.showModalInfoDefaultError(e);
      }
      this.loading = false;
    }});

    addItemCollection.eventEmitter.subscribe({next:async (event) => {
      this.loading = true;
      try {
        const response: any = await this.getSequencesByChecks(event);
        const entitiesUuid = response.content.map((entity) => {
          return entity.uuid;
        });
        await this.collectionsAddItemsModalComponent.openModal(entitiesUuid);
      } catch (e) {
        this.modalInfoService.showModalInfoDefaultError(e);
      }
      this.loading = false;
    }})

    // Add list
    this.customButtonsBrowser = [
      addItemCasesStudies,
      addItemCollection,
    ];
  }

  async getSequencesByChecks(event): Promise<any> {
    const response: any = await lastValueFrom(this.backendService.getSequences(null, {
      filter: event,
    }), { defaultValue: undefined });
    if (!response.content || response.content.length === 0) {
      this.loading = false;
      throw {message: "Error GET SEQUENCES"};
    }
    return response;
  }

  // OPEN
  openItem(item) {
    this.router.navigate(['sequenceDetail', item.feature_id]);
  }

  // IMPORT
  importItems() {
    this.router.navigate(['sequencesImport']);
  }

  // EXPORT
  exportItem(item, form: TemplateRef<any>) {
    this.modal.confirm({
      nzTitle: '<i>¿En qué formato desea realizar la descarga?</i>',
      nzContent: form,
      nzCentered: true,
      nzOnOk: () => {
        this.backendService.exportFromChado('sequences', item.feature_id, this.selectedFormat, {header: this.headerSelected}).subscribe(
          {next: (response: any) => {
            FileSaver.saveAs(new Blob([response]), item.uniquename + '.' + this.selectedFormat);
          }, error: error => {
            this.logService.addIssues(error.issues);
          }});
      }
    });
  }

  exportSelection(params, form: TemplateRef<any>) {
    let paramsQuery = {
      ...params,
      header: this.headerSelected
    }
    this.modal.confirm({
      nzTitle: '<i>¿En qué formato desea realizar la descarga?</i>',
      nzCentered: true,
      nzContent: form,
      nzOnOk: () => {
        this.backendService.exportFromChado('sequences', undefined, this.selectedFormat, paramsQuery).subscribe(
          {next:(response: any) => {
            FileSaver.saveAs(new Blob([response]), 'sequences.' + this.selectedFormat);
          }, error: error => {
            this.logService.addIssues(error.issues);
          }});
      }
    });
  }

  // DELETE
  deleteItem(item) {
    this.modal.warning({
      nzTitle: '<i>¿Seguro que desea eliminar este elemento?</i>',
      nzContent: JSON.stringify(item, (k, v) => (k === 'residues') ? undefined : v),
      nzCentered: true,
      nzOnOk: () => {
        this.loading = true;
        this.backendService.deleteFromChado('sequences', item.feature_id).subscribe(
          {next: (response: any) => {
            this.logService.addIssues(response.issues);
          }, error: error => {
            this.loading = false;
            this.logService.addIssues(error.issues);
          }, complete: () => {
            this.loading = false;
            this.dynamicBrowser.changePage();
          }});
      }
    });
  }

  deleteSelection(params) {
    this.modal.warning({
      nzTitle: '<i>¿Seguro que desea eliminar los elementos seleccionados?</i>',
      nzCentered: true,
      nzOnOk: () => {
        this.loading = true;
        this.backendService.deleteFromChado('sequences', undefined, params).subscribe(
          {next: (response: any) => {
            this.logService.addIssues(response.issues);
          },
          error: error => {
            this.loading = false;
            this.logService.addIssues(error.issues);
          },
          complete: () => {
            this.loading = false;
            this.dynamicBrowser.changePage();
          }}
        );
      }
    });
  }

  // PERMISSION
  permissionItem(item) {
    this.modalAclRef.featureId = item.feature_id;
    this.modalAclRef.objectTypeName = 'sequence';
    this.modalAclRef.objectUUID = item.uuid;
    this.isVisibleAclModal = true;
  }
}

