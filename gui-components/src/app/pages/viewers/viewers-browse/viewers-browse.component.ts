import {Component, EventEmitter, OnInit, ViewChild} from '@angular/core';
import {AuthService} from "ngt-gui/core";
import IView from "@interfaces/view.interfaces";
import {Router} from "@angular/router";
import {NotificationService, TypeNotificationEnum} from "src/app/services/notification.service";
import {MessageLogService} from "src/app/services/message-log.service";
import {BackendService} from 'ngt-gui/core';
import {DynamicBrowseComponent} from "src/app/components/dynamics/dynamic-browse/dynamic-browse.component";
import {AclModalComponent} from "src/app/components/admin/acl/acl-modal/acl-modal.component";
import {CommonModule} from '@angular/common';
import {NzButtonModule} from "ng-zorro-antd/button";
import {SharedModule} from "../../../shared-module/shared.module";
import {NzIconModule} from "ng-zorro-antd/icon";
import {NzModalModule} from "ng-zorro-antd/modal";
import {forkJoin, lastValueFrom} from "rxjs";
import {ModalInfoService} from "../../../services/modal-info.service";

@Component({
    selector: 'app-viewers-browse',
    imports: [
        CommonModule,
        AclModalComponent,
        NzButtonModule,
        SharedModule,
        NzIconModule,
        NzModalModule,
        DynamicBrowseComponent,
    ],
    templateUrl: './viewers-browse.component.html',
    styleUrls: ['./viewers-browse.component.sass']
})
export class ViewersBrowseComponent implements OnInit, IView {

  BREADCRUMB_NAME = 'DISPLAY.VIEWERS.BROWSE.BREADCRUMB';

  @ViewChild(DynamicBrowseComponent) dynamicBrowser: DynamicBrowseComponent;
  loading = false;
  isVisibleDeleteItemModal = false;
  deleteItemInstance = null;

  // CUSTOM BUTTONS BROWSER
  buttons: { [key: string]: any, eventEmitter: EventEmitter<any> }[] = [];

  @ViewChild('modalAclRef', {static: false}) modalAclRef: AclModalComponent;
  isVisibleAclModal = false;

  constructor(
    public authService: AuthService,
    private readonly router: Router,
    private readonly notificationService: NotificationService,
    private readonly messageLogService: MessageLogService,
    private readonly backendService: BackendService,
    private readonly modalInfoService: ModalInfoService,
  ) {
  }

  ngOnInit(): void {
    this.createCustomButtonsBrowser();
  }

  private createCustomButtonsBrowser(): void {

    // Create
    const cloneView = {
      title: 'DISPLAY.VIEWERS.BROWSE.CUSTOM_BUTTONS.CLONE.TITLE',
      needCheckedItem: true,
      eventEmitter: new EventEmitter(),
      cantCheckedAllItem: true,
      canOnlyCheckOne: true,
    };

    // Events
    cloneView.eventEmitter.subscribe({next:async (event) => {
      this.loading = true;
      try {
        await this.backendService.cloneView(event.id.unary[0]);
      } catch (e) {

      }
      this.dynamicBrowser.changePage();
      this.loading = false;
    }});

    // Add list
    this.buttons = [
      cloneView,
    ];
  }

  onOpenViewItem(item): void {
    console.log(item);
    switch (item.type) {
      case 'nextgendem-geolayer':
        this.router.navigate(
          ['phylogeographyBrowse'],
          {
            queryParams: {
              idMap: item.id,
            },
          }
        );
        break;
      case 'msa-editor':
        this.router.navigate(
          ['nextgendemMsaBrowser'],
          {
            queryParams: {
              view_id: item.id,
            },
          }
        );
        break;
      case 'phylotree-viewer':
        this.router.navigate(
          ['archaeopteryxBrowser'],
          {
            queryParams: {
              view_id: item.id,
            },
          }
        );
        break;
    }
  }

  onDeleteViewItem(item): void {
    this.deleteItemInstance = item;
    this.isVisibleDeleteItemModal = true;
  }

  async deleteItem(id): Promise<void> {
    this.loading = true;
    this.isVisibleDeleteItemModal = false;
    try {
      const response: any = await lastValueFrom(this.backendService.deleteView(id), { defaultValue: undefined });
      if (response.issues) {
        this.messageLogService.addIssues(response.issues);
      }
      this.dynamicBrowser.changePage();
    } catch (e) {
      if (e.issues) {
        this.messageLogService.addIssues(e.issues);
      }
      this.notificationService.createNotificationWithType(
        TypeNotificationEnum.error,
        'DISPLAY.VIEWERS.BROWSE.NOTIFICATION_DELETE_VIEW_ERROR.TITLE',
        'DISPLAY.VIEWERS.BROWSE.NOTIFICATION_DELETE_VIEW_ERROR.CONTENT',
        'bottomRight'
      ).then();
    }
    this.loading = false;
  }

  async deleteSelected(event) {
    this.modalInfoService.showModalInfo(
      "DISPLAY.VIEWERS.DELETE_SELECTED_MODAL.TITLE",
      "DISPLAY.VIEWERS.DELETE_SELECTED_MODAL.CONTENT",
      null,
      'exclamation-circle',
      'twotone',
      this.modalInfoService.colorErrorDefault,
      [
        {
          text: "DISPLAY.VIEWERS.DELETE_SELECTED_MODAL.ACCEPT_BUTTON",
          type: 'primary',
          onClickFunc: async () => {
            this.modalInfoService.isVisibleModalInfo = false;
            this.loading = true;
            try {
              const ids = event.filter[this.backendService.getFieldID('viewer')].unary;
              const observables = [];
              for (let id of ids) {
                observables.push(this.backendService.deleteView(id));
              }
              const response: any = await lastValueFrom(forkJoin(observables));
              this.dynamicBrowser.dynamicTable.clearItemsChecked();
              this.notificationService.createNotificationDeleteSuccess('DISPLAY.VIEWERS.BROWSE.NOTIFICATION_DELETE_SELECTED_SUCCESS_CONTENT', "bottomRight").then();
              this.messageLogService.addResponseIssues(response);
            } catch (e) {
              this.notificationService.createNotificationError('DISPLAY.VIEWERS.BROWSE.NOTIFICATION_DELETE_SELECTED_ERROR_CONTENT', 'bottomRight').then();
              this.messageLogService.addResponseIssues(e);
            }
            this.dynamicBrowser.changePage();
            this.loading = false;
          }
        },
        {
          text: "DISPLAY.VIEWERS.DELETE_SELECTED_MODAL.CANCEL_BUTTON",
          type: 'primary',
          danger: true,
          onClickFunc: async () => {
            this.modalInfoService.isVisibleModalInfo = false;
          }
        }
      ]
    );
  }

  permissionItem(item) {
    this.modalAclRef.featureId = item.id;
    this.modalAclRef.objectTypeName = 'view';
    this.isVisibleAclModal = true;
    this.modalAclRef.objectUUID = item.uuid;
  }

}
