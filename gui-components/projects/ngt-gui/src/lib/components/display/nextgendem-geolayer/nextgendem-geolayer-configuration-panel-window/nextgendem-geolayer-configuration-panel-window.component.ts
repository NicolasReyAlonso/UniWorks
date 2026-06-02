import {
  ChangeDetectorRef,
  Component,
  EventEmitter,
  Input,
  OnInit,
  Output,
  ViewChild,
  ViewEncapsulation
} from '@angular/core';
import {v4 as uuidv4} from 'uuid';
import {
  NextgendemGeolayerModalCqlGenerateByFilterComponent
} from "../nextgendem-geolayer-modal-cql-generate-by-filter/nextgendem-geolayer-modal-cql-generate-by-filter.component";
import {
  GeolayerExportModalComponent
} from "../../../data/geolayer/geolayer-export-modal/geolayer-export-modal.component";
import {UntypedFormGroup} from "@angular/forms";
import {FormlyFieldConfig} from "@ngx-formly/core";

@Component({
    encapsulation: ViewEncapsulation.None,
    selector: 'app-nextgendem-geolayer-configuration-panel-window',
    templateUrl: './nextgendem-geolayer-configuration-panel-window.component.html',
    styleUrls: ['./nextgendem-geolayer-configuration-panel-window.component.sass'],
    standalone: false
})
export class NextgendemGeolayerConfigurationPanelWindowComponent implements OnInit {

  @Input() layersData = {}

  @ViewChild(NextgendemGeolayerModalCqlGenerateByFilterComponent) nextgendemGeolayerModalCqlGenerateByFilterComponent: NextgendemGeolayerModalCqlGenerateByFilterComponent
  @ViewChild(GeolayerExportModalComponent) geolayerExportModalComponent: GeolayerExportModalComponent

  layerSelectedFilter: any;
  filterSelected: any;
  inputElementCQLFilter = ''
  isVisibleCQLGenerateModalFilter = false

  @Output('filterChange') filterChangeEmitter = new EventEmitter<any>()
  @Output('removeFilterLayer') removeFilterLayerEmitter = new EventEmitter<any>()
  @Output('changeWhereClickMapInfo') changeWhereClickMapInfoEmitter = new EventEmitter<string>()

  isVisibleInfoTab = false
  loadigClickInfoMap = false
  selectedLayerClickMapInfo = null
  selectedLayerClickMapInfoObject = null
  clickInfoMap = []
  selectedIndex = 0
  formGroupParamsFilterLayer = new UntypedFormGroup({});
  fieldsParamsFilterLayer: FormlyFieldConfig[] = [];
  modelParamsFilterLayer = {};
  inputFilterNameValue = ''

  constructor(
    private cdr: ChangeDetectorRef
  ) {
  }


  ngOnInit() {

  }

  newFilter(inputFilterName: HTMLInputElement): void {
    if (!inputFilterName.value || inputFilterName.value == '') {
      inputFilterName.focus()
      return
    }
    this.layersData[this.layerSelectedFilter].filters[uuidv4()] = {
      cql: '',
      sql: '',
      cqlObjectInit: {},
      params: [],
      name: inputFilterName.value
    }
    inputFilterName.value = ''
  }

  filterSelectedChange(event): void {
    this.modelParamsFilterLayer = {}
    this.fieldsParamsFilterLayer = []
    if (event) {
      const filter = this.layersData[this.layerSelectedFilter]?.filters[event]
      this.modelParamsFilterLayer = {...filter.paramsWithValue}
      this.cdr.detectChanges()
      this.fieldsParamsFilterLayer = this.generateFormlyByParamsFilter(filter.params)
      this.inputElementCQLFilter = filter?.cql ?? ''
    }
  }

  removeFilterLayer(event: MouseEvent, key): void {
    event.stopPropagation()
    const layer = this.layersData[this.layerSelectedFilter]
    delete layer.filters[key]
    this.filterSelected = this.filterSelected == key ? null : this.filterSelected
    this.removeFilterLayerEmitter.emit({layerKey: this.layerSelectedFilter, filterKey: key})
  }

  acceptEventCQLGenerateModalFilter(event) {
    this.isVisibleCQLGenerateModalFilter = false
    const result = {
      cql: '',
      sql: '',
      params: [],
    };
    this.generateSQLWhereFilterString(event, result, {}, {nextNumberParam: 1});
    this.generateCQLString(event, result, {}, {nextNumberParam: 1});
    const filterSelected = this.layersData[this.layerSelectedFilter].filters[this.filterSelected]
    filterSelected.cqlObjectInit = event
    filterSelected.cql = result.cql
    filterSelected.sql = result.sql
    filterSelected.params = result.params
    filterSelected.paramsWithValue = {}
    filterSelected.paramsWithValue = filterSelected.params.reduce((values, element) => {
      values[element.id] = ''
      return values
    }, {})
    this.inputElementCQLFilter = filterSelected.cql
    this.fieldsParamsFilterLayer = this.generateFormlyByParamsFilter(filterSelected.params)
    this.modelParamsFilterLayer = {}
    this.filterChangeEmitter.emit({
      layerSelectedKey: this.layerSelectedFilter,
      filterSelectedKey: this.filterSelected,
      filter: filterSelected
    })
  }

  async openGenerateCQLByFilterModal(): Promise<void> {
    const filterSelected = this.layersData[this.layerSelectedFilter].filters[this.filterSelected]
    this.nextgendemGeolayerModalCqlGenerateByFilterComponent.loading = true;
    this.isVisibleCQLGenerateModalFilter = true;
    await this.nextgendemGeolayerModalCqlGenerateByFilterComponent.setFilters(this.layersData[this.layerSelectedFilter].layer.properties);
    this.nextgendemGeolayerModalCqlGenerateByFilterComponent.setRules(filterSelected.cqlObjectInit);
    this.nextgendemGeolayerModalCqlGenerateByFilterComponent.loading = false;
  }

  generateCQLString(object, result: { params: any[]; cql: string }, paramsWithValue: { [key: string]: string }, opts: {
    nextNumberParam: number
  }): void {
    if (object.rules) {
      result.cql += '(';
      let firstTime = true;
      for (const rule of object.rules) {
        if (!firstTime) {
          result.cql += `${object.condition}`;
        }
        if (rule.rules) {
          result.cql += ' ';
          this.generateCQLString(rule, result, paramsWithValue, opts);
        } else {
          const property = this.layersData[this.layerSelectedFilter].layer.properties.find((element) => {
            return element.name === rule.field;
          });
          if (rule.value === '@') {
            opts.nextNumberParam++
            const paramValue = paramsWithValue[`@${opts.nextNumberParam - 1}`]
            if (!paramValue || paramValue === '') {
              result.cql += ` ${rule.field} ${rule.operator} @${opts.nextNumberParam - 1} `;
            } else {
              if (rule.operator === 'IN' || rule.operator === 'NOT IN') {
                result.cql += ` ${rule.field} ${rule.operator} (`;
                let f = true;
                for (const value of paramValue) {
                  if (!f) {
                    result.cql += ', ';
                  }
                  f = false;
                  if (property.cat_type === 'string') {
                    result.cql += `'${value}'`;
                  } else {
                    result.cql += `${value}`;
                  }
                }
                result.cql += ')';
                if (paramValue.length === 0) {
                  result.cql += ` ${rule.field} ${rule.operator} @${opts.nextNumberParam - 1} `;
                }
              } else {
                if (property.data_type === 'string' || (property.data_type === 'category' && property.cat_type === 'string')) {
                  result.cql += ` ${rule.field} ${rule.operator} '${paramValue}' `;
                } else {
                  result.cql += ` ${rule.field} ${rule.operator} ${paramValue} `;
                }
              }
            }
          } else {
            result.cql += ` ${rule.field} ${rule.operator} `;
            result.cql += rule.operator === 'IN' || rule.operator === 'NOT IN' ? `(` : '';
            if (property.data_type === 'string' || (property.data_type === 'category' && property.cat_type === 'string')) {
              result.cql += `'${rule.value}'`;
            } else {
              result.cql += `${rule.value}`;
            }
            result.cql += rule.operator === 'IN' || rule.operator === 'NOT IN' ? `)` : ' ';
          }
        }
        firstTime = false;
      }
      result.cql += `) `;
    }
  }

  generateSQLWhereFilterString(object, result: { params: any[]; sql: string }, paramsWithValue: {
    [key: string]: string
  }, opts: { nextNumberParam: number }) {
    if (object.rules) {
      result.sql += '(';
      let firstTime = true;
      for (const rule of object.rules) {
        if (!firstTime) {
          result.sql += `${object.condition}`;
        }
        if (rule.rules) {
          result.sql += ' ';
          this.generateSQLWhereFilterString(rule, result, paramsWithValue, opts);
        } else {
          const property = this.layersData[this.layerSelectedFilter].layer.properties.find((element) => {
            return element.name === rule.field;
          });
          if (rule.value === '@') {
            const param: any = {
              id: `@${opts.nextNumberParam}`,
              field: rule.field,
              operator: rule.operator,
            }
            result.params.push(param)
            opts.nextNumberParam++
            const paramValue = paramsWithValue[`@${opts.nextNumberParam - 1}`]
            if (!paramValue || paramValue === '') {
              result.sql += ` ${rule.field} ${rule.operator} @${opts.nextNumberParam - 1} `;
            } else {
              if (rule.operator === 'IN' || rule.operator === 'NOT IN') {
                result.sql += ` ${rule.field} ${rule.operator} (`;
                let f = true;
                for (const value of paramValue) {
                  if (!f) {
                    result.sql += ', ';
                  }
                  f = false;
                  if (property.cat_type === 'string') {
                    result.sql += `'${value}'`;
                  } else {
                    result.sql += `${value}`;
                  }
                }
                result.sql += ')';
                if (paramsWithValue[`@${opts.nextNumberParam - 1}`].length === 0) {
                  result.sql += ` ${rule.field} ${rule.operator} @${opts.nextNumberParam - 1} `;
                }
              } else {
                if (property.data_type === 'string' || (property.data_type === 'category' && property.cat_type === 'string')) {
                  result.sql += ` ${rule.field} ${rule.operator} '${paramValue}' `;
                } else {
                  result.sql += ` ${rule.field} ${rule.operator} ${paramValue} `;
                }
              }
            }
          } else {
            result.sql += ` ${rule.field} ${rule.operator} `;
            result.sql += rule.operator === 'IN' || rule.operator === 'NOT IN' ? `(` : '';
            if (property.data_type === 'string' || (property.data_type === 'category' && property.cat_type === 'string')) {
              result.sql += `'${rule.value}'`;
            } else {
              result.sql += `${rule.value}`;
            }
            result.sql += rule.operator === 'IN' || rule.operator === 'NOT IN' ? `)` : ' ';
          }
        }
        firstTime = false;
      }
      result.sql += `) `;
    }
  }

  selectedLayerClickMapInfoChange(event) {
    this.selectedLayerClickMapInfoObject = this.clickInfoMap.find(element => {
      return element.layerId = event
    })
  }

  changeWhereClickMapInfo(event: string) {
    this.selectedLayerClickMapInfo = null
    this.selectedLayerClickMapInfoObject = null
    this.changeWhereClickMapInfoEmitter.emit(event)
  }

  generateLayerByFilter() {
    const layer = this.layersData[this.layerSelectedFilter]
    const filter = layer.filters[this.filterSelected]
    this.geolayerExportModalComponent.openModal([layer.layer], {sql_where: filter.sql})
  }

  applyFilterLayer() {
    const filterSelected = this.layersData[this.layerSelectedFilter].filters[this.filterSelected]
    filterSelected.paramsWithValue = {...this.modelParamsFilterLayer}
    this.isVisibleCQLGenerateModalFilter = false
    const result = {
      cql: '',
      sql: '',
      params: [],
    };
    this.generateCQLString(filterSelected.cqlObjectInit, result, this.modelParamsFilterLayer, {nextNumberParam: 1});
    this.generateSQLWhereFilterString(filterSelected.cqlObjectInit, result, this.modelParamsFilterLayer, {nextNumberParam: 1});
    filterSelected.cql = result.cql
    filterSelected.sql = result.sql
    this.inputElementCQLFilter = filterSelected.cql
    this.filterChangeEmitter.emit({
      layerSelectedKey: this.layerSelectedFilter,
      filterSelectedKey: this.filterSelected,
      filter: filterSelected
    })
  }

  getCreateFieldForParamsFilterFunc(param, property) {
    return {
      category: () => {
        const field: FormlyFieldConfig = {
          key: param.id,
          type: 'customSelect',
          props: {
            label: `${param.field} ${param.operator} :`,
            style: {
              display: 'flex',
              'margin-top': '10px',
              'column-gap': '5px',
              'align-items': 'center',
            },
            styleLabel: {
              'font-weight': 'bold',
              flex: '0 0 auto',
            },
            styleSelect: {
              flex: '1 1 auto',
            },
            options: [],
            // onValueChange: (event) => {
            //   this.valueChangeFormlyFilterLayer();
            // },
          }
        };
        const options = [];
        for (const category of property.categories) {
          options.push({
            label: category,
            value: category,
          });
        }
        field.props.options = options;
        if (param.operator === 'IN' || param.operator === 'NOT IN') {
          field.props.nzMode = 'multiple'
        }
        return field
      },

      default: () => {
        const field: FormlyFieldConfig = {
          key: param.id,
          type: 'customInput',
          props: {
            label: `${param.field} ${param.operator} :`,
            style: {
              display: 'flex',
              'margin-top': '10px',
              'column-gap': '5px',
              'align-items': 'center',
            },
            styleLabel: {
              'font-weight': 'bold',
              flex: '0 0 auto',
            },
            styleInput: {
              flex: '1 1 auto',
            },
            // onValueChange: (event) => {
            //   this.valueChangeFormlyFilterLayer();
            // },
          }
        }
        return field
      }
    }

  }

  generateFormlyByParamsFilter(params) {
    const fields = []
    params.forEach(param => {
      const properties = this.layersData[this.layerSelectedFilter]?.layer?.properties
      if (!properties) return
      const property = properties.find(property => {
        return param.field == property.name
      })
      if (!property) return
      const createFieldFunc = this.getCreateFieldForParamsFilterFunc(param, property)[property.data_type] ?? this.getCreateFieldForParamsFilterFunc(param, property).default
      const field = createFieldFunc()
      fields.push(field)
    })
    return fields
  }

}
