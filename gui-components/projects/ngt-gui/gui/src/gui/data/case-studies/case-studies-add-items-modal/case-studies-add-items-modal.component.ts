import {Component, OnInit} from '@angular/core';
import {
  AbstractControl,
  FormsModule,
  ReactiveFormsModule,
  UntypedFormBuilder,
  UntypedFormGroup,
  ValidationErrors
} from "@angular/forms";
import {ModalInfoService} from "src/app/services/modal-info.service";
import {BackendService} from 'ngt-gui/core';import {forkJoin} from "rxjs";
import { CommonModule } from '@angular/common';
import {SharedModule} from "../../../../shared-module/shared.module";
import {NzSelectModule} from "ng-zorro-antd/select";
import {NzInputModule} from "ng-zorro-antd/input";
import {NzFormModule} from "ng-zorro-antd/form";
import {NzSpinModule} from "ng-zorro-antd/spin";
import {NzModalModule} from "ng-zorro-antd/modal";
import {NzButtonModule} from "ng-zorro-antd/button";

@Component({
    selector: 'app-case-studies-add-items-modal',
    imports: [
        CommonModule,
        SharedModule,
        FormsModule,
        ReactiveFormsModule,
        NzSelectModule,
        NzInputModule,
        NzFormModule,
        NzSpinModule,
        NzModalModule,
        NzButtonModule,
    ],
    templateUrl: './case-studies-add-items-modal.component.html',
    styleUrls: ['./case-studies-add-items-modal.component.sass']
})
export class CaseStudiesAddItemsModalComponent implements OnInit {

  loading = false;
  showModal = false;
  formGroup: UntypedFormGroup;
  casesStudiesOptions: any[] = [];
  entitiesId = [];

  constructor(
    private readonly fb: UntypedFormBuilder,
    private readonly modalInfoService: ModalInfoService,
    private readonly backendService: BackendService,
  ) {
  }

  ngOnInit(): void {
    this.initFormGroup();
  }

  initFormGroup() {
    this.formGroup = this.fb.group({
      casesStudies: [],
    }, {
      validators: [
        this.caseStudiesValidators
      ]
    });
  }


  restart() {
    this.formGroup.get('casesStudies').setValue([]);
  }

  async openModal(entitiesId): Promise<void> {
    this.entitiesId = entitiesId;
    this.restart();
    this.loading = true;
    this.showModal = true;
    try {
      await this.loadCasesStudiesOptions();
    } catch (e) {
      this.modalInfoService.showModalInfoDefaultError(e);
      this.cancelModal();
    }
    this.loading = false;
  }

  async loadCasesStudiesOptions(): Promise<void> {
    const response: any = await this.backendService.getCaseStudies().toPromise();
    this.casesStudiesOptions = response.content.map(element => {
      return { label: element.name, value: element.id };
    });
  }

  async cancelModal(): Promise<void> {
    this.showModal = false;
    this.loading = false;
    this.restart();
    this.casesStudiesOptions = [];
    this.entitiesId = [];
  }

  async clickAcceptButton(): Promise<void> {
    const casesStudies = this.formGroup.get('casesStudies').value;
    const observersRelationship = {};
    for (let entityId of this.entitiesId) {
      for (let caseStudy of casesStudies) {
        observersRelationship[`${entityId}${caseStudy}`] = this.backendService.postCaseStudiesItem({"case_study_id": caseStudy, "functional_object_id": entityId});
      }
    }
    try {
      await forkJoin(observersRelationship).toPromise();
    } catch (e) {
      this.modalInfoService.showModalInfoDefaultError(e);
    }
    this.showModal = false;
    this.loading = false;
  }

  // Name
  private caseStudiesValidators(control: AbstractControl): ValidationErrors | null {
    let error = false;
    let emptyError = false;
    const value = control.get('casesStudies').value;
    if (!value || value.length === 0) {
      error = true;
      emptyError = true;
    }
    return error ? {
      caseStudyError: {
        empty: emptyError,
      }
    } : null;
  }

  getMessageCaseStudiesError(): string[] {
    const message = [];
    if (!this.formGroup.errors || !this.formGroup.errors.caseStudyError) {
      return null;
    }
    if (this.formGroup.errors.caseStudyError.empty) {
      message.push('STUDY_CASES.ADD_ITEMS_MODAL.INPUTS.CASE_STUDIES.ERROR_EMPTY');
    }
    return message;
  }


}

