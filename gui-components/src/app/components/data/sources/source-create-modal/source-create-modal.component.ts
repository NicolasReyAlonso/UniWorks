import {Component, EventEmitter, Input, OnInit, Output} from '@angular/core';
import {
  AbstractControl,
  FormsModule,
  ReactiveFormsModule,
  UntypedFormBuilder,
  UntypedFormGroup,
  ValidationErrors
} from "@angular/forms";
import {ButtonsInfoModal, InfoModalComponent} from "../../../miscellaneous/info-modal/info-modal.component";
import {BackendService} from 'ngt-gui/core';import {MessageLogService} from "../../../../services/message-log.service";
import { CommonModule } from '@angular/common';
import {SharedModule} from "../../../../shared-module/shared.module";
import {NzButtonModule} from "ng-zorro-antd/button";
import {NzInputModule} from "ng-zorro-antd/input";
import {NzFormModule} from "ng-zorro-antd/form";
import {NzSpinModule} from "ng-zorro-antd/spin";
import {NzModalModule} from "ng-zorro-antd/modal";

@Component({
    selector: 'app-source-create-modal',
    imports: [
        CommonModule,
        InfoModalComponent,
        SharedModule,
        NzButtonModule,
        NzInputModule,
        NzFormModule,
        FormsModule,
        ReactiveFormsModule,
        NzSpinModule,
        NzModalModule,
    ],
    templateUrl: './source-create-modal.component.html',
    styleUrls: ['./source-create-modal.component.sass']
})
export class SourceCreateModalComponent implements OnInit {

  @Input() isVisible = false;
  @Output() isVisibleChange = new EventEmitter<boolean>();
  @Output('createSuscessfully') createSuscessfullyEventEmmiter = new EventEmitter<null>();

  formGroup: UntypedFormGroup;
  isVisibleInfoModal = false;
  buttonsInfoModal: ButtonsInfoModal[] = [
    {
      text: "METADATA.SOURCES.CREATE_MODAL.ERROR_CREATE_THEME.OK_BUTTON",
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
      name: ['']
    }, {
      validators: [
        this.nameValidator.bind(this),
      ],
    });
    console.log(this.formGroup.valid);
  }

  changeIsVisible(value: boolean) {
    this.isVisible = value;
    this.isVisibleChange.emit(this.isVisible);
  }

  resetForm(): void {
    this.formGroup.get('name').setValue('');
  }

  closeModal(): void {
    this.changeIsVisible(false);
    this.resetForm();
  }

  async onCreateTheme(): Promise<void> {
    if (!this.formGroup.valid) {
      return;
    }
    const value = {
      name: this.formGroup.get('name').value,
      hierarchy_id: 2,
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
      message.push('METADATA.SOURCES.CREATE_MODAL.NAME_INPUT.ERROR_EMPTY');
    }
    return message;
  }

}
