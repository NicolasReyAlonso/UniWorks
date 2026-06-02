import {AfterViewInit, ChangeDetectorRef, Component, ElementRef, Input, OnInit, ViewChild, Inject} from '@angular/core';
import {DragDropModule, moveItemInArray} from '@angular/cdk/drag-drop';
import {BackendService, BACKEND_SERVICE, BackendServiceInterface} from 'ngt-gui/core';
import {
  AbstractControl,
  FormsModule,
  ReactiveFormsModule,
  UntypedFormBuilder,
  UntypedFormGroup,
  ValidationErrors
} from '@angular/forms';
import {FormlyFieldConfig, FormlyModule} from '@ngx-formly/core';
import {MessageLogService, MESSAGE_LOG_SERVICE, MessageLogServiceInterface} from 'ngt-gui/core';
import {NotificationServiceInterface, TypeNotificationEnum, NOTIFICATION_SERVICE} from 'ngt-gui/core';
import {forkJoin} from 'rxjs';
import {CommonModule} from '@angular/common';
import {CKEditorModule} from "@ckeditor/ckeditor5-angular";
import {SafeHtmlPipe} from "../../../../pipes/safe-html.pipe";
import {SharedModule} from "../../../../modules/shared.module";
import {NzSelectModule} from "ng-zorro-antd/select";
import {NzFormModule} from "ng-zorro-antd/form";
import {NzModalModule} from "ng-zorro-antd/modal";
import {NzDropDownModule} from "ng-zorro-antd/dropdown";
import {NzSpinModule} from "ng-zorro-antd/spin";
import {NzIconModule} from "ng-zorro-antd/icon";
import {NzButtonModule} from "ng-zorro-antd/button";

interface Annotation {
  id?: any;
  annotation_type: 'richText' | 'field' | 'template';
  model: any;
  formlyReadMode?: FormlyFieldConfig[];
  formlyEditMode?: FormlyFieldConfig[];
  annotationFormItemId?: any;
  formGroup?: UntypedFormGroup;
  templateName?: string;
}

@Component({
    selector: 'app-annotations-form',
    standalone: true,
    imports: [
        CommonModule,
        FormsModule,
        ReactiveFormsModule,
        SharedModule,
        NzSelectModule,
        NzFormModule,
        FormlyModule,
        CKEditorModule,
        SafeHtmlPipe,
        NzModalModule,
        NzDropDownModule,
        NzSpinModule,
        NzIconModule,
        DragDropModule,
        NzButtonModule,
    ],
    templateUrl: './annotations-form.component.html',
    styleUrls: ['./annotations-form.component.sass']
})
export class AnnotationsFormComponent implements OnInit, AfterViewInit {

  @ViewChild('contentAnnotationsForm', {static: false}) contentAnnotationsForm: ElementRef;
  @Input() CKEditor: any;
  @Input() ContainerStyle: any;
  @Input() ObjectType: string;
  object_uuid;
  dataWhenEdit = "";

  listAnnotations: Annotation[] = [];
  editModeAnnotation = false;
  idSelectedAnnotation = null;
  loading = true;

  fieldSelectorModalVisible = false;
  fieldSelectorOptions = [];
  formGroupFieldSelector = this.fb.group({
    fields: [[]],
  }, {
    validators: [
      this.fieldSelectorValidator,
    ],
  });
  templateSelectorModalVisible = false;
  templateSelectorOptions = [];
  formGroupTemplateSelector = this.fb.group({
    templates: [[]],
  }, {
    validators: [
      this.templatesSelectorValidator,
    ],
  });

  CKEditorConfig = {
    toolbar: {
      items: [
        'fontFamily',
        'fontSize',
        'fontColor',
        'fontBackgroundColor',
        'bold',
        'italic',
        'blockQuote',
        'superscript',
        'subscript',
        '|',
        'outdent',
        'indent',
        'alignment',
        '|',
        'bulletedList',
        'numberedList',
        '|',
        'insertTable',
        'link',
        '|',
        'undo',
        'redo'
      ]
    },
    language: 'es',
    table: {
      contentToolbar: [
        'tableColumn',
        'tableRow',
        'mergeTableCells',
        'tableCellProperties'
      ]
    },
  };

  constructor(
    @Inject (BACKEND_SERVICE) private readonly backendService: BackendServiceInterface,
    private readonly fb: UntypedFormBuilder,
    @Inject (MESSAGE_LOG_SERVICE) private readonly messageLogService: MessageLogServiceInterface,
    @Inject (NOTIFICATION_SERVICE) private readonly notificationService: NotificationServiceInterface,
    private readonly changeDetectorRef: ChangeDetectorRef,
  ) {
  }

  async ngOnInit(): Promise<void> {
    this.loading = false;
  }

  ngAfterViewInit() {

  }

  loadTemplateAnnotation(template, fields: any[], id, model) {
    const auxTemplate = {...template};
    auxTemplate.formlyEditMode = [];
    auxTemplate.formlyReadMode = [];
    if (!auxTemplate.annotation_form_fields || auxTemplate.annotation_form_fields.length == 0) {
      return;
    }
    for (const relationship of template.annotation_form_fields) {
      const fieldId = relationship.form_field_id;
      const field = fields.find((value) => {
        return value.id == fieldId;
      });
      if (!field) {
        continue;
      }
      const formlyRead = {
        key: String(field.id),
        type: `${field.view_type}-read`,
        props: {
          label: field.name,
          multiple: field.multiple,
          range: field.range,
        }
      };
      const formlyEdit = {
        key: String(field.id),
        type: `${field.view_type}`,
        props: {
          label: field.name,
          multiple: field.multiple,
          range: field.range,
          style: {
            marginTop: '5px',
            marginBot: '5px'
          },
        }
      };
      if (model[formlyEdit.key]) {
        auxTemplate.formlyReadMode.push(formlyRead);
      }
      auxTemplate.formlyEditMode.push(formlyEdit);
    }

    const instance: Annotation = {
      id,
      annotation_type: 'template',
      model,
      annotationFormItemId: auxTemplate.id,
      templateName: auxTemplate.name,
      formGroup: new UntypedFormGroup({}),
      formlyEditMode: auxTemplate.formlyEditMode,
      formlyReadMode: auxTemplate.formlyReadMode,
    };

    this.listAnnotations.push(instance);
  }

  async loadAnnotations(): Promise<void> {
    this.loading = true;
    try {
      const response: any = await forkJoin({
        annotations: this.backendService.getAnnotationsByObjectUUID(this.object_uuid, {
          fast_mode: false,
          no_attach: true,
        }),
        fields: this.backendService.getAnnotationField(null, {
          fast_mode: false,
          no_attach: true,
        }),
        templates: this.backendService.getAnnotationsTemplates(null, {
          fast_mode: false,
          no_attach: true,
        }),
      }).toPromise();
      this.messageLogService.addIssues(response.annotations.issues);
      for (const annotation of response.annotations.content) {
        switch (annotation.annotation_type) {
          case 'field':
            const field = response.fields.content.find((value) => {
              return value.id == annotation.form_field_id;
            });
            this.addFieldAnnotation(field, annotation.id, {value: annotation.value});
            break;
          case 'template':
            const template = response.templates.content.find((value) => {
              return value.id == annotation.form_template_id;
            });
            this.loadTemplateAnnotation(template, response.fields.content, annotation.id, annotation.value);
            break;
          case 'text':
            this.addRichTextAnnotation(annotation.id, annotation.value);
        }
      }
    } catch (e) {
      console.log(e);
      if (e.issues) {
        this.messageLogService.addIssues(e.issues);
      }
    }
    this.loading = false;
  }

  async cancelChangesAnnotations(): Promise<void> {
    this.listAnnotations = [];
    this.loadAnnotations();
  }

  removeAnnotation(index: number): void {
    if (index === this.idSelectedAnnotation) {
      this.editModeAnnotation = false;
      this.idSelectedAnnotation = null;
    }
    this.listAnnotations.splice(index, 1);
  }

  selectAnnotation(index: number): void {
    if (index !== this.idSelectedAnnotation) {
      this.editModeAnnotation = false;
    }
    this.idSelectedAnnotation = index;
  }

  changeStateEditMode(state: boolean): void {
    if (state) {
      const annotation = this.listAnnotations[this.idSelectedAnnotation];
      this.dataWhenEdit = annotation.model;
    }
    this.editModeAnnotation = state;
  }

  annotationDragStart(event) {
    document.body.classList.add('body-grabbing');
  }

  annotationDragEnd(event) {
    document.body.classList.remove('body-grabbing');
  }

  annotationDrop(event) {
    moveItemInArray(this.listAnnotations, event.previousIndex, event.currentIndex);
    this.idSelectedAnnotation = event.currentIndex;
  }

  contentAnnotationsFormScrollBottom() {
    const div = this.contentAnnotationsForm.nativeElement as HTMLDivElement;
    this.changeDetectorRef.detectChanges();
    if (div) {
      div.scrollBy({
        top: div.scrollHeight,
        left: 0,
        behavior: 'smooth',
      })
    }
  }


  addRichTextAnnotation(id?, model?): void {
    const instance: Annotation = {
      annotation_type: 'richText',
      model: model ? model : '',
    };
    if (id) {
      instance.id = id;
    }
    this.listAnnotations.push(instance);
    this.contentAnnotationsFormScrollBottom();
  }

  onChangeValueRichText({editor}: any, index): void {
    const annotation = this.listAnnotations[index];
    annotation.model = editor.getData();
  }

  addFieldAnnotation(field, id?, model?) {
    const instance: Annotation = {
      annotation_type: 'field',
      model: model ? model : {},
      annotationFormItemId: field.id,
      formGroup: new UntypedFormGroup({}),
      formlyEditMode: [
        {
          key: 'value',
          type: field.view_type,
          props: {
            label: field.name,
            multiple: field.multiple,
            range: field.range,
          }
        },
      ],
      formlyReadMode: [
        {
          key: 'value',
          type: `${field.view_type}-read`,
          props: {
            label: field.name,
            multiple: field.multiple,
            range: field.range,
          }
        },
      ]
    };
    if (id) {
      instance.id = id;
    }
    this.listAnnotations.push(instance);
    this.contentAnnotationsFormScrollBottom();
  }

  async addTemplatesAnnotation(templates: any[]): Promise<void> {
    // const fieldIdsFound = [];
    const auxTemplates = [];
    const fieldFormlyRead = new Map<any, any>();
    const fieldFormlyEdit = new Map<any, any>();
    // Get necessary fields
    for (const template of templates) {
      if (!template.annotation_form_fields || template.annotation_form_fields.length === 0) {
        continue;
      }
      auxTemplates.push(template);
    }
    const filter = {
      form_template_id: auxTemplates.map((item) => {
        return item.id
      }),
    }
    const responseFieldsFound: any = await this.backendService.getAnnotationField(null, {
      filter: filter,
    }).toPromise();
    // Create formly for each field
    for (const field of responseFieldsFound.content) {
      const formlyRead = {
        key: String(field.id),
        type: `${field.view_type}-read`,
        props: {
          label: field.name,
          multiple: field.multiple,
          range: field.range,
        }
      };
      const formlyEdit = {
        key: String(field.id),
        type: `${field.view_type}`,
        props: {
          label: field.name,
          multiple: field.multiple,
          range: field.range,
          style: {
            marginTop: '5px',
            marginBot: '5px'
          },
        }
      };
      fieldFormlyRead.set(field.id, formlyRead);
      fieldFormlyEdit.set(field.id, formlyEdit);
    }
    // Add field formly to template
    for (const template of auxTemplates) {
      template.formlyEditMode = [];
      template.formlyReadMode = [];
      for (const relationship of template.annotation_form_fields) {
        const cloneFormlyEdit = {...fieldFormlyEdit.get(relationship.form_field_id)};
        const cloneFormlyRead = {...fieldFormlyRead.get(relationship.form_field_id)};
        template.formlyEditMode.push(cloneFormlyEdit);
        template.formlyReadMode.push(cloneFormlyRead);
      }
      const instance: Annotation = {
        annotation_type: 'template',
        model: {},
        annotationFormItemId: template.id,
        templateName: template.name,
        formGroup: new UntypedFormGroup({}),
        formlyEditMode: template.formlyEditMode,
        formlyReadMode: template.formlyReadMode,
      };

      this.listAnnotations.push(instance);
      this.contentAnnotationsFormScrollBottom();
    }
  }

  async openFieldSelectorModal(): Promise<void> {
    this.loading = true;
    this.formGroupFieldSelector.get('fields').setValue([]);
    try {
      const response: any = await this.backendService.getAnnotationField(null, {
        filter: {
          object_type: {
            op: 'in',
            unary: [this.ObjectType]
          }
        }
      }).toPromise();
      this.fieldSelectorOptions = response.content;
      this.fieldSelectorModalVisible = true;
    } catch (e) {

    }
    this.loading = false;
  }

  closeFieldSelectorModal(): void {
    this.formGroupFieldSelector.get('fields').setValue([]);
    this.fieldSelectorModalVisible = false;
  }

  async confirmFieldSelectorModal(): Promise<void> {
    this.fieldSelectorModalVisible = false;
    const fields = this.formGroupFieldSelector.get('fields').value;
    for (const field of fields) {
      this.addFieldAnnotation(field);
    }
  }

  async openTemplateSelectorModal(): Promise<void> {
    this.loading = true;
    this.formGroupTemplateSelector.get('templates').setValue([]);
    try {
      const response: any = await this.backendService.getAnnotationsTemplates(null, {
        filter: {
          object_type: {
            op: 'in',
            unary: [this.ObjectType]
          }
        },
        fast_mode: false,
      }).toPromise();
      this.templateSelectorOptions = response.content;
      this.templateSelectorModalVisible = true;
    } catch (e) {

    }
    this.loading = false;
  }

  async closeTemplateSelectorModal(): Promise<void> {
    this.formGroupTemplateSelector.get('templates').setValue([]);
    this.templateSelectorModalVisible = false;
  }

  async confirmTemplatesSelectorModal(): Promise<void> {
    this.templateSelectorModalVisible = false;
    this.loading = true;
    const templates = this.formGroupTemplateSelector.get('templates').value;
    await this.addTemplatesAnnotation(templates);
    this.loading = false;
  }

  async convertFieldAnnotation2Instance(annotation): Promise<any> {
    const instance: any = {
      value: annotation.model.value,
      annotation_type: 'field',
      form_field_id: annotation.annotationFormItemId,
      name: '',
    };
    if (annotation.id) {
      instance.id = annotation.id;
    }
    return instance;
  }

  async convertTemplateAnnotation2Instance(annotation): Promise<any> {
    const instance: any = {
      value: annotation.model,
      annotation_type: 'template',
      form_template_id: annotation.annotationFormItemId,
      name: '',
    };
    if (annotation.id) {
      instance.id = annotation.id;
    }
    return instance;
  }

  async convertRichTextAnnotation2Instance(annotation): Promise<any> {
    const instance: any = {
      value: annotation.model,
      annotation_type: 'text',
      name: '',
    };
    if (annotation.id) {
      instance.id = annotation.id;
    }
    return instance;
  }

  async convertListAnnotation2Instances() {
    const instances = [];
    for (const annotation of this.listAnnotations) {
      switch (annotation.annotation_type) {
        case 'field':
          instances.push(await this.convertFieldAnnotation2Instance(annotation));
          break;
        case 'template':
          instances.push(await this.convertTemplateAnnotation2Instance(annotation));
          break;
        case 'richText':
          instances.push(await this.convertRichTextAnnotation2Instance(annotation));
          break;
      }
    }
    return instances;
  }

  async saveAnnotations(): Promise<void> {
    const instances = await this.convertListAnnotation2Instances();
    this.loading = true;
    try {
      const response: any = await this.backendService.putAnnotationByObjectUUID(this.object_uuid, instances).toPromise();
      this.messageLogService.addIssues(response.issues);
      await this.notificationService.createNotificationWithType(
        TypeNotificationEnum.success,
        'ANNOTATIONS.ANNOTATIONS_FORM.NOTIFICATIONS.SAVE_SUCCESS.TITLE',
        'ANNOTATIONS.ANNOTATIONS_FORM.NOTIFICATIONS.SAVE_SUCCESS.CONTENT',
        'bottomRight'
      );
    } catch (e) {
      await this.notificationService.createNotificationWithType(
        TypeNotificationEnum.error,
        'ANNOTATIONS.ANNOTATIONS_FORM.NOTIFICATIONS.SAVE_FAIL.TITLE',
        'ANNOTATIONS.ANNOTATIONS_FORM.NOTIFICATIONS.SAVE_FAIL.CONTENT',
        'bottomRight'
      );
      if (e.issues) {
        this.messageLogService.addIssues(e.issues);
      }
    }
    this.loading = false;
  }

  // Validators

  private fieldSelectorValidator(control: AbstractControl): ValidationErrors | null {
    let error = false;
    let emptyError = false;
    const field = control.get('fields').value;
    if (!field || field.length < 1) {
      error = true;
      emptyError = true;
    }
    return error ? {
      fieldError: {
        empty: emptyError,
      }
    } : null;
  }

  getMessageFieldSelectorError(): string[] {
    const message = [];
    if (!this.formGroupFieldSelector.errors || !this.formGroupFieldSelector.errors.fieldError) {
      return null;
    }
    if (this.formGroupFieldSelector.errors.fieldError.empty) {
      message.push('ANNOTATIONS.ANNOTATIONS_FORM.FIELD_SELECTOR_MODAL.CONTENT.FIELDS_INPUT.ERROR_EMPTY');
    }
    return message;
  }

  private templatesSelectorValidator(control: AbstractControl): ValidationErrors | null {
    let error = false;
    let emptyError = false;
    const templates = control.get('templates').value;
    if (!templates || templates.length < 1) {
      error = true;
      emptyError = true;
    }
    return error ? {
      templatesError: {
        empty: emptyError,
      }
    } : null;
  }

  getMessageTemplateSelectorError(): string[] {
    const message = [];
    if (!this.formGroupTemplateSelector.errors || !this.formGroupTemplateSelector.errors.templatesError) {
      return null;
    }
    if (this.formGroupTemplateSelector.errors.templatesError.empty) {
      message.push('ANNOTATIONS.ANNOTATIONS_FORM.TEMPLATE_SELECTOR_MODAL.CONTENT.TEMPLATES_INPUT.ERROR_EMPTY');
    }
    return message;
  }
}

