import {Component, EventEmitter, Input, OnInit, Output} from '@angular/core';
import {
  AbstractControl,
  AbstractControlOptions, FormsModule,
  ReactiveFormsModule,
  UntypedFormBuilder,
  UntypedFormGroup,
  ValidationErrors
} from "@angular/forms";
import {ButtonsInfoModal, InfoModalComponent} from "../../../miscellaneous/info-modal/info-modal.component";
import {BackendService} from 'ngt-gui/core';import {MessageLogService} from "../../../../services/message-log.service";
import proj4 from 'proj4';
import { CommonModule } from '@angular/common';
import {NzInputModule} from "ng-zorro-antd/input";
import {NzButtonModule} from "ng-zorro-antd/button";
import {SharedModule} from "../../../../shared-module/shared.module";
import {NzFormModule} from "ng-zorro-antd/form";
import {NzSpinModule} from "ng-zorro-antd/spin";
import {NzModalModule} from "ng-zorro-antd/modal";
@Component({
    selector: 'app-crs-create-modal',
    imports: [
        CommonModule,
        InfoModalComponent,
        NzInputModule,
        NzButtonModule,
        SharedModule,
        NzFormModule,
        ReactiveFormsModule,
        FormsModule,
        NzSpinModule,
        NzModalModule,
    ],
    templateUrl: './crs-create-modal.component.html',
    styleUrls: ['./crs-create-modal.component.sass']
})
export class CrsCreateModalComponent implements OnInit {

  @Input() isVisible = false;
  @Output() isVisibleChange = new EventEmitter<boolean>();
  @Output('createSuscessfully') createSuscessfullyEventEmmiter = new EventEmitter<null>();

  formGroup: UntypedFormGroup;
  isVisibleInfoModal = false;
  buttonsInfoModal: ButtonsInfoModal[] = [
    {
      text: "METADATA.CRS.CREATE_MODAL.ERROR_CREATE_THEME.OK_BUTTON",
      func: this.okButtonInfoModal.bind(this),
      options: {
        isDanger: false,
      }
    }
  ];
  loading = false;

  constructor(
    private readonly fb: UntypedFormBuilder,
    private readonly backendService: BackendService,
    private readonly messageLogService: MessageLogService,
  ) { }

  ngOnInit(): void {
    this.formGroup = this.fb.group({
      name: [''],
      code: [''],
      proj4: [''],
    }, {
      validators: [
        this.nameValidator.bind(this),
        this.codeValidator.bind(this),
        this.proj4Validator.bind(this)
      ],
    } as AbstractControlOptions);
  }

  changeIsVisible(value: boolean) {
    this.isVisible = value;
    this.isVisibleChange.emit(this.isVisible);
  }

  resetForm(): void {
    this.formGroup.get('name').setValue('');
    this.formGroup.get('code').setValue('');
    this.formGroup.get('proj4').setValue('');
  }

  closeModal(): void {
    this.changeIsVisible(false);
    this.resetForm();
  }

  async onCreateCrs(): Promise<void> {
    if (!this.formGroup.valid) {
      return;
    }
    const value = {
      name: this.formGroup.get('name').value,
      hierarchy_id: 3,
      attributes: {
        code: this.formGroup.get('code').value,
        proj4: this.formGroup.get('proj4').value
      }
    };

    try {
      const response: any = await this.backendService.postHierarchyNodes(value).toPromise();
      if (response.issues) {
        this.messageLogService.addIssues(response.issues);
      }
      this.createSuscessfullyEventEmmiter.emit();
      this.resetForm();
    } catch (e) {
      if (e.issues) {
        this.messageLogService.addIssues(e.issues);
      }
      this.isVisibleInfoModal = true;
    }

  }

  okButtonInfoModal() {
    this.isVisibleInfoModal = false;
  }

  // Validators
  private nameValidator(control: AbstractControl): ValidationErrors | null {
    let error = false;
    let emptyError = false;
    const name = control.get('name').value;
    if (!name || name.trim() === '') {
      error = true;
      emptyError = true;
    }
    return error ? {
      nameError: {
        empty: emptyError,
      }
    } : null;
  }

  getMessageNameError(): string[] | null {
    const message = [];
    if (!this.formGroup.errors || !this.formGroup.errors.nameError) {
      return null;
    }
    if (this.formGroup.errors.nameError.empty) {
      message.push('METADATA.CRS.CREATE_MODAL.NAME_INPUT.ERROR_EMPTY');
    }
    return message;
  }

  private codeValidator(control: AbstractControl): ValidationErrors | null {
    let error = false;
    let emptyError = false;
    const code = control.get('code').value;
    if (!code || code.trim() === '') {
      error = true;
      emptyError = true;
    }
    return error ? {
      codeError: {
        empty: emptyError,
      }
    } : null;
  }

  getMessageCodeError(): string[] | null {
    const message = [];
    if (!this.formGroup.errors || !this.formGroup.errors.codeError) {
      return null;
    }
    if (this.formGroup.errors.codeError.empty) {
      message.push('METADATA.CRS.CREATE_MODAL.CODE_INPUT.ERROR_EMPTY');
    }
    return message;
  }

  proj4ValidatorFormat(proj4Value): boolean {
    try {
      proj4.defs('ESPG:1232', proj4Value);
      return true;
    } catch (e) {
      return false;
    }
  }

  private proj4Validator(control: AbstractControl): ValidationErrors | null {
    let error = false;
    let errorCode: any = {
      proj4Error: {
      }
    }
    const proj4Value = control.get('proj4').value;
    if (!proj4Value || proj4Value.trim() === '') {
      error = true;
      errorCode.proj4Error.empty = true;
    } else if (!this.proj4ValidatorFormat(proj4Value)) {
      error = true;
      errorCode.proj4Error.format = true;
    }
    return error ? errorCode : null;
  }

  getMessageProj4Error(): string[] | null {
    const message = [];
    if (!this.formGroup.errors || !this.formGroup.errors.proj4Error) {
      return null;
    }
    if (this.formGroup.errors.proj4Error.empty) {
      message.push('METADATA.CRS.CREATE_MODAL.PROJ4_INPUT.ERROR_EMPTY');
    }
    if (this.formGroup.errors.proj4Error.format) {
      message.push('METADATA.CRS.CREATE_MODAL.PROJ4_INPUT.ERROR_FORMAT');
    }
    return message;
  }

}

