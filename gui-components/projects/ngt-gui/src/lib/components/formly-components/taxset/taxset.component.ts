import { CdkDragDrop, moveItemInArray } from '@angular/cdk/drag-drop';
import { Component, EventEmitter, Input, OnDestroy, OnInit, Output} from '@angular/core';
import {CommonModule} from "@angular/common";
import {SharedModule} from "../../../shared-module/shared.module";
import {NzListModule} from "ng-zorro-antd/list";
import {NzSelectModule} from "ng-zorro-antd/select";
import {FormsModule, ReactiveFormsModule} from "@angular/forms";
import {NzTableModule} from "ng-zorro-antd/table";
import {NzIconModule} from "ng-zorro-antd/icon";
import {NzCardModule} from "ng-zorro-antd/card";
import {NzButtonModule} from "ng-zorro-antd/button";

interface Taxset {
  name: string;
  taxons: any[];
  type: 'outgroup' | 'delete' | 'constraints';
}

interface Contraints {
  key: string;
  taxons: any[][];
  converse: boolean;
  type: 'monophyly' | 'backbone' ;
}

interface StringResult {
  sets: string;
  paup: string;
  enforce_converse: string;
}

@Component({
    imports: [
        CommonModule,
        SharedModule,
        FormsModule,
        ReactiveFormsModule,
        NzListModule,
        NzSelectModule,
        NzTableModule,
        NzIconModule,
        NzCardModule,
        NzButtonModule
    ],
    selector: 'taxset-component',
    templateUrl: './taxset.component.html',
    styleUrls: ['./taxset.component.sass']
})
export class TaxsetComponent implements OnDestroy {

  valueValidateResult = false;

  // Taxset
  @Input()
  dataTableTaxset: Map<number, Taxset>;
  nextIdTaxset = 1;
  idEditTaxset = null;

  // Constraints
  @Input()
  dataTableConstraints: [Contraints];
  nextIdConstraints = 1;
  valueEditConstraints = false;


  @Input('taxons') taxons: {label: string, value: string}[];

  @Output() ValueChangeEvent = new EventEmitter<{taxsets: any, constraints: any}>();
  @Output() ValidateChangeEvent = new EventEmitter<boolean>();

  constructor() { }

  ngOnDestroy(): void {
    this.ValueChangeEvent.unsubscribe();
  }

  private initValidateEvent(): void {
    this.ValueChangeEvent.subscribe(event => {

      if (this.validateResult()) {
        if (!this.valueValidateResult) {
          this.ValidateChangeEvent.emit(true);
          this.valueValidateResult = true;
        }
      } else {
        if (this.valueValidateResult) {
          this.ValidateChangeEvent.emit(false);
          this.valueValidateResult = false;
        }
      }

    });
  }

  private validateResult(): boolean {
    for (const key of this.dataTableTaxset.keys()) {
      if (!this.validateTaxset(key)) {
        return false;
      }
    }
    if (!this.validateContraints()) {
      return false;
    }
    return true;
  }

  activeValueChangeEvent() {
    const taxsets = {};
    for (const key of this.dataTableTaxset.keys()) {//change from Map to {}
      taxsets[key] = this.dataTableTaxset.get(key);
    }
    this.ValueChangeEvent.emit({taxsets: taxsets, constraints: this.dataTableConstraints});
  }

  private convert2StringResult(): StringResult {
    const outputString: StringResult = {
      sets: "",
      paup: "",
      enforce_converse: ""
    };
    this.convert2StringSets(outputString);
    this.convert2StringPaup(outputString);
    return outputString;
  }

  private convert2StringSets(outputString: StringResult): void {
    for (const key of this.dataTableTaxset.keys()) {
      const taxset = this.dataTableTaxset.get(key);
      outputString.sets += `\ttaxset ${taxset.name} =`;
      for (const taxon of taxset.taxons) {
        outputString.sets += ` ${taxon}`;
      }
      outputString.sets += ';\n';
    }
  }

  private convert2StringPaup(outputString: StringResult): void {
    const indexTaxsetsDelete = [];
    const indexTaxsetsOutgroup = [];

    for (const key of this.dataTableTaxset.keys()) {
      const taxset = this.dataTableTaxset.get(key);
      switch (taxset.type) {
        case 'delete':
          indexTaxsetsDelete.push(key);
          break;
        case 'outgroup':
          indexTaxsetsOutgroup.push(key);
          break;
      }
    }

    if (indexTaxsetsDelete.length > 0) {
      outputString.paup += '\tdelete';
      for (const index of indexTaxsetsDelete) {
        const taxset = this.dataTableTaxset.get(index);
        outputString.paup += ` ${taxset.name}`;
      }
      outputString.paup += ';\n';
    }

    if (indexTaxsetsOutgroup.length > 0) {
      outputString.paup += '\toutgroup';
      for (const index of indexTaxsetsOutgroup) {
        const taxset = this.dataTableTaxset.get(index);
        outputString.paup += ` ${taxset.name}`;
      }
      outputString.paup += ';\n';
    }

    const constraint = this.dataTableConstraints[0];
    if (constraint.taxons.length > 0) {
      outputString.paup += `\tconstraints ${constraint.key} ${constraint.type == "monophyly" ? "" : constraint.type} = `;
      this.convert2StringTaxonsGroupsContraint(outputString);
      outputString.enforce_converse += "enforce=yes "
      outputString.enforce_converse += "converse="
      outputString.enforce_converse += this.dataTableConstraints[0].converse ? "yes" : "no";
    }
  }

  private convert2StringTaxonsGroupsContraint(outputString: StringResult) {
    const constraint = this.dataTableConstraints[0];
    outputString.paup += "(";
    for (let i = 0; i < constraint.taxons.length; i++) {
      outputString.paup += "(";
    }
    let firstIteration = true;
    for (const taxonGroup of constraint.taxons.reverse()) {
      if (!firstIteration) {
        outputString.paup += '), ';
      } else {
        firstIteration = false;
      }
      let firstIterationInGroup = true;
      for (const taxon of taxonGroup) {
        if (!firstIterationInGroup) {
          outputString.paup += ', ';
        } else {
          firstIterationInGroup = false;
        }
        outputString.paup += taxon;
        /* No numbers in contraints groups or taxsets
        switch (typeof taxon) {
          case 'string':
            outputString.paup += taxon;
            break;
          case 'number':
            outputString.paup += this.dataTableTaxset.get(taxon).name;
            break;
        }
         */
      }
    }
    outputString.paup += "));\n";
  }

  // Functions Taxset
  getArrayDataTableTaxset() {
    return Array.from(this.dataTableTaxset);
  }

  getTaxonOptionTaxset(id: number): { label: string, value: string }[] {
    const taxonOptions = [...this.taxons];
    for (const key of this.dataTableTaxset.keys()) {
      if (id === key) {
        continue;
      }
      const taxset = this.dataTableTaxset.get(key);
      for (const taxon of taxset.taxons) {
        let index = -1;
        taxonOptions.find((element, i) => {
          if (taxon.value === element.value) {
            index = i;
            return true;
          }
          return false;
        });
        if (index > -1) {
          taxonOptions.splice(index, 1);
        }
      }
    }
    return taxonOptions;
  }

  addTaxset(stateEdit: boolean): void {
    this.dataTableTaxset.set(this.nextIdTaxset, {
      name: this.nextIdTaxset > 1 ? `key_${this.nextIdTaxset}` : 'myOutgroup',
      taxons: [],
      type: this.nextIdTaxset > 1 ? 'delete' : 'outgroup',
    });
    if (stateEdit) {
      this.idEditTaxset = this.nextIdTaxset;
    }
    this.nextIdTaxset++;
    this.activeValueChangeEvent();
  }

  onEditTaxset(id: number): void {
    if (this.valueEditConstraints || this.idEditTaxset) {
      return;
    }
    this.idEditTaxset = id;
  }

  onEndEditTaxset(): void {
    this.idEditTaxset = null;
  }

  removeTaxset(id: number): void {
    const constraint = this.dataTableConstraints[0];
    for (const taxons of constraint.taxons) {
      for (let i = 0; i < taxons.length; i++) {
        if (id === taxons[i]) {
          taxons.splice(i, 1);
        }
      }
    }
    if (this.idEditTaxset == id) {
      this.idEditTaxset = null;
    }
    this.dataTableTaxset.delete(id);
    this.activeValueChangeEvent();
  }

  getTaxonLabel(taxonValue: string) {
    for (const t of this.taxons) {
      if (taxonValue === t.value) {
        return t.label;
      }
    }
    return '';
  }

  formatTaxonsInfo(id: number) {
    const taxset = this.dataTableTaxset.get(id);
    const taxons = taxset.taxons;
    let formatTaxons = "";
    let firstIteration = true;
    for (const taxon of taxons) {
      if (firstIteration) {
        formatTaxons += this.getTaxonLabel(taxon);
        firstIteration = false;
      } else {
        formatTaxons += `, ${this.getTaxonLabel(taxon)}`;
      }
    }
    return formatTaxons;
  }

  onChangeTypeTaxset(id: number, type: 'delete' | 'outgroup' /*| 'constraints'*/) {
    const taxset = this.dataTableTaxset.get(id);
    /*if (type != 'constraints') {
      const constraint = this.dataTableConstraints[0];
      for (const taxonGroup of constraint.taxons) {

        const index = taxonGroup.indexOf(id, 0);
        if (index > -1) {
          taxonGroup.splice(index, 1);
        }

      }
    }*/
    if (type === 'outgroup') {
      taxset.name = 'myOutgroup';
    }
  }

  // Validations Taxset
  validateName(id: number): boolean {
    const taxset = this.dataTableTaxset.get(id);
    const name = taxset.name;
    if (!name || name == '') {
      return false;
    }
    if (name.includes(' ')) {
      return false;
    }
    for (const key of this.dataTableTaxset.keys()) {
      if (key == id) {
        continue;
      }
      const taxsetIteration = this.dataTableTaxset.get(key);
      if (name == taxsetIteration.name) {
        return false;
      }
    }
    return true;
  }

  validateTaxons(id: number): boolean {
    const taxset = this.dataTableTaxset.get(id);
    const taxons = taxset.taxons;
    if (taxons.length < 1) {
      return false;
    }
    return true;
  }

  validateType(id: number): boolean {
    const taxset = this.dataTableTaxset.get(id);
    const type = taxset.type;
    if (type == 'outgroup') {
      for (let key of this.dataTableTaxset.keys()) {
        if (key == id) {
          continue;
        }
        const taxsetIterate = this.dataTableTaxset.get(key);
        if (taxsetIterate.type == 'outgroup') {
          return false;
        }
      }
    }
    return true;
  }

  validateTaxset(id: number): boolean {
    if (!this.validateName(id) || !this.validateTaxons(id) || !this.validateType(id)) {
      return false;
    }
    return true;
  }

  // Constraints

  onEditConstraints(): void {
    if (this.idEditTaxset || this.valueEditConstraints) {
      return;
    }
    this.valueEditConstraints = true;
  }

  onEndEditConstraints(): void {
    this.valueEditConstraints = false;
  }

  addTaxonContraints(): void {
    const constraint = this.dataTableConstraints[0];
    constraint.taxons = [...constraint.taxons, []];
    this.activeValueChangeEvent();
  }

  removeTaxonConstraints(indexTaxon: number): void {
    this.dataTableConstraints[0].taxons.splice(indexTaxon, 1);
    this.activeValueChangeEvent();
  }

  dropTaxonsConstraints(event: CdkDragDrop<any>): void {
    if (event.previousIndex == event.currentIndex) {
      return;
    }
    moveItemInArray(this.dataTableConstraints[0].taxons, event.previousIndex, event.currentIndex);
    this.activeValueChangeEvent();
  }

  getInfoTaxonsConstraints(indexTaxon) {
    const constraint = this.dataTableConstraints[0];
    let formatInfo = "";
    let firstIteration = true;
    for (const taxon of constraint.taxons[indexTaxon]) {
      if (!firstIteration) {
        formatInfo += ', ';
      }

      if (typeof taxon === 'string') {
        formatInfo += this.getTaxonLabel(taxon);
      }
      /* No numbers in contraints groups or taxsets
      if (typeof taxon === 'number') {
        formatInfo += this.dataTableTaxset.get(taxon).name;
      }*/

      firstIteration = false;
    }
    return formatInfo;
  }

  // Validate
  validateKeyConstraints(): boolean {
    const constraint = this.dataTableConstraints[0];
    const key = constraint.key;
    if (!key || key == '') {
      return false;
    }
    if (key.includes(' ')) {
      return false;
    }
    return true;
  }

  validateTaxonsConstraints(): boolean {
    const constraint = this.dataTableConstraints[0];
    const taxonsConstraint = constraint.taxons;
    for (let i = 0; i < taxonsConstraint.length; i++) {
      if (!this.validateTaxonGroupConstraints(i)) {
        return false;
      }
    }
    return true;
  }

  validateTaxonGroupConstraints(indexGroup: number): boolean {
    const constraint = this.dataTableConstraints[0];
    const taxonsConstraint = constraint.taxons;
    if (taxonsConstraint[indexGroup].length < 1) {
      return false;
    }
    for (const taxon of taxonsConstraint[indexGroup]) {

      if (typeof taxon === 'string') {
        if (this.checkTaxonExistInConstraints(taxon, indexGroup)) {
          return false;
        }
      }
      /* No numbers in contraints groups or taxsets
      if (typeof taxon === 'number') {
        if (this.checkTaxsetConflictInConstraints(taxon, indexGroup)) {
          return false;
        }
      }*/

    }
    return true;
  }

  private checkTaxonExistInConstraints(taxon: string, excludeGroup: number) {
    const constraint = this.dataTableConstraints[0];
    const taxonsConstraint = constraint.taxons;
    for (let i = 0; i < taxonsConstraint.length; i++) {
      for (const taxonIteration of taxonsConstraint[i]) {
        if (typeof taxonIteration === 'string') {
          if (excludeGroup == i) {
            continue;
          }
          if (taxonIteration == taxon) {
            return true;
          }
        }

        /* No numbers in contraints groups or taxsets
        if (typeof taxonIteration === 'number') {
          const taxset = this.dataTableTaxset.get(taxonIteration);
          for (const taxonIterationTaxset of taxset.taxons) {
            if (taxonIterationTaxset == taxon) {
              return true;
            }
          }
        }*/
      }
    }
    return false;
  }

  private checkTaxsetConflictInConstraints(taxsetId: number, excludeGroup: number) {
    const constraint = this.dataTableConstraints[0];
    const taxonsConstraint = constraint.taxons;
    const taxset = this.dataTableTaxset.get(taxsetId);
    for (let i = 0; i < taxonsConstraint.length; i++) {
      for (const taxonIteration of taxonsConstraint[i]) {

        if (typeof taxonIteration === 'string') {
          for (const taxon of taxset.taxons) {
            if (taxonIteration == taxon) {
              return true;
            }
          }
        }

        /* No numbers in contraints groups or taxsets
        if (typeof taxonIteration === 'number') {
          if (taxsetId == taxonIteration) {
            if (excludeGroup == i) {
              continue;
            } else {
              return true;
            }
          }
          const taxsetIteration = this.dataTableTaxset.get(taxonIteration);
          for (const taxon of taxset.taxons) {
            for (const taxonTaxsetIteration of taxsetIteration.taxons) {
              if (taxon == taxonTaxsetIteration) {
                return true;
              }
            }
          }
        }*/

      }
    }
    return false;
  }

  validateContraints(): boolean {
    if (!this.validateKeyConstraints() || !this.validateTaxonsConstraints()) {
      return false;
    }
    return true;
  }

}

