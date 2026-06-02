import {Component, EventEmitter, Input, Output, ViewChild} from '@angular/core';
import {JqueryQuerybuilderComponent} from "../../../miscellaneous/jquery-querybuilder/jquery-querybuilder.component";
import {NzModalService} from "ng-zorro-antd/modal";
import {InternationalizationService} from "ngt-gui/core";
@Component({
    selector: 'app-nextgendem-geolayer-modal-cql-generate-by-filter',
    templateUrl: './nextgendem-geolayer-modal-cql-generate-by-filter.component.html',
    styleUrls: ['./nextgendem-geolayer-modal-cql-generate-by-filter.component.sass'],
    standalone: false
})
export class NextgendemGeolayerModalCqlGenerateByFilterComponent {

  loading = false;
  @Input() isVisible = false;
  @Output() isVisibleChange = new EventEmitter<boolean>();
  @Output() acceptEvent = new EventEmitter<any>();

  @ViewChild('jquerybuilder') jquerybuilders: JqueryQuerybuilderComponent;
  operators = [
    {type: '=', nb_inputs: 1, multiple: false, apply_to: ['string']},
    {type: '<>', nb_inputs: 1, multiple: false, apply_to: ['string']},
    {type: '<', nb_inputs: 1, multiple: false, apply_to: ['string']},
    {type: '<=', nb_inputs: 1, multiple: false, apply_to: ['string']},
    {type: '>', nb_inputs: 1, multiple: false, apply_to: ['string']},
    {type: '>=', nb_inputs: 1, multiple: false, apply_to: ['string']},
    {type: 'LIKE', nb_inputs: 1, multiple: false, apply_to: ['string']},
    {type: 'NOT LIKE', nb_inputs: 1, multiple: false, apply_to: ['string']},
    {type: 'IN', nb_inputs: 1, multiple: false, apply_to: ['string']},
    {type: 'NOT IN', nb_inputs: 1, multiple: false, apply_to: ['string']},
  ];

  constructor(
    private readonly modalService: NzModalService,
    private readonly internationalizationService: InternationalizationService,
  ) {
  }

  ngOnInit(): void {
  }

  async setFilters(properties: any[]): Promise<void> {
    await new Promise<void>((resolve, reject) => {
      const interval = setInterval(() => {
        if (this.jquerybuilders) {
          clearInterval(interval);
          resolve();
        }
      }, 500);
    });
    const filters = [];
    for (const property of properties) {
      const filter: any = {
        id: property.name,
        field: property.name,
        label: property.name,
        type: 'string',
        operators: []
      };
      switch (property.data_type) {
        case 'numeric':
          filter.operators.push('=', '<>', '<', '<=', '>', '>=');
          filter.validation = {
            callback: (value, rule) => {
              if (value === '@') {
                return true;
              }
              if (isNaN(value)) {
                return ['Error en el formato'];
              }
              return true;
            }
          };
          filter.valueGetter = function (rule) {
            const values = [];
            rule.$el.find('.rule-value-container input').each(function () {
              const value = `${this.value}`;
              if (value.trim() === '@') {
                values.push(value.trim());
                return;
              }
              values.push(parseFloat(value));
              return;
            });
            return rule.operator.nb_inputs === 1 ? values[0] : values;
          };
          break;
        case 'int':
          filter.operators.push('=', '<>', '<', '<=', '>', '>=');
          filter.valueGetter = function (rule) {
            const values = [];
            rule.$el.find('.rule-value-container input').each(function () {
              const value = `${this.value}`;
              if (value.trim() === '@') {
                values.push(value.trim());
                return;
              }
              values.push(parseFloat(value));
              return;
            });
            return rule.operator.nb_inputs === 1 ? values[0] : values;
          };
          filter.validation = {
            callback: (value, rule) => {
              if (value === '@') {
                return true;
              }
              const num = Number(value);
              if (!Number.isInteger(num)) {
                return ['Error en el formato'];
              }
              return true;
            }
          }
          break;
        case 'string':
          filter.operators.push('LIKE', 'NOT LIKE');
          filter.validation = {
            callback: (value, rule) => {
              if (!value || value === '') {
                return ['Error en el formato'];
              }
              return true;
            }
          },
            filter.valueGetter = function (rule) {
              const values = [];
              const operator = rule.operator.type;
              rule.$el.find('.rule-value-container input').each(function () {
                let value = `${this.value}`;
                values.push(value.trim());
                return;
              });
              return rule.operator.nb_inputs === 1 ? values[0] : values;
            };
          break;
        case 'category':
          filter.operators.push('IN', 'NOT IN');
          filter.input = 'select';
          filter.values = {};
          filter.values['@'] = '@';
          for (const element of property.categories) {
            filter.values[element] = element;
          }
          if (property.cat_type === 'string') {
            filter.operators.push('LIKE', 'NOT LIKE');
          }
          if (property.cat_type === 'numeric' || property.cat_type === 'int') {
            filter.operators.push('=', '<>', '<', '<=', '>', '>=');
          }
          break
      }
      filters.push(filter);
    }
    this.jquerybuilders.setFilters(filters);
  }

  onCancelClick() {
    this.isVisible = false;
    this.isVisibleChange.emit(this.isVisible);
  }

  async onAcceptClick(): Promise<void> {
    const translateKeyError = 'GEO_VIEWER.INFO.FILTERS.MODAL_GENERATE_CQL.ERROR';
    this.loading = true;
    if (!this.jquerybuilders.getValidation()) {
      this.modalService.error({
        nzTitle: await this.internationalizationService.translate(`${translateKeyError}.VALIDATION.TITLE`),
        nzContent: await this.internationalizationService.translate(`${translateKeyError}.VALIDATION.CONTENT`),
        nzCentered: true,
      });
      this.loading = false;
      return;
    }
    this.acceptEvent.emit(this.jquerybuilders.getRules());
    this.loading = false;
  }

  sortFilters(filters: { label: string }[]): any[] {
    filters.sort((a, b) => {
      return a.label.localeCompare(b.label);
    });
    return filters;
  }

  setRules(rules) {
    if (Object.keys(rules).length === 0) {
      return;
    }
    this.jquerybuilders.setRules(rules);
  }


}
