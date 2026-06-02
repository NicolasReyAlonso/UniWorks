import {Component, Inject, Input, OnInit} from '@angular/core';
import { CommonModule } from '@angular/common';
import {NzTableModule} from "ng-zorro-antd/table";
import {SharedModule} from "../../../modules/shared.module";
import {
  BACKEND_SERVICE, 
  BackendServiceInterface,
  MESSAGE_LOG_SERVICE,
  MessageLogServiceInterface,
  NOTIFICATION_SERVICE,
  NotificationServiceInterface,
  AUTH_SERVICE_TOKEN,
  AuthServiceInterface

} from 'ngt-gui/core';
import {Subscription} from "rxjs";
import {Router} from "@angular/router";

@Component({
    selector: 'app-dynamic-table-objects',
    imports: [
        CommonModule,
        NzTableModule,
        SharedModule,
    ],
    templateUrl: './dynamic-table-objects.component.html',
    styleUrls: ['./dynamic-table-objects.component.sass']
})
export class DynamicTableObjectsComponent implements OnInit {

  @Input() headerItems: { translation: string, variable: string }[] = [];
  @Input() objectType: string;
  @Input() canOpenDetail = true;
  @Input() readPermission;
  @Input() identifier = 'id';
  @Input() urlPageDetail: string;
  @Input() filterRequest = {};

  data: any[] = [];
  pageIndex = 1;
  pageSize = 10;
  totalItems = 0;
  loadDataSubscription: Subscription;
  loadingData = true;
  havePermissionToDetail = true;

  constructor(
    @Inject(BACKEND_SERVICE) private readonly backendService: BackendServiceInterface,
    @Inject(MESSAGE_LOG_SERVICE) private readonly messageLogService: MessageLogServiceInterface,
    @Inject(NOTIFICATION_SERVICE) private readonly notificationService: NotificationServiceInterface,
    @Inject(AUTH_SERVICE_TOKEN) private readonly authService: AuthServiceInterface,
    private readonly router: Router,
  ) { }

  async ngOnInit(): Promise<void> {
    this.loadData();
    if (this.readPermission) {
      this.havePermissionToDetail = this.authService.havePermission(this.readPermission);
    }
  }

  async loadData() {
    this.loadingData = true;
    if (this.loadDataSubscription) {
      this.loadDataSubscription.unsubscribe();
    }
    this.loadDataSubscription = this.backendService.getGenericRequest(this.objectType, null, {
      pagination: {
        pageSize: this.pageSize,
        pageIndex: this.pageIndex,
      },
      filter: {
        ...this.filterRequest,
      }
    }).subscribe({
      next: (response: any) => {
        this.messageLogService.addResponseIssues(response);
        this.totalItems = response.count;
        this.data = response.content;
        this.loadingData = false;
      },
      error: (e) => {
        this.messageLogService.addResponseIssues(e);
        this.notificationService.createNotificationError('DYNAMIC_TABLE_OBJECTS.ERROR_LOAD_DATA', 'bottomRight', {'object_type': this.objectType});
        this.loadingData = false;
      }
    });
  }

  onPageIndexChange(page: number) {
    this.pageIndex = page;
    this.loadData();
  }

  openItemDetail(item) {
    if (!this.havePermissionToDetail || !this.canOpenDetail) return;
    this.router.navigate([this.urlPageDetail, item[this.identifier]]);
  }

}
