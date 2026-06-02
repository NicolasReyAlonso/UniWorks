import { AfterViewChecked, ChangeDetectorRef, Component, ElementRef, EventEmitter, Input, OnInit, Output, ViewChild } from '@angular/core';
import {UntypedFormBuilder, UntypedFormGroup, AbstractControl, FormsModule, ReactiveFormsModule} from '@angular/forms';
import {BackendService} from 'ngt-gui/core';
import { Observable, Subscription } from 'rxjs';
import {AuthService} from "ngt-gui/core";
import {CommonModule} from "@angular/common";
import {NzButtonModule} from "ng-zorro-antd/button";
import {NzFormModule} from "ng-zorro-antd/form";
import {NzSelectModule} from "ng-zorro-antd/select";
import {NzDatePickerModule} from "ng-zorro-antd/date-picker";
import {NzInputModule} from "ng-zorro-antd/input";
import {SharedModule} from "../../../../shared-module/shared.module";

namespace ENUMS {
  export enum GRID {
    TWO_COLUMNS,
    THREE_COLUMNS,
  }
}
@Component({
    selector: 'app-identity-form',
    imports: [
        CommonModule,
        NzButtonModule,
        NzFormModule,
        NzSelectModule,
        NzDatePickerModule,
        FormsModule,
        ReactiveFormsModule,
        NzInputModule,
        SharedModule,
    ],
    templateUrl: './identity-form.component.html',
    styleUrls: ['./identity-form.component.sass']
})
export class IdentityFormComponent implements OnInit, AfterViewChecked {

  @ViewChild('formIdentityDetails', { static: false }) formIdentityElementRef: ElementRef;
  formGroup!: UntypedFormGroup;

  groupList = [];
  loadingGroupsSelect = true;
  rolesList = [];
  loadingRolesSelect = true;
  organizationsList = [];
  loadingOrganizationsSelect = true;

  readonly GRID_COLUMNS = ENUMS.GRID;

  @Input('identityId') identityId: string = null;
  @Input('disableEditEvent') disableEditEvent: Observable<boolean>;
  private disableEditSubscription: Subscription;

  @Input('disableEdit') disableEdit = false;
  @Input('state') state: any = null;

  @Input('showTestButton') showTestButton = false;
  @Input('showCreateButton') showCreateButton = false;
  @Input('showEditButton') showEditButton = false;
  @Input('showDeleteButton') showDeleteButton = false;
  @Input('showCancelButton') showCancelButton = false;

  @Output('endInitComponent') endInitComponent: EventEmitter<null> = new EventEmitter<null>();
  @Output('cancelEvent') cancelEventEmiter: EventEmitter<any> = new EventEmitter<any>();
  @Output('requestEnd') requestEnd = new EventEmitter<{ methodRequest: 'PUT' | 'POST' | 'GET', responseType: 'error' | 'success', data?: any }>();

  constructor(
    private readonly fb: UntypedFormBuilder,
    private readonly backendService: BackendService,
    // private readonly i18n: NzI18nService,
    private readonly cdRef: ChangeDetectorRef,
    public readonly authService: AuthService,
  ) { }

  ngOnInit(): void {
    // this.i18n.setLocale(es_ES);
    this.formGroup = this.fb.group({
      name: [''],
      email: [''],
      creationTime: [{ value: null, disabled: true }],
      deactivationTime: [null],
      groups: [[]],
      organizations: [[]],
      roles: [{ value: [], disabled: !this.authService.haveRole('sys-admin') }],
      can_login: [null],
    });
    this.formGroup.controls.name.setValidators([this.nameValidator.bind(this)]);
    this.formGroup.controls.email.setValidators([this.emailValidator.bind(this)]);
    this.formGroup.controls.deactivationTime.setValidators([this.deactivationTimeValidator.bind(this)]);
    this.updateStateDisableInputs(true);
    this.setIdentityData();
    if (this.disableEditEvent) {
      this.disableEditSubscription = this.disableEditEvent.subscribe((state: boolean) => {
        this.updateStateDisableInputs(state);
      });
    }
    this.endInitComponent.emit();
    this.getOptionsSelects();
  }

  ngOnDestroy(): void {
    if (this.disableEditSubscription) { this.disableEditSubscription.unsubscribe(); }
  }

  ngAfterViewChecked() {
    this.cdRef.detectChanges();
  }

  private setIdentityData(): void {
    if (!this.identityId) {
      setInterval(() => {
        this.formGroup.controls.creationTime.setValue(new Date());
      }, 1000);
      this.updateStateDisableInputs(false);
    } else {
      this.backendService.getIdentities(this.identityId).subscribe((response: any) => {
        const content = response.content;
        if (content.name) {
          this.formGroup.controls.name.setValue(this.state && this.state.name ? this.state.name : content.name);
        }
        if (content.can_login) {
          this.formGroup.controls.can_login.setValue(this.state && this.state.can_login != null ? this.state.can_login : content.can_login);
        }
        if (content.email) { this.formGroup.controls.email.setValue(this.state && this.state.email ? this.state.email : content.email); }


        if (content.groups) {
          let groups = [];
          for (const item of content.groups) {
            groups.push(item.group_id);
          }
          this.formGroup.controls.groups.setValue(this.state && this.state.groups ? this.state.groups : groups);
        }

        if (content.organizations) {
          let organizations = [];
          for (const item of content.organizations) {
            organizations.push(item.organization_id);
          }
          this.formGroup.controls.organizations.setValue(this.state && this.state.organizations ? this.state.organizations : organizations);
        }

        if (content.roles) {
          let roles = [];
          for (const item of content.roles) {
            roles.push(item.role_id);
          }
          this.formGroup.controls.roles.setValue(this.state && this.state.roles ? this.state.roles : roles);
        }

        if (content.creation_time) {
          const creationTime = new Date(content.creation_time);
          this.formGroup.controls.creationTime.setValue(creationTime);
        }

        if (content.deactivation_time) {
          const deactivationTime = new Date(content.deactivation_time);
          this.formGroup.controls.deactivationTime.setValue(this.state && this.state.deactivationTime ? this.state.deactivationTime : deactivationTime);
        }
        this.updateStateDisableInputs(false);
        this.requestEnd.emit({ methodRequest: 'GET', responseType: 'success' });
      }, (error) => {

      });
    }
  }

  private updateStateDisableInputs(disable: boolean) {
    this.disableEdit = disable;
    if (this.disableEdit) {
      this.formGroup.controls.name.disable();
      this.formGroup.controls.email.disable();
      this.formGroup.controls.deactivationTime.disable();
      this.formGroup.controls.groups.disable();
      this.formGroup.controls.organizations.disable();
      this.formGroup.controls.roles.disable();
    } else {
      this.formGroup.controls.name.enable();
      this.formGroup.controls.email.enable();
      this.formGroup.controls.deactivationTime.enable();
      this.formGroup.controls.groups.enable();
      this.formGroup.controls.organizations.enable();
      if (this.authService.haveRole('sys-admin')) {
        this.formGroup.controls.roles.enable();
      }
    }
  }

  private getOptionsSelects() {
    this.backendService.getGroups().subscribe((response: any) => {
      const content = response.content;
      this.groupList = content;
      this.loadingGroupsSelect = false;
    }, (error) => {
      console.log(error);
    });

    this.backendService.getRoles().subscribe((response: any) => {
      const content = response.content;
      this.rolesList = content;
      this.loadingRolesSelect = false;
    }, (error) => {
      console.log(error);
    });

    this.backendService.getOrganizations().subscribe((response: any) => {
      const content = response.content;
      this.organizationsList = content;
      this.loadingOrganizationsSelect = false;
    }, (error) => {
      console.log(error);
    });
  }

  private nameValidator(control: AbstractControl) {
    if (!control.value || control.value == '') {
      return { invalidName: { valid: false, value: control.value } };
    }
    return null;
  }

  private emailValidator(control: AbstractControl) {
    if (!control.value || control.value == '') {
      return null;
    }
    const valid = /^(([^<>()[\]\\.,;:\s@"]+(\.[^<>()[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/.test(control.value);
    return valid ? null : { invalidEmail: { valid: false, value: control.value } };
  }

  private deactivationTimeValidator(control: AbstractControl) {
    if (!control.value) {
      return null;
    }
    const deactivationTime = this.formGroup.controls.deactivationTime.value;
    const creationTime = this.formGroup.controls.creationTime.value;
    if (creationTime < deactivationTime) {
      return null;
    } else {
      this.formGroup.controls.deactivationTime.setErrors({ invalidDate: { valid: true, value: control.value } });
      return { invalidDate: { valid: true, value: control.value } };
    }
  }

  private getISOLocaleDate(date: Date): string {
    const z = date.getTimezoneOffset() * 60 * 1000;
    const offsetT = (date as any) - z;
    const tLocal = new Date(offsetT);
    let iso = tLocal.toISOString();
    iso = iso.slice(0, 19);
    iso = iso.replace('T', ' ');
    return iso;
  }

  private formatDataForBackend(requestMethod: 'POST' | 'PUT') {
    const name = this.formGroup.value.name;
    const can_login = this.formGroup.value.can_login;
    const email = this.formGroup.value.email != null || this.formGroup.value.email != '' ? this.formGroup.value.email : null;
    const deactivationTimeValue = this.formGroup.value.deactivationTime as Date;
    const deactivationTime = deactivationTimeValue ? this.getISOLocaleDate(deactivationTimeValue) : null;
    const groupsValue = this.formGroup.value.groups;
    const groups = [];
    for (const item of groupsValue) {
      groups.push({ identity_id: this.identityId, group_id: item });
    }
    const organizationsValue = this.formGroup.value.organizations;
    const organizations = [];
    for (const item of organizationsValue) {
      organizations.push({ identity_id: this.identityId, organization_id: item });
    }
    const rolesValue = this.formGroup.value.roles;
    const roles = [];
    for (const item of rolesValue) {
      roles.push({ identity_id: this.identityId, role_id: item });
    }

    const data: any = {
      name,
      email,
      deactivation_time: deactivationTime,
      groups,
      organizations,
      roles,
      can_login,
    };

    if (requestMethod == 'POST') {
      const creationTime = this.getISOLocaleDate(new Date());
      data.creation_time = creationTime;
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

  modifyIdentity() {
    if (this.formGroup.valid) {
      const data = this.formatDataForBackend('PUT');
      this.disableEdit = true;
      this.backendService.putIdentity(this.identityId, data).subscribe((response) => {
        console.log(response);
        this.requestEnd.emit({ methodRequest: 'PUT', responseType: 'success' });
        this.disableEdit = false;
      }, (error) => {
        this.requestEnd.emit({ methodRequest: 'PUT', responseType: 'error' });
        console.log(error);
        this.disableEdit = false;
      });

    }
  }

  createIdentity() {
    if (this.formGroup.valid) {
      const data = this.formatDataForBackend('POST');
      this.disableEdit = true;
      this.backendService.postIdentity(data).subscribe((response) => {
        this.disableEdit = false;
        console.log(response);
        this.requestEnd.emit({ methodRequest: 'POST', responseType: 'success' });
      }, (error) => {
        this.requestEnd.emit({ methodRequest: 'POST', responseType: 'error' });
        console.log(error);
      });

    }
  }

  onClickCancelButton() {
    this.cancelEventEmiter.emit();
  }

  test() {
    console.log(this.cancelEventEmiter.observers);
  }

}
