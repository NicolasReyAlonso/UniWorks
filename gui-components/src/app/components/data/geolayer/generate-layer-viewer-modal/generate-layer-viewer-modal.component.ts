import {Component, EventEmitter, Input, OnInit, Output, ViewChild} from '@angular/core';
import {
  JqueryQuerybuilderComponent
} from 'src/app/components/miscellaneous/jquery-querybuilder/jquery-querybuilder.component';
import {NzModalModule, NzModalService} from 'ng-zorro-antd/modal';
import {InternationalizationService} from "ngt-gui/core";
import {CommonModule} from '@angular/common';
import {SharedModule} from "../../../../shared-module/shared.module";
import {NzButtonModule} from "ng-zorro-antd/button";
import {NzTabsModule} from "ng-zorro-antd/tabs";
import {FormsModule, ReactiveFormsModule} from "@angular/forms";
import {NzTableModule} from "ng-zorro-antd/table";
import {NzSpinModule} from "ng-zorro-antd/spin";
import {NzCheckboxModule} from "ng-zorro-antd/checkbox";
import {NotificationService} from "../../../../services/notification.service";

export enum ModalTitleEnum {
  GENERATE_VIEW = 'DISPLAY.GIS.GENERATE_VIEW_MODAL.TITLE.GENERATE_VIEW',
  GENERATE_LAYER = 'DISPLAY.GIS.GENERATE_VIEW_MODAL.TITLE.GENERATE_LAYER'
}

@Component({
    selector: 'app-generate-layer-viewer-modal',
    imports: [
        CommonModule,
        SharedModule,
        NzButtonModule,
        JqueryQuerybuilderComponent,
        NzTabsModule,
        FormsModule,
        ReactiveFormsModule,
        NzTableModule,
        NzSpinModule,
        NzModalModule,
        NzCheckboxModule,
    ],
    templateUrl: './generate-layer-viewer-modal.component.html',
    styleUrls: ['./generate-layer-viewer-modal.component.sass']
})
export class GenerateLayerViewerModalComponent implements OnInit {

  @Input() ModalTitle: ModalTitleEnum = ModalTitleEnum.GENERATE_VIEW;
  @Input() isVisible = true;
  @Input() isLoading = false;
  @Input() Layers = [];
  @Output() isVisibleChange = new EventEmitter<boolean>();
  @Output() isLoadingChange = new EventEmitter<boolean>();
  @Output() acceptModalEmitter = new EventEmitter<any>();

  selectedTab = 0;
  selectedLayers: any[] = [];
  loading = false;
  @ViewChild('joinJQueryBuilder', {static: false}) joinJQueryBuilder: JqueryQuerybuilderComponent;
  joinOperatorsJQueryBuilder = [
    // NO GEOMETRY
    {type: 'INNER', nb_inputs: 1, multiple: false, apply_to: ['string', 'number']},
    {type: 'OUTER', nb_inputs: 1, multiple: false, apply_to: ['string', 'number']},
    {type: 'RIGHT', nb_inputs: 1, multiple: false, apply_to: ['string', 'number']},
    {type: 'LEFT', nb_inputs: 1, multiple: false, apply_to: ['string', 'number']},
    // GEOMETRY
    {type: 'contains', nb_inputs: 1, multiple: false, apply_to: ['string', 'number']},
    {type: 'intersects', nb_inputs: 1, multiple: false, apply_to: ['string', 'number']},
    {type: 'disjoint', nb_inputs: 1, multiple: false, apply_to: ['string', 'number']},
    {type: 'crosses', nb_inputs: 1, multiple: false, apply_to: ['string', 'number']},
    {type: 'overlaps', nb_inputs: 1, multiple: false, apply_to: ['string', 'number']},
    {type: 'within', nb_inputs: 1, multiple: false, apply_to: ['string', 'number']},
    {type: 'dwithin', nb_inputs: 1, multiple: false, apply_to: ['string', 'number']},
    {type: 'equals', nb_inputs: 1, multiple: false, apply_to: ['string', 'number']},
    {type: 'touches', nb_inputs: 1, multiple: false, apply_to: ['string', 'number']},
  ];
  @ViewChild('filterJQueryBuilder', {static: false}) filterJQueryBuilder: JqueryQuerybuilderComponent;
  filterOperatorsJQueryBuilder = [
    // NO GEOMETRY
    {type: '=', nb_inputs: 1, multiple: false, apply_to: ['string']},
    {type: '<', nb_inputs: 1, multiple: false, apply_to: ['string']},
    {type: '<=', nb_inputs: 1, multiple: false, apply_to: ['string']},
    {type: '>', nb_inputs: 1, multiple: false, apply_to: ['string']},
    {type: '>=', nb_inputs: 1, multiple: false, apply_to: ['string']},
    {type: '!=', nb_inputs: 1, multiple: false, apply_to: ['string']},
    {type: 'equals', nb_inputs: 1, multiple: false, apply_to: ['string']},
    {type: 'equals_ignore_case', nb_inputs: 1, multiple: false, apply_to: ['string']},
    {type: 'in', nb_inputs: 1, multiple: false, apply_to: ['string']},
    {type: 'in_ignore_case', nb_inputs: 1, multiple: false, apply_to: ['string']},
    {type: 'in_category', nb_inputs: 1, multiple: false, apply_to: ['string', 'select']},
    // GEOMETRY
  ];
  @ViewChild('showFieldsJQueryBuilder', {static: false}) showFieldsJQueryBuilder: JqueryQuerybuilderComponent;
  showFieldsOperatorsJQueryBuilder = [
    {type: 'not_function', nb_inputs: 0, multiple: false, apply_to: ['string']},
    {type: 'function1', nb_inputs: 1, multiple: false, apply_to: ['string']},
    {type: 'function2', nb_inputs: 2, multiple: false, apply_to: ['string']},
  ];

  constructor(
    private readonly modalService: NzModalService,
    private readonly internationalizationService: InternationalizationService,
    private readonly notificationService: NotificationService,
  ) {
  }

  ngOnInit(): void {


  }

  closeModal() {
    this.selectedLayers = [];
    this.isVisible = false;
    this.isVisibleChange.emit(this.isVisible);
  }

  isCheckedLayer(layer): any {
    return this.selectedLayers.find((element) => {
      return (element.uuid === layer.uuid);
    });
  }

  async onSelectLayer(layer, value): Promise<void> {
    let index = -1;
    this.selectedLayers.find((element, elementIndex) => {
      if (element.uuid === layer.uuid) {
        index = elementIndex;
      }
    });
    if (value) {
      if (index === -1) {
        this.selectedLayers.push(layer);
        if (this.selectedLayers.length > 1) {
          this.setFiltersJoinJQueryBuilder();
        }
        if (this.selectedLayers.length > 0) {
          this.setFiltersFilterJQueryBuilder();
          this.setFiltersShowFieldsJQueryBuilder();
        }
      }
    } else {
      if (index > -1) {
        this.selectedLayers.splice(index, 1);
        if (this.joinJQueryBuilder) {
          this.joinJQueryBuilder.resetQueryBuilder();
        }
        if (this.filterJQueryBuilder) {
          this.filterJQueryBuilder.resetQueryBuilder();
          this.filterJQueryBuilder.setRules([]);
        }
        if (this.showFieldsJQueryBuilder) {
          this.showFieldsJQueryBuilder.resetQueryBuilder();
        }
        this.setFiltersJoinJQueryBuilder();
        this.setFiltersFilterJQueryBuilder();
        this.setFiltersShowFieldsJQueryBuilder();
      }
    }
  }

  setFiltersJoinJQueryBuilder(): void {
    if (!this.joinJQueryBuilder) {
      return;
    }
    const filters = [];
    const numericList = [];
    const stringList = [];
    const intList = [];
    const geometryList = [];
    const allList = [
      {
        list: numericList,
        data_type: 'numeric'
      }, {
        list: stringList,
        data_type: 'string'
      }, {
        list: intList,
        data_type: 'int'
      }, {
        list: geometryList,
        data_type: 'geometry'
      }
    ];
    for (const layer of this.selectedLayers) {
      for (const property of layer.properties) {
        switch (property.data_type) {
          case 'numeric':
            numericList.push({
              label: `${layer.name}.${property.name}`,
              id: `${layer.id}$${property.name}`,
            });
            break;
          case 'int':
            intList.push({
              label: `${layer.name}.${property.name}`,
              id: `${layer.id}$${property.name}`,
            });
            break;
          case 'string':
            stringList.push({
              label: `${layer.name}.${property.name}`,
              id: `${layer.id}$${property.name}`,
            });
            break;
          case 'geometry':
            geometryList.push({
              label: `${layer.name}.${property.name}`,
              id: `${layer.id}$${property.name}`,
            });
            break;
        }
      }
    }
    for (const currentList of allList) {
      for (let i = 0; i < currentList.list.length; i++) {
        const filter = {
          id: currentList.list[i].id,
          label: currentList.list[i].label,
          type: 'string',
          input: 'select',
          values: {},
          operators: ['INNER', 'OUTER', 'RIGHT', 'LEFT']
        };
        if (currentList.data_type === 'numeric' || currentList.data_type === 'int' || currentList.data_type === 'string') {
          filter.operators = ['INNER', 'OUTER', 'RIGHT', 'LEFT'];
        } else if (currentList.data_type === 'geometry') {
          filter.operators = ['contains', 'disjoint', 'disjoint', 'crosses', 'overlaps', 'within', 'dwithin', 'equals', 'touches'];
        }
        for (let j = 0; j < currentList.list.length; j++) {
          if (i === j) {
            continue;
          }
          filter.values[`${currentList.list[j].id}`] = currentList.list[j].label;
        }
        if (Object.keys(filter.values).length !== 0) {
          filters.push(filter);
        }
      }
    }
    this.sortFilters(filters);
    this.joinJQueryBuilder.setFilters(filters);
  }

  createInstanceFilter(layer, property, type: string, options?: any): any {
    switch (type) {
      case 'numeric':
        return {
          label: `${layer.name}.${property.name}`,
          id: `${layer.id}$${property.name}`,
          type: 'string',
          input: 'text',
          valueGetter(rule) {
            const values = [];
            rule.$el.find('.rule-value-container input').each(function () {
              const value = `${this.value}`;
              if (rule.operator.type === 'in') {
                const numbers = [];
                for (const valueSplit of value.trim().split(';')) {
                  numbers.push(parseFloat(valueSplit.trim()));
                }
                values.push(numbers);
                return;
              }
              values.push(parseFloat(value));
              return;
            });
            return rule.operator.nb_inputs === 1 ? values[0] : values;
          },
          validation: {
            callback: (value, rule) => {
              if (rule.operator.type === 'in') {
                for (const valueSplit of value) {
                  if (isNaN(valueSplit)) {
                    return ['Error en el formato'];
                  }
                }
                return true;
              }
              if (isNaN(value)) {
                return ['Error en el formato'];
              }
              return true;
            }
          },
          operators: ['=', '<=', '<', '>', '=>', '!=', 'in']
        };
      case 'int':
        return {
          label: `${layer.name}.${property.name}`,
          id: `${layer.id}$${property.name}`,
          type: 'string',
          input: 'text',
          valueGetter(rule) {
            const values = [];
            rule.$el.find('.rule-value-container input').each(function () {
              const value = `${this.value}`;
              if (rule.operator.type === 'in') {
                const numbers = [];
                for (const valueSplit of value.trim().split(';')) {
                  numbers.push(parseFloat(valueSplit.trim()));
                }
                values.push(numbers);
                return;
              }
              values.push(parseFloat(value));
              return;
            });
            return rule.operator.nb_inputs === 1 ? values[0] : values;
          },
          validation: {
            callback: (value, rule) => {
              if (rule.operator.type === 'in') {
                for (const valueSplit of value) {
                  const num = Number(valueSplit);
                  if (!Number.isInteger(num)) {
                    return ['Error en el formato'];
                  }
                }
                return true;
              }
              const num = Number(value);
              if (!Number.isInteger(num)) {
                return ['Error en el formato'];
              }
              return true;
            }
          },
          operators: ['=', '<=', '<', '>', '=>', '!=', 'in']
        };
      case 'string':
        return {
          label: `${layer.name}.${property.name}`,
          id: `${layer.id}$${property.name}`,
          type: 'string',
          operators: ['equals', 'equals_ignore_case', 'in', 'in_ignore_case'],
          validation: {
            callback: (value, rule) => {
              const operator = rule.operator.type;
              if (operator === 'in' || operator === 'in_ignore_case') {
                for (const valueSplit of value) {
                  if (!valueSplit || valueSplit === '') {
                    return ['Error en el formato'];
                  }
                }
                return true;
              }
              if (!value || value === '') {
                return ['Error en el formato'];
              }
              return true;
            }
          },
          valueGetter(rule) {
            const values = [];
            const operator = rule.operator.type;
            rule.$el.find('.rule-value-container input').each(function () {
              let value = `${this.value}`;
              if (operator === 'equals_ignore_case' || operator === 'in_ignore_case') {
                value = value.toLocaleLowerCase();
              }
              if (operator === 'in' || operator === 'in_ignore_case') {
                const numbers = [];
                for (const valueSplit of value.trim().split(';')) {
                  numbers.push(valueSplit.trim());
                }
                values.push(numbers);
                return;
              }
              values.push(value);
              return;
            });
            return rule.operator.nb_inputs === 1 ? values[0] : values;
          },
        };
      case 'category':
        const filter: any = {
          label: `${layer.name}.${property.name}`,
          id: `${layer.id}$${property.name}`,
          type: 'string',
          input: 'select',
          operators: [],
          values: {},
          multiple: false,
        };
        switch (property.cat_type) {
          case 'string':
            filter.operators = ['equals'];
            break;
          case 'int':
            filter.operators = ['=', '<=', '<', '>', '=>', '!='];
            break;
        }
        if (!property.categories) return null;
        for (const category of property.categories) {
          filter.values[`${category}`] = category;
        }
        return filter;

    }
  }

  setFiltersFilterJQueryBuilder(): void {
    try {
      if (!this.filterOperatorsJQueryBuilder) {
        return;
      }
      const filters = [];
      for (const layer of this.selectedLayers) {
        for (const property of layer.properties) {
          switch (property.data_type) {
            case 'numeric':
              filters.push(this.createInstanceFilter(layer, property, 'numeric'));
              break;
            case 'int':
              filters.push(this.createInstanceFilter(layer, property, 'int'));
              break;
            case 'string':
              filters.push(this.createInstanceFilter(layer, property, 'string'));
              break;
            case 'category':
              const instanceFilter = this.createInstanceFilter(layer, property, 'category');
              if (instanceFilter)
                filters.push(this.createInstanceFilter(layer, property, 'category'));
              break;
          }
        }

      }
      this.sortFilters(filters);
      this.filterJQueryBuilder.setFilters(filters);
    } catch (e) {
      this.notificationService.createNotificationError(
        'DISPLAY.GIS.GENERATE_VIEW_MODAL.ERROR_WHEN_OPEN.CONTENT',
        'bottomRight',
      );
      this.closeModal();
    }
  }

  setFiltersShowFieldsJQueryBuilder(): void {
    if (!this.showFieldsJQueryBuilder) {
      return;
    }
    const filters = [];
    for (const layer of this.selectedLayers) {
      for (const property of layer.properties) {
        switch (property.data_type) {
          case 'numeric':
            filters.push({
              label: `${layer.name}.${property.name}`,
              id: `${layer.id}$${property.name}`,
              type: 'string',
              input: 'text',
              operators: ['not_function', 'function1', 'function2']
            });
            break;
          case 'int':
            filters.push({
              label: `${layer.name}.${property.name}`,
              id: `${layer.id}$${property.name}`,
              type: 'string',
              input: 'text',
              operators: ['not_function', 'function1', 'function2']
            });
            break;
          case 'string':
            filters.push({
              label: `${layer.name}.${property.name}`,
              id: `${layer.id}$${property.name}`,
              type: 'string',
              operators: ['not_function', 'function1', 'function2']
            });
            break;
          case 'geometry':
            filters.push({
              label: `${layer.name}.${property.name}`,
              id: `${layer.id}$${property.name}`,
              type: 'string',
              operators: ['not_function']
            });
            break;
        }
      }
    }
    this.sortFilters(filters);
    filters.unshift({
      label: `*`,
      id: `*`,
      type: 'string',
      input: 'text',
      operators: ['not_function']
    });
    this.showFieldsJQueryBuilder.setFilters(filters);
  }

  disableAcceptButtonGenerateViewModal(): boolean {
    if (this.selectedLayers.length === 0) {
      return true;
    }
    return false;
  }

  async onAcceptButtonGeneraViewModal(): Promise<void> {
    const translateKeyError = 'DISPLAY.GIS.GENERATE_VIEW_MODAL.ERROR_VALIDATE_GENERATE_VIEW_MODAL';
    if (this.selectedLayers.length === 0) {
      this.modalService.error({
        nzTitle: 'Error',
        nzContent: await this.internationalizationService.translate(`${translateKeyError}.NUMBERS_LAYERS`),
      });
      return;
    }
    const filterJQueryBuilderValidation = this.filterJQueryBuilder.getValidation();
    const showFieldsJQueryBuilderValidation = this.showFieldsJQueryBuilder.getValidation();
    const joinJQueryBuilderValidation = this.selectedLayers.length < 2 || this.joinJQueryBuilder.getValidation();
    if (!filterJQueryBuilderValidation || !showFieldsJQueryBuilderValidation || !joinJQueryBuilderValidation) {
      this.modalService.error({
        nzTitle: 'Error',
        nzContent: await this.internationalizationService.translate(`${translateKeyError}.VALIDATE_FORM`),
        nzCentered: true,
      });
      return;
    }
    const layersIdList = [];
    const jsonWhere = this.filterJQueryBuilder.getRules();
    const jsonSelect = this.showFieldsJQueryBuilder.getRules();
    for (const layer of this.selectedLayers) {
      layersIdList.push(layer.id);
    }
    // tslint:disable-next-line:variable-name
    const layer_from_query: any = {
      layer_from_query:
        {
          layers: layersIdList,
          where: jsonWhere,
          select: jsonSelect
        }
    };
    if (this.selectedLayers.length > 1) {
      layer_from_query.layer_from_query.join = this.joinJQueryBuilder.getRules();
      const auxLayersIdList = [...layersIdList];
      for (const rule of layer_from_query.layer_from_query.join.rules) {
        const fieldLayerId = parseInt(rule.field.split('$')[0], 10);
        const valueLayerId = parseInt(rule.value.split('$')[0], 10);
        const indexField = auxLayersIdList.indexOf(fieldLayerId);
        if (indexField !== -1) {
          auxLayersIdList.splice(indexField, 1);
        }
        const indexValue = auxLayersIdList.indexOf(valueLayerId);
        if (indexValue !== -1) {
          auxLayersIdList.splice(indexValue, 1);
        }
      }
      if (auxLayersIdList.length !== 0) {
        this.modalService.error({
          nzTitle: 'Error',
          nzContent: await this.internationalizationService.translate(`${translateKeyError}.ERROR_JOIN`),
          nzCentered: true,
        });
        return;
      }
    }
    this.acceptModalEmitter.emit(layer_from_query);
  }

  sortFilters(filters: { label: string }[]): any[] {
    filters.sort((a, b) => {
      return a.label.localeCompare(b.label);
    });
    return filters;
  }

}

