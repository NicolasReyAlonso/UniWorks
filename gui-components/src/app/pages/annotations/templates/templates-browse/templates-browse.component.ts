import {AfterViewInit, Component, OnDestroy, OnInit, ViewChild} from '@angular/core';
/*import {FieldModalCreateComponent} from '../field-modal-create/field-modal-create.component';*/
import {BackendService} from 'ngt-gui/core';
import {DynamicBrowseComponent} from 'src/app/components/dynamics/dynamic-browse/dynamic-browse.component';
import {NotificationService, TypeNotificationEnum} from 'src/app/services/notification.service';
import {MessageLogService} from 'src/app/services/message-log.service';
import {NzModalService} from 'ng-zorro-antd/modal';
import {InternationalizationService} from "ngt-gui/core";
import {Router} from "@angular/router";
import IView from "@interfaces/view.interfaces";
import { StateService } from 'ngt-gui/core';
import {AuthService} from "ngt-gui/core";
import {AclModalComponent} from "src/app/components/admin/acl/acl-modal/acl-modal.component";
import { CommonModule } from '@angular/common';
import {
  TemplateModalCreateComponent
} from "../../../../components/data/annotations/templates/template-modal-create/template-modal-create.component";
import {lastValueFrom} from "rxjs";

@Component({
    selector: 'app-templates-browse',
    imports: [
        CommonModule,
        AclModalComponent,
        TemplateModalCreateComponent,
        DynamicBrowseComponent,
    ],
    templateUrl: './templates-browse.component.html',
    styleUrls: ['./templates-browse.component.sass']
})
export class TemplatesBrowseComponent implements OnInit, AfterViewInit, OnDestroy,IView {

  BREADCRUMB_NAME = 'ANNOTATIONS.TEMPLATES.BROWSE.BREADCRUMB';

  loading = false;
  @ViewChild('fieldModalCreateRef', {static: false}) createModalRef;

  @ViewChild(DynamicBrowseComponent)
  private dynamicBrowser: DynamicBrowseComponent;

  @ViewChild('modalAclRef', {static: false}) modalAclRef: AclModalComponent;
  isVisibleAclModal = false;

  constructor(
    private readonly backendService: BackendService,
    private readonly notificationService: NotificationService,
    private readonly messageLogService: MessageLogService,
    private readonly nzModalService: NzModalService,
    private readonly internationalizationService: InternationalizationService,
    private readonly router: Router,
    private readonly stateService: StateService,
    public readonly authService: AuthService,
  ) { }

  ngOnInit(): void {

  }

  async ngAfterViewInit(): Promise<void> {
    this.loading = true;
    const getState = await this.stateService.getStateCurrenView();
    if (getState) {
      const dynamicTable = this.dynamicBrowser.dynamicTable
      if (getState.pageIndex) {
        dynamicTable.pageIndex = getState.pageIndex;
      }
      if (getState.pageSize) {
        dynamicTable.pageSize = getState.pageSize;
      }
      if (getState.checkedItems && getState.checkedItems instanceof Array) {
        dynamicTable.checkedItems = new Set(getState.checkedItems);
      }
      this.dynamicBrowser.changePage();
    }
    this.loading = false;
  }

  ngOnDestroy(): void {
    const dynamicTable = this.dynamicBrowser.dynamicTable;
    this.stateService.setStateCurrentView({
      pageIndex: dynamicTable.pageIndex,
      pageSize: dynamicTable.pageSize,
      checkedItems: Array.from(dynamicTable.checkedItems),
    });
  }

  async openItem(data): Promise<void> {
    await this.router.navigate(['annotationsTemplateDetail', data.id]);
  }

  async openCreateField(): Promise<void> {
    this.loading = true;
    await this.createModalRef.openModal();
    this.loading = false;
  }

  async createSuccessEvent(): Promise<void> {
    this.loading = true;
    await this.createModalRef.cancelModal();
    this.dynamicBrowser.dynamicTable.checkedItems.clear();
    this.dynamicBrowser.changePage();
    this.loading = false;
  }

  async deleteItem(event): Promise<void> {
    this.nzModalService.confirm({
      nzTitle: `${await this.internationalizationService.translate('ANNOTATIONS.TEMPLATES.BROWSE.REMOVE_MODAL.TITLE')}`,
      nzContent: `<b>${await this.internationalizationService.translate('ANNOTATIONS.TEMPLATES.BROWSE.REMOVE_MODAL.CONTENT')}</b>: ${event.name}`,
      nzCentered: true,
      nzBodyStyle: {
        padding: '45px 32px 24px 32px'
      },
      nzOnOk: async () => {
        this.loading = true;
        try {
          const response: any = await lastValueFrom(this.backendService.deleteAnnotationTemplates(event.id), { defaultValue: undefined });
          this.messageLogService.addIssues(response.issues);
          this.notificationService.createNotificationWithType(TypeNotificationEnum.success, 'ANNOTATIONS.TEMPLATES.BROWSE.SUCCESS_REMOVE.TITLE', 'ANNOTATIONS.TEMPLATES.BROWSE.SUCCESS_REMOVE.CONTENT', 'bottomRight').then();
          this.loading = false;
          this.dynamicBrowser.changePage();
        } catch (err) {
          this.loading = false;
          this.messageLogService.addIssues(err.issues);
          this.notificationService.createNotificationWithType(TypeNotificationEnum.error, 'ANNOTATIONS.TEMPLATES.BROWSE.ERROR_REMOVE.TITLE', 'ANNOTATIONS.TEMPLATES.BROWSE.ERROR_REMOVE.CONTENT', 'bottomRight').then();
        }
      }
    });
  }

  permissionItem(item) {
    this.modalAclRef.featureId = item.id;
    this.modalAclRef.objectTypeName = 'annotation_template';
    this.isVisibleAclModal = true;
    this.modalAclRef.objectUUID = item.uuid;
  }

}

