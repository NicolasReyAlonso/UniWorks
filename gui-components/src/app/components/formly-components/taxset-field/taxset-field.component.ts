import {AfterViewInit, Component, OnInit} from '@angular/core';
import { FieldType } from '@ngx-formly/core';

interface Taxset {
  name: string;
  taxons: any[];
  type: 'outgroup' | 'delete' | 'constraints';
}

interface Contraints {
  key: string;
  taxons: any[][];
  converse: boolean;
  type: 'backbone' | 'monophyly';
}

@Component({
    selector: 'app-taxset-field',
    templateUrl: './taxset-field.component.html',
    styleUrls: ['./taxset-field.component.sass'],
    standalone: false
})
export class TaxsetFieldComponent extends FieldType implements OnInit, AfterViewInit  {

  dataTableConstraints: [Contraints];
  dataTableTaxset: Map<number, Taxset>;

  formControlChangeValue(value: string) {
    this.formControl.setValue(value);
  }

  formControlChangeValidate(validState: boolean) {
    const error = validState ? null : { charsetError: true };
    this.formControl.setErrors(error);
  }

   ngOnInit(): void {
    this.dataTableTaxset = new Map<number, Taxset>();

      this.dataTableConstraints = [{
        key: `monophyletic_groups`,
        taxons: [],
        converse: false,
        type: 'monophyly',
      }];
    }

  ngAfterViewInit() {
    if (this.formControl.value && Object.keys(this.formControl.value).length > 0) {
      for (const [k, v] of Object.entries(this.formControl.value.taxsets)) {
        const tax: Taxset = {
          name: v['name'],
          taxons: v['taxons'],
          type: v['type']
        };
        this.dataTableTaxset.set(+k, tax);
      }
      const constraint = this.formControl.value.constraints[0]
      this.dataTableConstraints[0] = {
        key: constraint['key'],
        taxons: constraint['taxons'],
        converse: constraint['converse'],
        type: constraint['type']
      };
      this.formControl.setValue({
        taxsets: this.dataTableTaxset,
        constraints: this.dataTableConstraints,
      });
    }
  }

}
