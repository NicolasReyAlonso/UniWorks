import {Component, OnDestroy, OnInit} from '@angular/core';
import {ActivatedRoute, Router} from '@angular/router';
import {FormsModule, ReactiveFormsModule, UntypedFormBuilder} from '@angular/forms';
import {forkJoin, lastValueFrom} from 'rxjs';
import {BackendService} from 'ngt-gui/core';import {NotificationService, TypeNotificationEnum} from 'src/app/services/notification.service';
import {MessageLogService} from 'src/app/services/message-log.service';
import { StateService } from 'ngt-gui/core';
import IView from "@interfaces/view.interfaces";
import {CommonModule} from "@angular/common";
import {SharedModule} from "../../../../shared-module/shared.module";
import {NzInputModule} from "ng-zorro-antd/input";
import {NzButtonModule} from "ng-zorro-antd/button";
import {NzSelectModule} from "ng-zorro-antd/select";
import {NzFormModule} from "ng-zorro-antd/form";
import {NzModalModule} from "ng-zorro-antd/modal";
import {NzListModule} from "ng-zorro-antd/list";
import {NzTableModule} from "ng-zorro-antd/table";
import {DisableControlDirective} from "../../../../directives/disable-control.directive";
import {NzSpinModule} from "ng-zorro-antd/spin";
import {BackButtonComponent} from "../../../../components/miscellaneous/back-button/back-button.component";
import {NzPageHeaderModule} from "ng-zorro-antd/page-header";
@Component({
    imports: [
        CommonModule,
        SharedModule,
        NzInputModule,
        NzButtonModule,
        NzSelectModule,
        FormsModule,
        ReactiveFormsModule,
        NzFormModule,
        NzModalModule,
        NzListModule,
        NzTableModule,
        DisableControlDirective,
        NzSpinModule,
        BackButtonComponent,
        NzPageHeaderModule,
    ],
    selector: 'app-template-detail',
    templateUrl: './template-detail.component.html',
    styleUrls: ['./template-detail.component.sass']
})
export class TemplateDetailComponent implements OnInit, OnDestroy, IView {

  BREADCRUMB_NAME = {
    key: 'ANNOTATIONS.TEMPLATES.DETAIL.BREADCRUMB',
    params: {
      name: '',
    }
  };

  snapshotTemplateData;
  displayName = '';
  loading = false;
  formGroup;
  formGroupChange = false;

  addFieldVisibleModal = false;
  addObjectTypesVisibleModal = false;
  selectModal = [];

  fieldsList = [];
  objectTypesList = [];

  constructor(
    private readonly activateRoute: ActivatedRoute,
    private readonly fb: UntypedFormBuilder,
    private readonly backendService: BackendService,
    private readonly notificationService: NotificationService,
    private readonly messageLogService: MessageLogService,
    private readonly router: Router,
    private readonly stateService: StateService,
  ) { }

  async ngOnInit(): Promise<void> {
    this.loading = true;
    this.snapshotTemplateData = this.activateRoute.snapshot.data.template.content;
    this.displayName = this.snapshotTemplateData.name;
    this.initFormGroup();
    await this.loadListItemsNecessary();
    const getState = await this.stateService.getStateCurrenView();
    if (!getState || !getState.formGroupChange) {
      this.reloadData(this.snapshotTemplateData).then();
    } else {
      console.log(getState);
      this.formGroup.get('name').setValue(getState.name ? getState.name : '');
      this.formGroup.get('description').setValue(getState.description ? getState.description : '');
      this.formGroup.get('object_types').setValue(getState.object_types ? getState.object_types : []);
      this.formGroup.get('field_id').setValue(getState.field_id ? getState.field_id : []);
      this.formGroup.get('standard').setValue(getState.standard ? getState.standard : '');
      this.formGroupChange = getState.formGroupChange;
    }
    this.loading = false;
  }
  async ngOnDestroy(): Promise<void> {
    this.BREADCRUMB_NAME.params.name = this.formGroup.get('name').value;
    if (!this.formGroupChange) {
      this.stateService.setStateCurrentView({
        formGroupChange: this.formGroupChange,
      }).then();
    } else {
      this.stateService.setStateCurrentView({
        name: this.formGroup.get('name').value,
        description: this.formGroup.get('description').value,
        object_types: this.formGroup.get('object_types').value,
        field_id: this.formGroup.get('field_id').value,
        standard: this.formGroup.get('standard').value,
        formGroupChange: this.formGroupChange,
      }).then();
    }
  }


  initFormGroup(): void {
    this.formGroup = this.fb.group({
      id: [{value: this.snapshotTemplateData.id, disabled: true}],
      name: [''],
      description: [''],
      object_types: [[]],
      field_id: [[]],
      standard: [''],
      unique: [this.snapshotTemplateData.unique],
    });
    this.formGroup.valueChanges.subscribe({next:(change) => this.formValueChange(change)});
  }


  async reloadData(contentTemplate): Promise<void> {
    this.loading = true;
    this.response2FormValues(contentTemplate);
    this.formGroupChange = false;
    this.loading = false;
  }

  response2FormValues(responseContent): void {
    const fieldId = [];
    const objectTypes = [];

    if (responseContent.annotation_form_fields) {
      for (const item of responseContent.annotation_form_fields) {
        fieldId.push(item.form_field_id);
      }
    }
    if (responseContent.object_types) {
      for (const item of responseContent.object_types) {
        objectTypes.push(item.object_type_id);
      }
    }

    this.formGroup.get('name').setValue(responseContent.name ? responseContent.name : '');
    this.formGroup.get('description').setValue(responseContent.description ? responseContent.description : '');
    this.formGroup.get('standard').setValue(responseContent.standard ? responseContent.standard : '');
    this.formGroup.get('object_types').setValue(objectTypes);
    this.formGroup.get('field_id').setValue(fieldId);
  }


  async loadListItemsNecessary(): Promise<void> {
    const observables = {
      fields: this.backendService.getAnnotationField(),
      objectTypes: this.backendService.getObjectTypes(),
    };
    const response: any = await lastValueFrom(forkJoin(observables), { defaultValue: undefined });
    this.fieldsList = response.fields.content;
    this.objectTypesList = response.objectTypes.content;
  }

  private formValueChange(change) {
    this.formGroupChange = true;
  }

  async modifyItem(): Promise<void> {
    this.loading = true;
    const value = {
      name: this.formGroup.get('name').value,
      description: this.formGroup.get('description').value,
      field_id: this.formGroup.get('field_id').value,
      object_type_id: this.formGroup.get('object_types').value,
      unique: this.formGroup.get('unique').value,
    };
    try {
      const response: any = await lastValueFrom(this.backendService.putAnnotationTemplates(this.snapshotTemplateData.id, value), { defaultValue: undefined });
      this.messageLogService.addIssues(response.issues);
      this.formGroupChange = false;
      this.displayName = this.formGroup.get('name').value;
    } catch (e) {
      await this.notificationService.createNotificationWithType(TypeNotificationEnum.error, 'ANNOTATIONS.TEMPLATES.DETAIL.NOTIFICATION_FAIL_MODIFY.TITLE',
        'ANNOTATIONS.TEMPLATES.DETAIL.NOTIFICATION_FAIL_MODIFY.CONTENT', 'bottomRight');
    }
    this.loading = false;
  }

  async cancelModifyItem(): Promise<void> {
    this.loading = true;
    const responseTemplate: any = await lastValueFrom(this.backendService.getAnnotationsTemplates(this.snapshotTemplateData.id), { defaultValue: undefined });
    await this.reloadData(responseTemplate.content);
  }

  /* Fields */
  async openField(id): Promise<void> {
    await this.router.navigate(['annotationsFieldDetail', id]);
  }

  getFieldById(id): any {
    return this.fieldsList.find((value) => {
      return value.id === id;
    });
  }

  removeField(index): any {
    const control = this.formGroup.get('field_id');
    const newArray = [...control.value];
    newArray.splice(index, 1);
    control.setValue(newArray);
  }

  openAddModalFields(): void {
    this.selectModal = [];
    this.addFieldVisibleModal = true;
  }

  getAddFieldsOptions(): any[] {
    const fbValue: any[] = this.formGroup.get('field_id').value;
    return this.fieldsList.filter( (value) => {
      return !fbValue.includes(value.id);
    });
  }

  addFieldModal() {
    const control = this.formGroup.get('field_id');
    control.setValue([...control.value, ...this.selectModal]);
    this.selectModal = [];
    this.addFieldVisibleModal = false;
  }

  /* Object Types */

  getObjectTypeById(id): any {
    return this.objectTypesList.find((value) => {
      return value.id === id;
    });
  }

  removeObjectType(index): void {
    const control = this.formGroup.get('object_types');
    const newArray = [...control.value];
    newArray.splice(index, 1);
    control.setValue(newArray);
  }

  getAddObjectTypesOptions(): any[] {
    const fbValue: any[] = this.formGroup.get('object_types').value;
    return this.objectTypesList.filter( (value) => {
      return !fbValue.includes(value.id);
    });
  }

  openAddModalObjectTypes() {
    this.selectModal = [];
    this.addObjectTypesVisibleModal = true;
  }

  addObjectTypesModal() {
    const control = this.formGroup.get('object_types');
    control.setValue([...control.value, ...this.selectModal]);
    this.selectModal = [];
    this.addObjectTypesVisibleModal = false;
  }

  isDisableEdit() {
    return false; // Permissions
  }

}
