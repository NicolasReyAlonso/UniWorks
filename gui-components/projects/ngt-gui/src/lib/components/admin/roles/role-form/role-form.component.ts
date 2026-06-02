import {Component, ElementRef, EventEmitter, Input, OnInit, Output, ViewChild} from '@angular/core';
import {FormsModule, ReactiveFormsModule, UntypedFormBuilder, UntypedFormGroup, Validators} from '@angular/forms';
import {NzModalModule, NzModalRef, NzModalService} from 'ng-zorro-antd/modal';
import {NzSelectComponent, NzSelectModule} from 'ng-zorro-antd/select';
import {Observable, Subject, Subscription} from 'rxjs';
import {BackendService} from 'ngt-gui/core';import {IdentityFormComponent} from '../../identities/identity-form/identity-form.component';
import {CommonModule} from '@angular/common';
import {NzButtonModule} from "ng-zorro-antd/button";
import {NzInputModule} from "ng-zorro-antd/input";
import {NzFormModule} from "ng-zorro-antd/form";
import {SharedModule} from "../../../../shared-module/shared.module";

namespace ENUMS {
  export enum GRID {
    TWO_COLUMNS,
    THREE_COLUMNS,
  }

  export enum REASON_SELECT_OPEN {
    CLICK_ITEM,
  }
}

@Component({
    selector: 'app-role-form',
    imports: [
        CommonModule,
        NzButtonModule,
        NzInputModule,
        IdentityFormComponent,
        NzFormModule,
        FormsModule,
        ReactiveFormsModule,
        NzSelectModule,
        SharedModule,
        NzModalModule,
    ],
    templateUrl: './role-form.component.html',
    styleUrls: ['./role-form.component.sass']
})
export class RoleFormComponent implements OnInit {

  idIdentityOpenModal = null;

  formGroup!: UntypedFormGroup;

  @Input("roleId") roleId;

  identitiesList = [];
  loadingIdentitiesSelect = true;

  disableEditFormSubject: Subject<boolean> = new Subject<boolean>();

  @ViewChild('identitiesSelect', {static: false}) identitiesSelectElementRef: NzSelectComponent;
  private reasonSelectOpen: ENUMS.REASON_SELECT_OPEN = null;

  @ViewChild('identityFormElementRef', {static: false}) identityFormElementRef: IdentityFormComponent;
  @ViewChild('modalIdentityTitle', {static: false}) modalIdentityTitle;
  @ViewChild('modalIdentityContent', {static: false}) modalIdentityContent;
  @ViewChild('modalIdentityFooter', {static: false}) modalIdentityFooter;

  readonly GRID_COLUMNS = ENUMS.GRID;

  @Input("disableEditEvent") disableEditEvent: Observable<boolean>;
  private disableEditSubscription: Subscription;

  @Input("disableEdit") disableEdit: boolean = false;

  @Input("state") state: any = null;
  @Input("showTestButton") showTestButton: boolean = false;
  @Input("showCreateButton") showCreateButton: boolean = false;
  @Input("showEditButton") showEditButton: boolean = false;
  @Input("showDeleteButton") showDeleteButton: boolean = false;
  @Input("showCancelButton") showCancelButton: boolean = false;

  @Output("endInitComponent") endInitComponent: EventEmitter<null> = new EventEmitter<null>();
  @Output("cancelEvent") cancelEventEmiter: EventEmitter<any> = new EventEmitter<any>();
  @Output("requestEnd") requestEnd = new EventEmitter<{
    methodRequest: 'PUT' | 'POST' | 'GET',
    responseType: 'error' | 'success',
    data?: any
  }>();

  constructor(
    private readonly fb: UntypedFormBuilder,
    private readonly backendService: BackendService,
    private readonly modalService: NzModalService,
  ) {
  }

  ngOnInit(): void {
    this.formGroup = this.fb.group({
      name: [{value: "", disabled: this.disableEdit}],
      identities: [[]],
    });
    this.updateStateDisableInputs(true);
    if (this.disableEditEvent) {
      this.disableEditSubscription = this.disableEditEvent.subscribe((state: boolean) => {
        this.updateStateDisableInputs(state);
      });
    }
    this.setRoleData();
    this.getOptionsSelects();
    this.endInitComponent.emit();
  }

  ngAfterViewInit(): void {
    this.formGroup.controls["name"].setValidators([Validators.required]);
  }

  ngOnDestroy(): void {
    if (this.disableEditSubscription) this.disableEditSubscription.unsubscribe();
  }

  private setRoleData(): void {
    if (this.roleId) {
      this.backendService.getRoles(this.roleId).subscribe((response) => {
        const content = response["content"];
        if (content.name) {
          this.formGroup.controls["name"].setValue(this.state && this.state.name ? this.state.name : content.name);
        }
        if (content.identities) {
          const identities = []
          for (const identity of content.identities) {
            identities.push(identity.identity_id);
          }
          this.formGroup.controls["identities"].setValue(this.state && this.state.identities ? this.state.identities : identities);
        }
        this.updateStateDisableInputs(false);
        this.requestEnd.emit({methodRequest: 'GET', responseType: "success"});
      }, (error) => {
        console.log(error);
        this.requestEnd.emit({methodRequest: 'GET', responseType: "error"});
      });
    } else {
      this.updateStateDisableInputs(false);
    }
  }

  private getOptionsSelects() {
    this.getOptionsSelectsIdentity();
  }

  private getOptionsSelectsIdentity() {
    this.backendService.getIdentities().subscribe((response) => {
      const content = response["content"];
      this.identitiesList = content;
      this.loadingIdentitiesSelect = false;
    }, (error) => {
      console.log(error);
    });
  }

  private updateStateDisableInputs(disable: boolean) {
    this.disableEdit = disable;
    if (this.disableEdit) {
      this.formGroup.controls["name"].disable();
    } else {
      this.formGroup.controls["name"].enable();
    }
  }

  private formatDataForBackend(requestMethod: 'POST' | 'PUT') {
    const name = this.formGroup.value.name;

    const identitiesValue = this.formGroup.value.identities;
    const identities = [];
    for (const item of identitiesValue) {
      identities.push({role_id: this.roleId, identity_id: item});
    }

    const data = {
      name: name,
      identities: identities,
    }

    return data;
  }

  getStatusInput(formControlName: string) {
    return this.formGroup.controls[formControlName].status;
  }

  getGrid(gridColumns: ENUMS.GRID, formIdentityElementRef: ElementRef) {
    if (formIdentityElementRef) {
      switch (gridColumns) {
        case ENUMS.GRID.TWO_COLUMNS:
          if (formIdentityElementRef.nativeElement.clientWidth < 700) {
            return 24;
          } else {
            return 12;
          }
        case ENUMS.GRID.THREE_COLUMNS:
          if (formIdentityElementRef.nativeElement.clientWidth < 1200) {
            return 24;
          } else {
            return 8;
          }
      }
    }
    return 24;
  }

  modifyRole() {
    if (this.formGroup.valid) {
      const data = this.formatDataForBackend('PUT');
      this.disableEdit = true;
      this.backendService.putRole(this.roleId, data).subscribe((response) => {
        console.log(response);
        this.requestEnd.emit({methodRequest: 'PUT', responseType: "success"});
        this.disableEdit = false;
      }, (error) => {
        this.requestEnd.emit({methodRequest: 'PUT', responseType: "error"});
        console.log(error);
        this.disableEdit = false;
      });

    }
  }

  createRole() {
    if (this.formGroup.valid) {
      const data = this.formatDataForBackend('POST');
      this.disableEdit = true;
      this.backendService.postRole(data).subscribe((response) => {
        this.disableEdit = false;
        console.log(response);
        this.requestEnd.emit({methodRequest: 'POST', responseType: "success"});
      }, (error) => {
        this.requestEnd.emit({methodRequest: 'POST', responseType: "error"});
        console.log(error);
      });

    }
  }

  onClickCancelButton() {
    this.cancelEventEmiter.emit();
  }

  selectOpenChange(event) {
    if (event) {
      if (this.reasonSelectOpen == ENUMS.REASON_SELECT_OPEN.CLICK_ITEM) {
        this.identitiesSelectElementRef.setOpenState(false);
        this.reasonSelectOpen = null;
      }
    }
  }

  selectItemClick(event) {
    if (!this.identitiesSelectElementRef.nzOpen) {
      this.reasonSelectOpen = ENUMS.REASON_SELECT_OPEN.CLICK_ITEM;
    }
    this.idIdentityOpenModal = event.nzValue;
    const modal = this.modalService.create({
      nzTitle: this.modalIdentityTitle,
      nzContent: this.modalIdentityContent,
      nzFooter: this.modalIdentityFooter,
      nzData: {
        id: event.nzValue,
      }
    });
  }

  requestEndItemForm(event: { methodRequest: 'PUT' | 'POST' | 'GET', responseType: 'error' | 'success', data?: any },
                     type: 'Identity') {
    switch (event.methodRequest) {
      case 'GET':
        if (event.responseType == "success") {
          this.disableEditFormSubject.next(false);
        }
        break;
      case 'PUT':
        if (event.responseType == "success") {
          this.modalService.closeAll();
          if (type == 'Identity') {
            this.getOptionsSelectsIdentity();
          }
        }
        break;
    }
  }

  onClickDestroyModal(modalRef: NzModalRef) {
    modalRef.destroy();
  }

  onClickModifyIdentityModal() {
    this.identityFormElementRef.modifyIdentity();
  }

  disableModifyButtonIdentityModal() {
    if (!this.identityFormElementRef) {
      return true;
    } else {
      return !this.identityFormElementRef.formGroup.valid;
    }
  }

  test() {
    console.log(this.cancelEventEmiter.observers);
  }

}

