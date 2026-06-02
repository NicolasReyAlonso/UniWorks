import {AfterContentChecked, ChangeDetectorRef, Component, OnDestroy, OnInit} from '@angular/core';
import {ActivatedRoute, Router} from '@angular/router';
import {FormsModule, ReactiveFormsModule, UntypedFormBuilder, UntypedFormGroup} from '@angular/forms';
import {BackendService} from 'ngt-gui/core';import {NotificationService, TypeNotificationEnum} from 'src/app/services/notification.service';
import {MessageLogService} from 'src/app/services/message-log.service';
import {forkJoin, lastValueFrom} from 'rxjs';
import {viewTypes} from 'src/app/components/data/annotations/fields/field-view-types';
import IView from '@interfaces/view.interfaces';
import { StateService } from 'ngt-gui/core';
import { CommonModule } from '@angular/common';
import {NzInputModule} from "ng-zorro-antd/input";
import {NzIconModule} from "ng-zorro-antd/icon";
import {NzButtonModule} from "ng-zorro-antd/button";
import {SharedModule} from "../../../../shared-module/shared.module";
import {NzSelectModule} from "ng-zorro-antd/select";
import {NzModalModule} from "ng-zorro-antd/modal";
import {NzListModule} from "ng-zorro-antd/list";
import {NzTableModule} from "ng-zorro-antd/table";
import {DisableControlDirective} from "../../../../directives/disable-control.directive";
import {NzFormModule} from "ng-zorro-antd/form";
import {NzSpinModule} from "ng-zorro-antd/spin";
import {BackButtonComponent} from "../../../../components/miscellaneous/back-button/back-button.component";
import {NzPageHeaderModule} from "ng-zorro-antd/page-header";

@Component({
    selector: 'app-field-detail',
    imports: [
        CommonModule,
        NzInputModule,
        NzIconModule,
        NzButtonModule,
        SharedModule,
        NzSelectModule,
        FormsModule,
        ReactiveFormsModule,
        NzModalModule,
        NzListModule,
        NzTableModule,
        DisableControlDirective,
        NzFormModule,
        NzSpinModule,
        BackButtonComponent,
        NzPageHeaderModule,
    ],
    templateUrl: './field-detail.component.html',
    styleUrls: ['./field-detail.component.sass']
})
export class FieldDetailComponent implements OnInit, OnDestroy, IView, AfterContentChecked {

  snapshotFieldData;
  displayName = '';
  loading = false;
  formGroup: UntypedFormGroup;
  formGroupChange = false;

  addTemplatesVisibleModal = false;
  addObjectTypesVisibleModal = false;
  selectModal = [];

  templatesList = [];
  objectTypesList = [];
  viewTypesList = viewTypes;

  BREADCRUMB_NAME = {
    key: 'ANNOTATIONS.FIELDS.DETAIL.BREADCRUMB',
    params: {
      name: '',
    }
  };

  constructor(
    private readonly activateRoute: ActivatedRoute,
    private readonly fb: UntypedFormBuilder,
    private readonly backendService: BackendService,
    private readonly notificationService: NotificationService,
    private readonly messageLogService: MessageLogService,
    private readonly router: Router,
    private readonly stateService: StateService,
    private readonly ref: ChangeDetectorRef,
  ) {
  }

    ngAfterContentChecked() {
    this.ref.detectChanges();
  }

  async ngOnInit(): Promise<void> {
    this.snapshotFieldData = this.activateRoute.snapshot.data.field.content;
    this.displayName = this.snapshotFieldData.name;
    await this.loadListItemsNecessary();
    this.initFormGroup();
    const getState = await this.stateService.getStateCurrenView();
    if (!getState || !getState.formGroupChange) {
      this.reloadData(this.snapshotFieldData).then();
    } else {
      this.formGroup.get('name').setValue(getState.name ? getState.name : '');
      this.formGroup.get('description').setValue(getState.description ? getState.description : '');
      this.formGroup.get('object_types').setValue(getState.object_types ? getState.object_types : []);
      this.formGroup.get('template_id').setValue(getState.template_id ? getState.template_id : []);
      this.formGroup.get('standard').setValue(getState.standard ? getState.standard : '');
      this.formGroupChange = getState.formGroupChange;
    }
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
        template_id: this.formGroup.get('template_id').value,
        standard: this.formGroup.get('standard').value,
        formGroupChange: this.formGroupChange,
      }).then();
    }
  }

  initFormGroup(): void {
    console.log(this.snapshotFieldData);
    this.formGroup = this.fb.group({
      id: [{value: this.snapshotFieldData.id, disabled: true}],
      name: [''],
      description: [''],
      object_types: [[]],
      template_id: [[]],
      view_type: [this.snapshotFieldData.view_type],
      multiple: [this.snapshotFieldData.range && this.snapshotFieldData.range.multiple ? this.snapshotFieldData.range.multiple : false],
      standard: [''],
      unique: [this.snapshotFieldData.unique],
    });
    this.formGroup.valueChanges.subscribe({next:(change) => this.formValueChange(change)});
  }

  async reloadData(responseField): Promise<void> {
    this.loading = true;
    this.response2FormValues(responseField);
    this.formGroupChange = false;
    this.loading = false;
  }

  response2FormValues(responseContent): void {
    const templateId = [];
    const objectTypes = [];

    if (responseContent.annotation_form_templates) {
      for (const item of responseContent.annotation_form_templates) {
        templateId.push(item.form_template_id);
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
    this.formGroup.get('template_id').setValue(templateId);
  }


  async loadListItemsNecessary(): Promise<void> {
    const observables = {
      templates: this.backendService.getAnnotationsTemplates(),
      objectTypes: this.backendService.getObjectTypes(),
    };
    const response: any = await lastValueFrom(forkJoin(observables), { defaultValue: undefined });
    this.templatesList = response.templates.content;
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
      template_id: this.formGroup.get('template_id').value,
      object_type_id: this.formGroup.get('object_types').value,
      view_type: this.formGroup.get('view_type').value,
      multiple: this.formGroup.get('multiple').value,
      unique: this.formGroup.get('unique').value,
    };
    try {
      const response: any = await lastValueFrom(this.backendService.putAnnotationFields(this.snapshotFieldData.id, value), { defaultValue: undefined });
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
    const responseField: any = await lastValueFrom(this.backendService.getAnnotationField(this.snapshotFieldData.id), { defaultValue: undefined });
    await this.reloadData(responseField.content);
  }

  /* Template */
  async openTemplate(id): Promise<void> {
    await this.router.navigate(['annotationsTemplateDetail', id]);
  }

  getTemplateById(id): any {
    return this.templatesList.find((value) => {
      return value.id === id;
    });
  }

  removeTemplate(index): any {
    const control = this.formGroup.get('template_id');
    const newArray = [...control.value];
    newArray.splice(index, 1);
    control.setValue(newArray);
  }

  openAddModalTemplates(): void {
    this.selectModal = [];
    this.addTemplatesVisibleModal = true;
  }

  getAddTemplatesOptions(): any[] {
    const fbValue: any[] = this.formGroup.get('template_id').value;
    return this.templatesList.filter((value) => {
      return !fbValue.includes(value.id);
    });
  }

  addTemplateModal() {
    const control = this.formGroup.get('template_id');
    control.setValue([...control.value, ...this.selectModal]);
    this.selectModal = [];
    this.addTemplatesVisibleModal = false;
  }

  getViewTypeLabelByValue(): string {
    const viewType = this.viewTypesList.find((item) => {
      return item.value === this.formGroup.get('view_type').value;
    });
    return viewType.label;
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
    return this.objectTypesList.filter((value) => {
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
