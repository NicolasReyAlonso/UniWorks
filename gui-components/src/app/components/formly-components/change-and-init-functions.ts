import {FormlyFieldConfig} from "@ngx-formly/core";
import {BackendService} from 'ngt-gui/core';
import {MessageLogService} from "ngt-gui/core";
import {Directive, Input, OnDestroy} from "@angular/core";
import {FilesService} from "../../services/files.service";
@Directive()
export abstract class FormlyUser implements OnDestroy {
  /* Class used to implement the methods needed for the changes and initialization of the formly components*/
  @Input()
  fields: FormlyFieldConfig[];
  model: any = {};
  initializedFields = new Set<string>()

  constructor(
    private readonly mFileService: FilesService,
  ) {}

  getField(key: string, fields: any): FormlyFieldConfig {
    for (const f of fields) {
      if (f.key === key) {
        return f;
      }

      if (f.fieldGroup) {
        const cf = this.getField(key, f.fieldGroup);
        if (cf) {
          return cf;
        }
      }
    }
  }

  setValueFieldGroup(key: string, path: string, fieldGroup: {}[] , newValue: any) {
    const lodash = require('lodash')
    for (let i = 0; i < fieldGroup.length; i++) {
      if (fieldGroup[i]['key'] === key) {
        lodash.set(fieldGroup, `[${i}].${path}`, newValue)
        return fieldGroup;
      }
    }
    return fieldGroup;
  }

  existsField(key: string, fields: any): boolean {
    let cf = false;
    for (const f of fields) {
      if (f.key === key) {
        return true;
      } else if (f.fieldGroup) {
        cf = this.existsField(key, f.fieldGroup) || cf;
      }
    }
    return cf;
  }

  getModelValue(key: string, model: any): any {
    if (model[key]) return model[key];

    for (let k in model) {
      if (typeof model[k] === 'object') {
        const value = this.getModelValue(key, model[k]);
        if (value) return value;
      }
    }
    return false;
  }

  initializeFields(initFunction: string, field: any, fromValue: any) {
    const initFunctions = {
      'initTaxons': this.initTaxons
    }
    initFunctions[initFunction].bind(this)(field, fromValue);
  }

  destroyFields() {
    const destroyFunctions = {
      'taxons': this.destroyTaxons,
    }

    for (let initField of this.initializedFields) {
      destroyFunctions[initField].bind(this)();
    }
  }

  parse_alignment_value(fromValue: any) {
    const alignments = []
    for (let v of fromValue) {
      if ('selection' in v) {
        alignments.push(v['selection']);
      }
    }
    return alignments
  }

  parse_sequence_value(fromValue: any) {
    return ''
  }

  //TAXONS INITIALIZATION
  private initTaxons(field: any, fromValue: any) {
    let value;
    let params;
    let obs;
    if ((field.type === 'alignment-selector' || field.type === 'sequence-selector' || field.type === 'multiple-selector')
      && 'object_type' in fromValue[0] && 'filesAPI' in fromValue[0]['object_type']) {
      obs = this.mFileService.getSequencesHeaders(fromValue[0]['object_type']['filesAPI']);
    } else if ('object_type' in fromValue[0] && 'bos' in fromValue[0]['object_type']) {
      if (field.type === 'multiple-selector' || field.type === 'alignment-selector') {
        value = this.parse_alignment_value(fromValue);
        params = BackendService.instance.filter(undefined, {'analysis_id': value});
      } else if (field.type === 'sequence-selector') {
        value = this.parse_sequence_value(fromValue);
        params = BackendService.instance.filter(undefined, {'sequences_id': value});
      }
      obs = BackendService.instance.getOrganisms(undefined, params);
    }
    obs.subscribe(
      response => {
        const newTaxons = [];
        for (const organism of new Set(response['content'])) {
          if (typeof organism === 'string') {
            newTaxons.push({label: organism, value: organism});
          } else {
            newTaxons.push({label: organism['canonical_name'], value: organism['canonical_underscored_name']});
          }
        }
        for (let i = 0; i < this.fields.length; i++) {
          this.fields[i]['fieldGroup'] = this.setValueFieldGroup('taxons_select', 'props.options', this.fields[i]['fieldGroup'], newTaxons);
          this.fields[i]['fieldGroup'] = this.setValueFieldGroup('monophyly', 'props.taxons', this.fields[i]['fieldGroup'], newTaxons);
          this.fields[i]['fieldGroup'] = this.setValueFieldGroup('taxset', 'props.taxons', this.fields[i]['fieldGroup'], newTaxons);
        }
        this.initializedFields.add('taxons');
      }, error => {
        MessageLogService.instance.addIssues(error['issues']);
      }, () => {
      });
  }

  changeTaxons($event, field) {
    let obs;
    if ('object_type' in $event && 'filesAPI' in $event['object_type']) {
      obs = this.mFileService.getSequencesHeaders($event['object_type']['filesAPI']);
    } else {
      const filter = JSON.parse(JSON.stringify($event));
      if ('filter' in filter && 'type_id' in filter['filter']) {
        delete filter['filter']['type_id']
      }
      obs = BackendService.instance.getOrganisms(undefined, filter);
    }
    obs.subscribe(
      response => {
        const newTaxons = [];
        for (const organism of new Set(response['content'])) {
          if (typeof organism === 'string') {
            newTaxons.push({label: organism, value: organism});
          } else {
            newTaxons.push({label: organism['canonical_name'], value: organism['canonical_underscored_name']});
          }
        }
        if (this.existsField('taxons_select', this.fields)) {
          this.getField('taxons_select', this.fields).props.options = newTaxons;
        }
        if (this.existsField('monophyly', this.fields)) {
          this.getField('monophyly', this.fields).props.taxons = newTaxons;
        }
        if (this.existsField('taxset', this.fields)) {
          this.getField('taxset', this.fields).props.taxons = newTaxons;
        }
        this.initializedFields.add('taxons');
      }, error => {
        MessageLogService.instance.addIssues(error['issues']);
      }, () => {
      });

  }

  private destroyTaxons() {
    for (let i = 0; i < this.fields.length; i++) {
      this.fields[i]['fieldGroup'] = this.setValueFieldGroup('taxons_select', 'props.options', this.fields[i]['fieldGroup'], []);
      this.fields[i]['fieldGroup'] = this.setValueFieldGroup('monophyly', 'props.taxons', this.fields[i]['fieldGroup'], []);
      this.fields[i]['fieldGroup'] = this.setValueFieldGroup('taxset', 'props.taxons', this.fields[i]['fieldGroup'], []);
    }
  }

  ngOnDestroy(): void {
    this.destroyFields();
  }
}
