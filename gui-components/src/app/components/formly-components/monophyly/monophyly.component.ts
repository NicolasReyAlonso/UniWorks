import {AfterViewInit, Component, EventEmitter, OnDestroy, OnInit, Output} from '@angular/core';
import {FieldType} from '@ngx-formly/core';

@Component({
    selector: 'app-monophyly-component',
    templateUrl: './monophyly.component.html',
    styleUrls: ['./monophyly.component.sass'],
    standalone: false
})
export class MonophylyComponent extends FieldType implements OnInit, AfterViewInit, OnDestroy {

  valueValidateResult = false;

  // Taxset
  dataTableTaxset = {};
  nextIdTaxset = 1;
  taxons: {}[];
  notIn: {}

  @Output() ValueChangeEvent = new EventEmitter<{}>();
  @Output() ValidateChangeEvent = new EventEmitter<boolean>();

  ngOnInit(): void {
    this.taxons = this.props.taxons;
  }

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

  ngAfterViewInit() {
    if (this.formControl.value && Object.keys(this.formControl.value).length !== 0) {
      this.dataTableTaxset = this.formControl.value;
      for (const k in this.dataTableTaxset) {
        this.dataTableTaxset[k] = this.dataTableTaxset[k].split(' ');
      }
    }
    else {
      this.formControl.setValue(this.dataTableTaxset);
    }
    this.initValidateEvent();
  }

  activeValueChangeEvent() {
    this.ValueChangeEvent.emit(this.dataTableTaxset);
    this.formControl.setValue(this.dataTableTaxset);
  }

  private validateResult(): boolean {
    for (const key of Object.keys(this.dataTableTaxset)) {
      if (!this.validateTaxset(key)) {
        return false;
      }
    }
    return true;
  }

  // Functions taxset

  addTaxset(): void {
    this.dataTableTaxset[`monophyly_${this.nextIdTaxset}`] = {
      taxons: [],
      notIn: false
    };
    this.nextIdTaxset++;
  }

  removeTaxset(id: string): void {
    delete this.dataTableTaxset[id];
    this.activeValueChangeEvent();
  }

  validateTaxons(taxons: string[]): boolean {
    if (taxons !== undefined && taxons.length < 1) {
      return false;
    }
    return true;
  }

  validateTaxset(name: string): boolean {
    return this.validateName(name) && this.validateTaxons(this.dataTableTaxset[name]['taxons']);
  }

  // Validations Taxset
  validateName(name: string): boolean {
    if (!name || name === '') {
      return false;
    }
    if (name.includes(' ')) {
      return false;
    }
    return true;
  }

}
