import {Component, EventEmitter, OnInit, Output} from '@angular/core';
import {
  AbstractControl,
  FormsModule,
  ReactiveFormsModule,
  UntypedFormBuilder,
  UntypedFormGroup,
  ValidationErrors
} from "@angular/forms";
import {ModalInfoService} from "src/app/services/modal-info.service";
import {BackendService} from 'ngt-gui/core';import { CommonModule } from '@angular/common';
import {NzModalModule} from "ng-zorro-antd/modal";
import {NzSpinModule} from "ng-zorro-antd/spin";
import {NzButtonModule} from "ng-zorro-antd/button";
import {SharedModule} from "../../../../shared-module/shared.module";
import {NzFormModule} from "ng-zorro-antd/form";
import {NzInputModule} from "ng-zorro-antd/input";

@Component({
    selector: 'app-collections-modal-create',
    imports: [
        CommonModule,
        FormsModule,
        ReactiveFormsModule,
        SharedModule,
        NzModalModule,
        NzSpinModule,
        NzButtonModule,
        NzFormModule,
        NzInputModule,
    ],
    templateUrl: './collections-modal-create.component.html',
    styleUrls: ['./collections-modal-create.component.sass']
})
export class CollectionsModalCreateComponent implements OnInit {

  showModal = false;
  loading = false;
  formGroup: UntypedFormGroup;
  @Output() createSuccessEvent = new EventEmitter();

  constructor(
    private readonly fb: UntypedFormBuilder,
    private readonly modalInfoService: ModalInfoService,
    private readonly backendService: BackendService,
  ) { }

  ngOnInit(): void {
    this.initFormGroup();
  }

  initFormGroup() {
    this.formGroup = this.fb.group({
      name: [''],
    }, {
      validators: [
        this.nameValidator,
      ]
    })
  }

  openModal() {
    this.resetForm();
    this.loading = false;
    this.showModal = true;
  }

  resetForm(): void {
    this.formGroup.get('name').setValue('');
  }

  async cancelModal(): Promise<void> {
    this.resetForm();
    this.loading = false;
    this.showModal = false;
  }

  getValue(): any {
    return {
      name: this.formGroup.get('name').value,
    }
  }

  async createCollection(): Promise<void> {
    this.loading = true;
    try {
      const value = this.getValue();
      const response = await this.backendService.postCollection(value).toPromise();
      this.createSuccessEvent.emit();
    } catch (e) {
      this.modalInfoService.showModalInfoDefaultError(e);
    }
    this.cancelModal();
    this.loading = false;
  }

  // Validators

  // Name
  private nameValidator(control: AbstractControl): ValidationErrors | null {
    let error = false;
    let emptyError = false;
    const name = control.get('name').value;
    if (!name || name === '') {
      error = true;
      emptyError = true;
    }
    return error ? {
      nameError: {
        empty: emptyError,
      }
    } : null;
  }

  getMessageNameError(): string[] {
    const message = [];
    if (!this.formGroup.errors || !this.formGroup.errors.nameError) {
      return null;
    }
    if (this.formGroup.errors.nameError.empty) {
      message.push('ANNOTATIONS.FIELDS.CREATE_MODAL.NAME_INPUT.ERROR_EMPTY');
    }
    return message;
  }

}
