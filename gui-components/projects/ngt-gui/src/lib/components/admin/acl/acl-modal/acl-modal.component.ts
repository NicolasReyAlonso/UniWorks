import {Component, EventEmitter, Input, OnInit, Output, ViewChild} from '@angular/core';
import { forkJoin } from 'rxjs';
import {BackendService} from 'ngt-gui/core';import { MessageLogService } from 'src/app/services/message-log.service';
import {NotificationService, TypeNotificationEnum} from 'src/app/services/notification.service';
import {NzModalModule, NzModalService} from "ng-zorro-antd/modal";
import { CommonModule } from '@angular/common';
import {SharedModule} from "../../../../shared-module/shared.module";
import {AclRulesModalComponent} from "../acl-rules-modal/acl-rules-modal.component";
import {NzListModule} from "ng-zorro-antd/list";
import {NzSelectModule} from "ng-zorro-antd/select";
import {FormsModule, ReactiveFormsModule} from "@angular/forms";
import {NzTableModule} from "ng-zorro-antd/table";
import {NzSpinModule} from "ng-zorro-antd/spin";
import {NzButtonModule} from "ng-zorro-antd/button";
import {NzIconModule} from "ng-zorro-antd/icon";

enum IdentityType {
  IDENTITY = 1,
  ORGANIZATION = 2,
  GROUP = 3,
  ROLE = 4,
}

interface DetailTableACL {
  identityType?: IdentityType,
  identityId?: number,
  permissionId?: number,
  id?: number,
}
@Component({
    selector: 'app-acl-modal',
    imports: [
        CommonModule,
        SharedModule,
        FormsModule,
        ReactiveFormsModule,
        NzModalModule,
        NzListModule,
        NzSelectModule,
        NzTableModule,
        NzSpinModule,
        NzButtonModule,
        NzIconModule,
        AclRulesModalComponent,
    ],
    templateUrl: './acl-modal.component.html',
    styleUrls: ['./acl-modal.component.sass']
})
export class AclModalComponent implements OnInit {

  identityTypes = new Map<any, { name: string }>([
    [IdentityType.IDENTITY, { name: "Usuario" }],
    [IdentityType.GROUP, { name: "Grupo" }],
    [IdentityType.ORGANIZATION, { name: "Organización" }],
    [IdentityType.ROLE, { name: "Rol" }],
  ]);

  permissionTypes = new Map<number, { name: string }>();

  detailsDataTable: Set<DetailTableACL> = new Set();
  isVisibleAclRulesModal = false;
  _isVisible: boolean;
  @Output() isVisibleChange = new EventEmitter<boolean>();

  set isVisible(val) {
    if (val) {
      this.initModal();
    }
    this._isVisible = val;
    this.isVisibleChange.emit(this._isVisible);
  }

  @Input()
  get isVisible() {
    return this._isVisible;
  }

  objectTypeName = null;
  objectUUID = null;
  featureId = null;

  private aclId = null;
  private objectType = null;

  loadingModal;
  identityList: { [key: string]: any[] } = {};

  constructor(
    private readonly backendService: BackendService,
    private logService: MessageLogService,
    private notificationServices: NotificationService,
    private modalService: NzModalService,
  ) { }

  ngOnInit(): void {

  }

  initModal() {
    if (!this.objectTypeName || !this.objectUUID) {
      console.log("abort");
      this.isVisible = false;
      return;
    }
    this.identityList[IdentityType.IDENTITY] = [];
    this.identityList[IdentityType.GROUP] = [];
    this.identityList[IdentityType.ORGANIZATION] = [];
    this.identityList[IdentityType.ROLE] = [];
    this.loadDataFromBackend();
  }

  private loadDataFromBackend(): void {
    this.loadingModal = true;
    const paramsObjectType = {
      name: this.objectTypeName,
    };
    this.backendService.getObjectTypes(undefined, paramsObjectType).subscribe(response => {
      if (response["content"].length == 1) {
        const objectType = response["content"][0];
        this.objectType = objectType;
        this.permissionTypes.clear();
        for (const permissionType of objectType.permission_types) {
          this.permissionTypes.set(permissionType.id, { name: permissionType.name });
        }
        this.loadAclFromBackend();
      } else {
        this.isVisible = false;
      }
    }, error => {
      console.log(error);
      this.isVisible = false;
    });
  }

  private loadAclFromBackend(): void {
    this.backendService.getACL(undefined, { object_uuid: this.objectUUID }).subscribe(response => {
      const content = response["content"];
      this.formatToDetailsDataTable(content.details);
      this.aclId = content.id;
      this.loadIdentitiesFromBackend();
      this.logService.addIssues(response['issues']);
    }, error => {
      if (error.status == 404) {
        this.aclId = null;
        this.formatToDetailsDataTable([]);
        this.loadIdentitiesFromBackend();
        return;
      }
      this.isVisible = false;
      this.logService.addIssues(error['issues']);
      console.log(error);
    });
  }

  private loadIdentitiesFromBackend(): void {
    const identitiesObservable = this.backendService.getIdentities();
    const groupsObservable = this.backendService.getGroups();
    const organizationsObservable = this.backendService.getOrganizations();
    const rolesObservable = this.backendService.getRoles();

    forkJoin({
      identities: identitiesObservable,
      groups: groupsObservable,
      organizations: organizationsObservable,
      roles: rolesObservable,
    }).subscribe((response) => {
      this.identityList[IdentityType.IDENTITY] = response.identities["content"];
      this.identityList[IdentityType.GROUP] = response.groups["content"];
      this.identityList[IdentityType.ORGANIZATION] = response.organizations["content"];
      this.identityList[IdentityType.ROLE] = response.roles["content"];
      this.loadingModal = false;
    });
  }

  private formatToDetailsDataTable(details) {
    this.detailsDataTable.clear();
    for (const detailGetACL of details) {
      const detail: DetailTableACL = {};
      detail.identityType = detailGetACL.authorizable.authorizable_type_id;
      detail.permissionId = detailGetACL.permission_id;
      if (typeof detail.permissionId === 'string') {
        detail.permissionId = parseInt(detail.permissionId);
      }
      detail.identityId = detailGetACL.authorizable.id;
      detail.id = detailGetACL.id;
      this.detailsDataTable.add(detail);
    }
  }

  private formatBody() {
    const body = {
      object_type: this.objectType.id,
      details: [],
    };
    for (const detailDataTable of this.detailsDataTable) {
      const detail: any = {
        authorizable_id: detailDataTable.identityId,
        permission_id: detailDataTable.permissionId,
      };
      if (detailDataTable.id) {
        detail.id = detailDataTable.id;
      }
      body.details.push(detail);
    }
    return body;
  }

  getArrayDetailsDataTable(): any[] {
    if (this.detailsDataTable.size == 0) {
      return [''];
    }
    return Array.from(this.detailsDataTable);
  }

  selectIdentityTypeChange(event, data) {
    data.identityId = null;
  }

  getSelectIdentitiestDisabled(data) {
    if (Object.values(IdentityType).includes(data.identityType)) {
      return false;
    }
    return true;
  }

  handleCancel(): void {
    this.isVisible = false;
  }

  handleConfirm(): void {
    for (const detail of this.detailsDataTable) {
      if (!detail.identityId || !detail.identityType || !detail.permissionId) {
        this.notificationServices.createNotificationWithType(
          TypeNotificationEnum.error,
          'Error',
          'No se admiten campos vacíos en la tabla de permisos.',
          'bottomRight',
        )
        return;
      }
    }
    if (this.aclId) {

      this.backendService.putACL(this.aclId, this.formatBody()).subscribe(response => {
        console.log(response);
        this.isVisible = false;
        this.logService.addIssues(response['issues']);
      }, error => {
        console.log(error);
      });

    } else {

      if (this.detailsDataTable.size > 0) {
        const body = this.formatBody();
        body["object_uuid"] = this.objectUUID;
        this.backendService.postACL(body).subscribe(response => {
          console.log(response);
          this.isVisible = false;
          this.logService.addIssues(response['issues']);
        }, error => {
          console.log(error);
        });
      } else {
        this.isVisible = false;
      }

    }
  }

  deleteAclDetail(event, data) {
    this.detailsDataTable.delete(data);
  }

  addAclDetail(event) {
    this.detailsDataTable.add({});
    console.log(this.detailsDataTable);
  }

  showACLRulesModal() {

  }
}

