import {Component, OnInit, Output, EventEmitter, TemplateRef, ViewChild, Inject} from '@angular/core';
import * as FileSaver from 'file-saver';

import {BackendServiceInterface, BACKEND_SERVICE, FILES_SERVICE_TOKEN, FilesServiceInterface} from 'ngt-gui/core';
import {MessageLogServiceInterface, MESSAGE_LOG_SERVICE} from 'ngt-gui/core';
import { StateServiceInterface, STATE_SERVICE} from 'ngt-gui/core';
import { AuthServiceInterface, AUTH_SERVICE_TOKEN } from "ngt-gui/core";

import {NzModalService} from 'ng-zorro-antd/modal';
import {Router} from '@angular/router';
import {DynamicBrowseComponent} from 'ngt-gui/gui';
import {IView} from 'ngt-gui/gui';
import {AclModalComponent} from 'src/app/components/admin/acl/acl-modal/acl-modal.component';
import {
  CaseStudiesAddItemsModalComponent
} from 'src/app/components/data/case-studies/case-studies-add-items-modal/case-studies-add-items-modal.component';
import {
  CollectionsAddItemsModalComponent
} from 'src/app/components/data/collection/collections-add-items-modal/collections-add-items-modal.component';
import {ModalInfoService} from 'ngt-gui/gui';
import {ICustomActionButton} from "ngt-gui/gui";
import {FormlyFieldConfig} from "@ngx-formly/core";
import { CommonModule } from '@angular/common';
import {DynamicInputModalComponent} from "ngt-gui/gui";
import {NzSelectModule} from "ng-zorro-antd/select";
import {FormsModule, ReactiveFormsModule} from "@angular/forms";
import {lastValueFrom} from "rxjs";

@Component({
    selector: 'app-aligment-browse',
    imports: [
        CommonModule,
        FormsModule,
        ReactiveFormsModule,
        DynamicBrowseComponent,
        DynamicInputModalComponent,
        CaseStudiesAddItemsModalComponent,
        CollectionsAddItemsModalComponent,
        AclModalComponent,
        NzSelectModule,
    ],
    templateUrl: './aligment-browse.component.html',
    styleUrls: ['./aligment-browse.component.sass']
})
export class AlignmentBrowseComponent implements OnInit, IView {

  BREADCRUMB_NAME = 'Alineamientos múltiples';
  customButtonsBrowser = [];

  @Output() sequenceSelection = new EventEmitter();
  @ViewChild(DynamicBrowseComponent)
  private dynamicBrowser: DynamicBrowseComponent;
  customActionsButtons: ICustomActionButton[] = []

  @ViewChild(CaseStudiesAddItemsModalComponent) caseStudiesAddItemsModalComponent: CaseStudiesAddItemsModalComponent;
  @ViewChild(CollectionsAddItemsModalComponent) collectionsAddItemsModalComponent: CollectionsAddItemsModalComponent;

  @ViewChild('modalAclRef', {static: false}) modalAclRef: AclModalComponent;
  isVisibleAclModal = false;

  isVisibleConcatModal = false;
  modalFields: FormlyFieldConfig[] = [
    {
      key: 'alignments_order',
      type: 'select',
      props: {
        required: true,
        label: 'Orden',
        multiple: true,
      }
    },
    {
      key: 'missing_individual',
      type: 'radio',
      props: {
        required: true,
        label: 'Qué hacer si falta alguna región para algún individuo',
        options: [
          { value: ' ', label: 'Borrar individuo completo' },
          { value: 'missing_value=?', label: 'Poner missing values en la región faltante' }
        ],
      }
    },
    {
      key: 'filter',
      type: 'input',
      expressions: {
        hide: 'true'
      }
    }
  ]

  constructor(
    @Inject (BACKEND_SERVICE) private backendService: BackendServiceInterface,
    @Inject (MESSAGE_LOG_SERVICE) private logService: MessageLogServiceInterface,
    private modal: NzModalService,
    @Inject (STATE_SERVICE) private stateService: StateServiceInterface,
    private router: Router,
    @Inject (AUTH_SERVICE_TOKEN) public readonly authService: AuthServiceInterface,
    @Inject (FILES_SERVICE_TOKEN) private readonly filesService: FilesServiceInterface,
    private readonly modalInfoService: ModalInfoService,
  ) {
  }

  loading = false;
  formats: string[] = [];
  selectedFormat = '';
  headersOptions = []
  headerSelected = 'Accession';

  ngOnInit(): void {
    this.createCustomButtonsBrowser();
    this.createCustomActionsButtonsTable();
    this.backendService.getFormats('alignments').subscribe(
      {next:(response: any) =>
        this.formats = response.content
      });
    this.backendService.getBoHeaders().subscribe( {next:(response: any) =>
      this.headersOptions = response.content
    });
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

    const concatButton = {
      title: 'MOLECULAR_DATA.MULTIPLE_ALIGNMENTS.BROWSER.CONCAT_BUTTON',
      needCheckedItem: true,
      eventEmitter: new EventEmitter(),
      cantCheckedAllItem: true,
      cantOnlyCheckOne: true,
      getObject: true,
      funcCondition: () => {
        return true;
      }
    }

    // Events
    addItemCasesStudies.eventEmitter.subscribe({next: async (event) => {
      this.loading = true;
      try {
        const response: any = await this.getAlignments(event);
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
        const response: any = await this.getAlignments(event);
        const entitiesUuid = response.content.map((entity) => {
          return entity.uuid;
        });
        await this.collectionsAddItemsModalComponent.openModal(entitiesUuid);
      } catch (e) {
        this.modalInfoService.showModalInfoDefaultError(e);
      }
      this.loading = false;
    }});

    concatButton.eventEmitter.subscribe( {next:(event) => {
      const alignments = event['objects'];
      const options = [];
      for (const [key, value] of alignments) {
        options.push({
          value: key,
          label: value['name']
        })
      }
      this.modalFields[0]['props']['options'] = options;
      this.modalFields[0]['props']['minLength'] = options.length;
      this.modalFields[2]['defaultValue'] = event['filter'];
      this.isVisibleConcatModal = true;
    }});

    // Add list
    this.customButtonsBrowser = [
      addItemCasesStudies,
      addItemCollection,
      concatButton,
    ];
  }

  concat(modalModel) {
    console.log(modalModel['filter'])
    let params = {
      concat: `[${modalModel['alignments_order'].join(',')}]`,
      header: 'individual',
      filter: modalModel['filter']
    };
    if (modalModel['missing_individual'] !== ' ') {
      params['missing_value'] = '?';
    }
    const requestURL = `${this.backendService.base_url}/bos/alignments.fasta`;
    this.router.navigate(['alignmentNextgendemMissingEditor'], { queryParams: {requestURL ,requestParams: JSON.stringify(params)} });
  }

  createCustomActionsButtonsTable() {
    const visualizers: ICustomActionButton = {
      type: 'dropdown',
      iconType: 'eye',
      eventEmitter: new EventEmitter<{ event: string, data: any }>(),
      dropdownItems: [
        {
          label: 'MOLECULAR_DATA.MULTIPLE_ALIGNMENTS.BROWSER.CUSTOM_ACTIONS_BUTTONS.NEXTGENDEM_MISSING_EDITOR',
          event: 'nextgendemMissingEditor'
        },
        {
          label: 'MOLECULAR_DATA.MULTIPLE_ALIGNMENTS.BROWSER.CUSTOM_ACTIONS_BUTTONS.NEXTGENDEM_MSA',
          event: 'nextgendemMsa'
        }
      ]
    };

    visualizers.eventEmitter.subscribe({next:(event) => {
      switch (event.event) {
        case 'nextgendemMsa':
          this.router.navigate(['nextgendemMsaBrowser'], {
            queryParams: {
              url: this.filesService.getFileFromBosRequestUrl('alignments', event.data.analysis_id, 'fasta'),
              analysis_id: event.data.analysis_id
            }
          });
          break;
        case 'nextgendemMissingEditor':
          this.router.navigate(['alignmentNextgendemMissingEditor', event.data.analysis_id]);
          break;
      }
    }});

    this.customActionsButtons = [
      visualizers,
    ];
  }

  async getAlignments(event): Promise<any> {
    const response: any = await lastValueFrom(this.backendService.getAlignments(null, {
      filter: event,
    }), { defaultValue: undefined });
    if (!response.content || response.content.length === 0) {
      this.loading = false;
      throw {message: 'Error GET ALIGNMENTS'};
    }
    return response;
  }

  // OPEN
  openItem(item) {
    this.router.navigate(['alignmentDetail', item.analysis_id]);
  }

  // IMPORT
  importItems() {
    this.router.navigate(['alignmentsImport']);
  }

  // EXPORT
  exportItem(item, form: TemplateRef<any>) {
    this.modal.confirm({
      nzTitle: '<i>¿En qué formato desea realizar la descarga?</i>',
      nzContent: form,
      nzCentered: true,
      nzOnOk: () => {
        this.backendService.exportFromChado('alignments', item.analysis_id, this.selectedFormat,
          {header: this.headerSelected}).subscribe(
          {next: (response: any) => {
            FileSaver.saveAs(new Blob([response]), item.name + '.' + this.selectedFormat);
          }, error: error => {
            this.logService.addIssues(error.issues);
          }});
      }
    });
  }

  exportSelection(params, form: TemplateRef<any>) {
    this.modal.confirm({
      nzTitle: '<i>¿En qué formato desea realizar la descarga?</i>',
      nzContent: form,
      nzOnOk: () => {
        this.backendService.exportFromChado('alignments', undefined, this.selectedFormat,
          {...params, header: this.headerSelected}).subscribe(
          {next:(response: any) => {
            FileSaver.saveAs(new Blob([response]), 'alignments.' + this.selectedFormat);
          }, error: error => {
            this.logService.addIssues(error.issues);
          }});
      }
    });
  }

  // DELETE
  deleteItem(item) {
    this.modal.confirm({
      nzTitle: '<i>¿Seguro que desea eliminar este alineamiento y los datos asociados?</i>',
      nzContent: JSON.stringify(item, (k, v) => (k === 'taxa') ? undefined : v),
      nzOnOk: () => {
        this.loading = true;
        this.backendService.deleteFromChado('alignments', item.analysis_id).subscribe(
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
      nzCentered: true,
      nzTitle: '<i>¿Seguro que desea eliminar los alineamientos seleccionados y los datos asociados?</i>',
      nzOnOk: () => {
        this.loading = true;
        this.backendService.deleteFromChado('alignments', undefined, params).subscribe(
          {next:(response: any) => {
            this.logService.addIssues(response.issues);
          },
          error: error => {
            this.loading = false;
            this.logService.addIssues(error.issues);
          },
          complete: () => {
            this.loading = false;
            this.dynamicBrowser.changePage();
          }});
      }
    });
  }

  permissionItem(item) {
    this.modalAclRef.featureId = item.analysis_id;
    this.modalAclRef.objectTypeName = 'multiple-sequence-alignment';
    this.isVisibleAclModal = true;
    this.modalAclRef.objectUUID = item.uuid;
  }
}
