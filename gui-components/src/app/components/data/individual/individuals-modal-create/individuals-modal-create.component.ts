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
import {SelectLazyLoadingComponent} from "../../../miscellaneous/select-lazy-loading/select-lazy-loading.component";

@Component({
    selector: 'app-individuals-modal-create',
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
        SelectLazyLoadingComponent,
    ],
    templateUrl: './individuals-modal-create.component.html'
})
export class IndividualsModalCreateComponent implements OnInit {

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
      uniquename: [''],
      name: [''],
      description: [''],
      organism_id: [undefined],
    }, {
      validators: [
        this.uniquenameValidator,
      ]
    })
  }

  openModal() {
    this.resetForm();
    this.loading = false;
    this.showModal = true;
  }

  resetForm(): void {
    this.formGroup.get('uniquename').setValue('');
    this.formGroup.get('name').setValue('');
    this.formGroup.get('description').setValue('');
    this.formGroup.get('organism_id').setValue(undefined);
  }

  async cancelModal(): Promise<void> {
    this.resetForm();
    this.loading = false;
    this.showModal = false;
  }

  getValue(): any {
    return {
      uniquename: this.formGroup.get('uniquename').value,
      name: this.formGroup.get('name').value,
      description: this.formGroup.get('description').value,
      organism_id: this.formGroup.get('organism_id').value,
    }
  }

  async createIndividual(): Promise<void> {
    this.loading = true;
    try {
      const value = this.getValue();
      const response = await this.backendService.postFromChado('individuals', value).toPromise();
      this.createSuccessEvent.emit();
    } catch (e) {
      this.modalInfoService.showModalInfoDefaultError(e);
    }
    this.cancelModal();
    this.loading = false;
  }

  // Validators

  // Uniquename
  private uniquenameValidator(control: AbstractControl): ValidationErrors | null {
    let error = false;
    let emptyError = false;
    const uniquename = control.get('uniquename').value;
    if (!uniquename || uniquename === '') {
      error = true;
      emptyError = true;
    }
    return error ? {
      uniquenameError: {
        empty: emptyError,
      }
    } : null;
  }

  getMessageUniquenameError(): string[] {
    const message = [];
    if (!this.formGroup.errors || !this.formGroup.errors.uniquenameError) {
      return null;
    }
    if (this.formGroup.errors.uniquenameError.empty) {
      message.push('ANNOTATIONS.FIELDS.CREATE_MODAL.NAME_INPUT.ERROR_EMPTY');
    }
    return message;
  }

  selectDynamicValueChange(event, field) {
    this.formGroup.get(field).setValue(event);
  }

}
