import {Component, EventEmitter, Input, OnInit, Output, ViewEncapsulation} from '@angular/core';
import {
  AbstractControl,
  FormsModule,
  ReactiveFormsModule,
  UntypedFormBuilder,
  UntypedFormGroup,
  ValidationErrors
} from "@angular/forms";
import { GlobalService } from 'ngt-gui/core';
import { CommonModule } from '@angular/common';
import {InfoModalComponent} from "../../../miscellaneous/info-modal/info-modal.component";
import {SharedModule} from "../../../../shared-module/shared.module";
import {NzFormModule} from "ng-zorro-antd/form";
import {NzSelectModule} from "ng-zorro-antd/select";
import {NzTagModule} from "ng-zorro-antd/tag";
import {NzSpinModule} from "ng-zorro-antd/spin";
import {NzModalModule} from "ng-zorro-antd/modal";
import {NzButtonModule} from "ng-zorro-antd/button";
import {NzInputModule} from "ng-zorro-antd/input";
import { NzCheckboxModule } from 'ng-zorro-antd/checkbox';
@Component({
    selector: 'app-geoproperty-edit-modal',
    imports: [
        CommonModule,
        SharedModule,
        FormsModule,
        ReactiveFormsModule,
        NzFormModule,
        NzSelectModule,
        NzTagModule,
        NzSpinModule,
        NzModalModule,
        NzButtonModule,
        InfoModalComponent,
        NzInputModule,
        NzCheckboxModule,
    ],
    templateUrl: './geoproperty-edit-modal.component.html',
    styleUrls: ['./geoproperty-edit-modal.component.sass']
})
export class GeopropertyEditModalComponent implements OnInit {

  @Input() isVisible = false;
  @Output() isVisibleChange = new EventEmitter<boolean>();
  @Output() acceptEmitter = new EventEmitter<any>();
  isVisibleModalError = false;
  formGroup: UntypedFormGroup;
  loading = false;
  name: string;

  constructor(
    private readonly fb: UntypedFormBuilder,
    private readonly globalVariablesServices: GlobalService,
  ) {
  }

  ngOnInit(): void {
    this.initFormGroup();
    this.resetFormGroup();
  }

  private initFormGroup(): void {
    this.formGroup = this.fb.group({
      data_type: [null],
      cat_type: [null],
      categories: [null],
      min: [null],
      max: [null],
      col_type: [null],
      nature: [null],
      unit: [null],
      representable: [null],
      autodetect_categories: [null],
    }, {
      validators: [
        // this.categoriesValidator.bind(this),
        this.minValidator.bind(this),
        this.maxValidator.bind(this),
      ],
    });
    this.formGroup.get('data_type').valueChanges.subscribe((event) => {
      this.formGroup.get('categories').setValue([]);
      this.formGroup.get('cat_type').setValue('string');
      this.formGroup.get('max').setValue('');
      this.formGroup.get('min').setValue('');
      this.formGroup.get('autodetect_categories').setValue(false);
    });
  }

  resetFormGroup(): void {
    this.formGroup.get('data_type').setValue(null);
    this.formGroup.get('cat_type').setValue('string');
    this.formGroup.get('categories').setValue([]);
    this.formGroup.get('col_type').setValue(null);
    this.formGroup.get('nature').setValue('');
    this.formGroup.get('unit').setValue('');
    this.formGroup.get('representable').setValue(false);
    this.formGroup.get('max').setValue('');
    this.formGroup.get('min').setValue('');
    this.formGroup.get('autodetect_categories').setValue(false);
  }

  closeModal(): void {
    this.resetFormGroup();
    this.isVisible = false;
    this.isVisibleChange.emit(this.isVisible);
  }

  addCategoryByInput(event: KeyboardEvent): void {
    const element = event.target as HTMLInputElement;
    const newValue = element.value;
    if (newValue && newValue !== '') {
      element.value = '';
      const oldValue = this.formGroup.get('categories').value;
      this.formGroup.get('categories').setValue([
        ...oldValue,
        newValue
      ]);
    }
  }

  removeCategoryByTag(index: number): void {
    const control = this.formGroup.get('categories');
    const auxArray = [...control.value];
    auxArray.splice(index, 1);
    control.setValue(auxArray);
  }

  changeValuesByProperties(property): void {
    if (property.data_type) {
      this.formGroup.get('data_type').setValue(property.data_type);
    }
    if (property.cat_type) {
      this.formGroup.get('cat_type').setValue(property.cat_type);
    }
    if (property.categories) {
      this.formGroup.get('categories').setValue(property.categories);
    }
    if (property.min) {
      this.formGroup.get('min').setValue(`${property.min}`);
    }
    if (property.max) {
      this.formGroup.get('max').setValue(`${property.max}`);
    }
    if (property.col_type) {
      this.formGroup.get('col_type').setValue(property.col_type);
    }
    if (property.categories) {
      this.formGroup.get('categories').setValue(property.categories);
    }
    if (property.unit) {
      this.formGroup.get('unit').setValue(property.unit);
    }
    if (property.nature) {
      this.formGroup.get('nature').setValue(property.nature);
    }
    if (property.representable) {
      this.formGroup.get('representable').setValue(property.representable);
    }
    if (property.autodetect_categories) {
      this.formGroup.get('autodetect_categories').setValue(property.autodetect_categories);
    }
  }

  acceptModal(): void {
    if (!this.formGroup.valid) {
      return;
    }
    const value: any = {
      data_type: this.formGroup.get('data_type').value,
      col_type: this.formGroup.get('col_type').value,
      nature: this.formGroup.get('nature').value.trim() === '' ? null : this.formGroup.get('nature').value.trim(),
      unit: this.formGroup.get('unit').value.trim() === '' ? null : this.formGroup.get('unit').value.trim(),
      representable: this.formGroup.get('representable').value,
    };
    if (value.data_type === 'numeric' || value.data_type === 'int') {
      const max = this.formGroup.get('max').value;
      const min = this.formGroup.get('min').value;
      if (max && max.trim() !== '') {
        value.max = Number(max);
      } else {
        value.max = null;
      }
      if (min && min.trim() !== '') {
        value.min = Number(min);
      } else {
        value.min = null;
      }
    }
    if (value.data_type === 'category') {
      value.cat_type = this.formGroup.get('cat_type').value;
      // if (this.formGroup.get('autodetect_categories').value) {
      //   value.autodetect_categories = true;
      // } else {
      //   value.categories = this.formGroup.get('categories').value;
      // }
      value.autodetect_categories = true;
    }
    this.acceptEmitter.emit(value);
  }

  // Validators
  private categoriesValidator(control: AbstractControl): ValidationErrors | null {
    const errors: string[] = [];
    if (control.get('data_type').value !== 'category') {
      return null;
    }
    const categories = control.get('categories').value;
    if (!control.get('autodetect_categories').value && (!categories || categories.length < 1)) {
      errors.push('GEOGRAPHICAL_DATA.LAYERS.PROPERTY_EDIT_MODAL.INPUTS.CATEGORIES.EMPTY_ERROR');
    }
    return errors.length > 0 ? {
      categoriesError: errors
    } : null;
  }

  private minValidator(control: AbstractControl): ValidationErrors | null {
    const errors: string[] = [];
    const value: string = control.get('min').value;
    const compareWithMaximum = () => {
      const maxValue: string = control.get('max').value.trim();
      if (maxValue !== '') {
        const numericMaxValue = parseFloat(maxValue);
        if (this.globalVariablesServices.isNumber(numericMaxValue) && numericMaxValue < numberValue) {
          errors.push('GEOGRAPHICAL_DATA.LAYERS.PROPERTY_EDIT_MODAL.INPUTS.MIN.MIN_VALUE_GREATER_ERROR');
        }
      }
    };
    if (control.get('data_type').value !== 'int' && control.get('data_type').value !== 'numeric') {
      return null;
    }
    if (!value || value === '') {
      return null;
    }
    const numberValue = parseFloat(value.trim());
    if (control.get('data_type').value === 'int') {
      if (!this.globalVariablesServices.isInt(numberValue)) {
        errors.push('GEOGRAPHICAL_DATA.LAYERS.PROPERTY_EDIT_MODAL.INPUTS.MAX.BAD_FORMAT_ERROR');
      } else {
        compareWithMaximum();
      }
    }
    if (control.get('data_type').value === 'numeric') {
      if (!this.globalVariablesServices.isNumber(numberValue)) {
        errors.push('GEOGRAPHICAL_DATA.LAYERS.PROPERTY_EDIT_MODAL.INPUTS.MAX.BAD_FORMAT_ERROR');
      } else {
        compareWithMaximum();
      }
    }
    return errors.length > 0 ? {
      minError: errors
    } : null;
  }

  private maxValidator(control: AbstractControl): ValidationErrors | null {
    const errors: string[] = [];
    const value: string = control.get('max').value;
    const compareWithMinimum = () => {
      const minValue: string = control.get('min').value.trim();
      if (minValue !== '') {
        const numericMinValue = parseFloat(minValue);
        if (this.globalVariablesServices.isNumber(numericMinValue) && numericMinValue > numberValue) {
          errors.push('GEOGRAPHICAL_DATA.LAYERS.PROPERTY_EDIT_MODAL.INPUTS.MAX.MAX_VALUE_LESS_ERROR');
        }
      }
    };
    if (control.get('data_type').value !== 'int' && control.get('data_type').value !== 'numeric') {
      return null;
    }
    if (!value || value === '') {
      return null;
    }
    const numberValue = parseFloat(value.trim());
    if (control.get('data_type').value === 'int') {
      if (!this.globalVariablesServices.isInt(numberValue)) {
        errors.push('GEOGRAPHICAL_DATA.LAYERS.PROPERTY_EDIT_MODAL.INPUTS.MAX.BAD_FORMAT_ERROR');
      } else {
        compareWithMinimum();
      }
    }
    if (control.get('data_type').value === 'numeric') {
      if (!this.globalVariablesServices.isNumber(numberValue)) {
        errors.push('GEOGRAPHICAL_DATA.LAYERS.PROPERTY_EDIT_MODAL.INPUTS.MAX.BAD_FORMAT_ERROR');
      } else {
        compareWithMinimum();
      }
    }
    return errors.length > 0 ? {
      maxError: errors
    } : null;
  }

}
