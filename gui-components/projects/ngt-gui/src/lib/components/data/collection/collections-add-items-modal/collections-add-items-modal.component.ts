import { Component, OnInit } from '@angular/core';
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
import {SharedModule} from "src/app/shared-module/shared.module";
import {NzButtonModule} from "ng-zorro-antd/button";
import {NzSelectModule} from "ng-zorro-antd/select";
import {NzFormModule} from "ng-zorro-antd/form";
import {NzSpinModule} from "ng-zorro-antd/spin";
import {NzModalModule} from "ng-zorro-antd/modal";

@Component({
    selector: 'app-collections-add-items-modal',
    imports: [
        CommonModule,
        SharedModule,
        FormsModule,
        ReactiveFormsModule,
        NzSpinModule,
        NzModalModule,
        NzButtonModule,
        NzSelectModule,
        NzFormModule,
    ],
    templateUrl: './collections-add-items-modal.component.html',
    styleUrls: ['./collections-add-items-modal.component.sass']
})
export class CollectionsAddItemsModalComponent implements OnInit {

  loading = false;
  showModal = false;
  formGroup: UntypedFormGroup;
  collectionsOptions: any[] = [];
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
      collections: [],
    }, {
      validators: [
        this.collectionsValidator
      ]
    });
  }


  restart() {
    this.formGroup.get('collections').setValue([]);
  }

  async openModal(entitiesId): Promise<void> {
    this.entitiesId = entitiesId;
    this.restart();
    this.loading = true;
    this.showModal = true;
    try {
      await this.loadCollectionsOptions();
    } catch (e) {
      this.modalInfoService.showModalInfoDefaultError(e);
      this.cancelModal();
    }
    this.loading = false;
  }

  async loadCollectionsOptions(): Promise<void> {
    const response: any = await this.backendService.getCollections().toPromise();
    this.collectionsOptions = response.content.map(element => {
      return { label: element.name, value: element.id };
    });
  }

  async cancelModal(): Promise<void> {
    this.showModal = false;
    this.loading = false;
    this.restart();
    this.collectionsOptions = [];
    this.entitiesId = [];
  }

  async clickAcceptButton(): Promise<void> {
    const collections = this.formGroup.get('collections').value;
    const observersRelationship = {};
    for (let entityId of this.entitiesId) {
      for (let collection of collections) {
        observersRelationship[`${entityId}${collection}`] = this.backendService.postCollectionItem({"collection_id": collection, "functional_object_uuid": entityId});
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
  private collectionsValidator(control: AbstractControl): ValidationErrors | null {
    let error = false;
    let emptyError = false;
    const value = control.get('collections').value;
    if (!value || value.length === 0) {
      error = true;
      emptyError = true;
    }
    return error ? {
      collectionsError: {
        empty: emptyError,
      }
    } : null;
  }

  getMessageCollectionError(): string[] {
    const message = [];
    if (!this.formGroup.errors || !this.formGroup.errors.collectionsError) {
      return null;
    }
    if (this.formGroup.errors.collectionsError.empty) {
      message.push('MOLECULAR_DATA.COLLECTIONS.ADD_ITEMS_MODAL.INPUTS.COLLECTIONS.ERROR_EMPTY');
    }
    return message;
  }

}

