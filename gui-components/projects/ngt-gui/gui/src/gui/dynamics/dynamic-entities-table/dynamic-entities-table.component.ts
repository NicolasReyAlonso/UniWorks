import {Component, EventEmitter, Input, OnInit, Output, ViewEncapsulation} from '@angular/core';
import {CommonModule} from '@angular/common';
import {NzTableModule} from "ng-zorro-antd/table";
import {NzIconModule} from "ng-zorro-antd/icon";
import {SharedModule} from "../../../shared-module/shared.module";
import {BackendService} from 'ngt-gui/core';
import {Subscription} from "rxjs";
import {MessageLogService} from "../../../services/message-log.service";
import {NotificationService} from "../../../services/notification.service";
import OBJECT_TYPES from "../../../constants/object-types.constants";
import {AuthService} from "ngt-gui/core";
import {NzListModule} from "ng-zorro-antd/list";
import {Router} from "@angular/router";

@Component({
    selector: 'app-dynamic-entities-table',
    imports: [
        CommonModule,
        NzTableModule,
        NzIconModule,
        SharedModule,
        NzListModule,
    ],
    templateUrl: './dynamic-entities-table.component.html',
    styleUrls: ['./dynamic-entities-table.component.sass'],
    encapsulation: ViewEncapsulation.None
})
export class DynamicEntitiesTableComponent implements OnInit {

  @Input() urlFilter: any = { };
  @Input() noInternalDelete = true;
  @Input() variableHeader: { translation: string, variableName: string }[] = [ ];
  @Input() hiddenActions = false;
  @Input() hiddenDelete = false;
  @Input() canOpenItem = true;
  @Input() identifier = 'id';

  @Output() listOfDeleteChange = new EventEmitter<any[]>();

  data = [];
  objectTypeList = new Map<number, any>;
  listOfDelete = [];
  pageSize = 10;
  pageIndex = 1;
  totalItems = 0;
  loading = false;
  loadingObjectTypes = true;
  requestDataSubscription: Subscription;

  constructor(
    private readonly backendService: BackendService,
    private readonly messageLogService: MessageLogService,
    private readonly notificationService: NotificationService,
    private readonly authService: AuthService,
    private readonly router: Router,
  ) {
  }

  async ngOnInit(): Promise<void> {
    this.loadObjectTypes();
  }

  async loadObjectTypes() {
    this.backendService.getObjectTypes().subscribe({
      next: (response: any) => {
        this.messageLogService.addResponseIssues(response);
        const responseContent: any[] = response.content;
        responseContent.forEach((element) => {
          this.objectTypeList.set(element.id, {name: element.name});
        });
        this.loadingObjectTypes = false;
        this.loadData();
      },
      error: (e) => {
        console.error(e);
        this.messageLogService.addResponseIssues(e);
        this.notificationService.createNotificationError(
          'MOLECULAR_DATA.COLLECTIONS.DETAIL.NOTIFICATION_ERROR_LOAD_ENTITIES.CONTENT',
          "bottomRight",
        );
      }
    });
  }

  async loadData() {
    if (this.requestDataSubscription) {
      this.requestDataSubscription.unsubscribe();
    }
    this.loading = true;
    this.requestDataSubscription = this.backendService.getGenericRequest('functionalObject', null, {
      pagination: {
        pageIndex: this.pageIndex,
        pageSize: this.pageSize,
      },
      filter: {
        ...this.urlFilter,
      }
    }).subscribe({
      next: (response: any) => {
        this.messageLogService.addResponseIssues(response);
        this.loading = false;
        this.data = response.content.map((element) => {
          const objectType = this.objectTypeList.get(element['obj_type_id']);
          const additionalAttributes: any = {};
          if (!objectType) {
            additionalAttributes.typeTranslation = 'unknown';
            additionalAttributes.canOpen = false;
          } else {
            const objectTypeConstant =  OBJECT_TYPES[objectType.name];
            if (!objectTypeConstant) {
              additionalAttributes.typeTranslation = 'unknown';
              additionalAttributes.canOpen = false;
            } else {
              additionalAttributes.typeTranslation = OBJECT_TYPES[objectType.name].translation;
              const readPermission = OBJECT_TYPES[objectType.name].readPermission
              additionalAttributes.canOpen = readPermission ? this.authService.havePermission(readPermission) : true;
            }
          }
          return {
            ...element,
            ...additionalAttributes,
          }
        });
        this.totalItems = response.count;
      },
      error: (e) => {
        console.error(e);
        this.messageLogService.addResponseIssues(e);
        this.notificationService.createNotificationError(
          'MOLECULAR_DATA.COLLECTIONS.DETAIL.NOTIFICATION_ERROR_LOAD_ENTITIES.CONTENT',
          "bottomRight",
        );
        this.loading = false;
      },
    });
  }

  pageIndexChange(event: number) {
    this.pageIndex = event;
    this.loadData();
  }

  deleteEntity(item): void {
    if (this.noInternalDelete) {
      this.listOfDelete.push(item[this.identifier]);
    }
    this.listOfDeleteChange.emit(this.listOfDelete);
  }

  recoverEntity(item): void {
    if (this.noInternalDelete) {
      const index = this.listOfDelete.indexOf(item[this.identifier])
      if (index != -1) {
        this.listOfDelete.splice(index, 1);
      }
    }
    this.listOfDeleteChange.emit(this.listOfDelete);
  }
  openEntity(item) {
    if (!item.canOpen) return;
    const objectType = this.objectTypeList.get(item['obj_type_id']);
    const objectTypeConstant = OBJECT_TYPES[objectType.name];
    this.router.navigate([objectTypeConstant.pageDetail, item.native_id ?? item[this.identifier]]);
    console.log(item);
  }


}
