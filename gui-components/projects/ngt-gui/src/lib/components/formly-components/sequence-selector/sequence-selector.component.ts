// panel-wrapper.component.ts
import {AfterViewInit, Component, OnInit, ViewChild} from '@angular/core';
import {FieldType, FormlyFieldConfig} from '@ngx-formly/core';
import {UntypedFormControl, ValidationErrors} from '@angular/forms';
import {DynamicBrowseComponent} from "src/app/components/dynamics/dynamic-browse/dynamic-browse.component";
import {BackendService} from 'ngt-gui/core';import {MessageLogService} from "../../../services/message-log.service";

@Component({
    selector: 'app-sequence-selector',
    templateUrl: './sequence-selector.component.html',
    standalone: false
})
export class SequenceSelectorComponent extends FieldType implements OnInit, AfterViewInit {

  collapsePanelActiveDynamicBrowser = false;
  updateDataFirstTime = true;
  collapsePanelDisable = true;

  preValue: any[] = [{}, {}]; // sequences, file
  type: string;
  filename: string;
  queryParams: string;
  @ViewChild('sequencesDynamicBrowser') sequencesDynamicBrowser: DynamicBrowseComponent;
  fastaString = "";
  filesFasta = [];
  uploaderHeader: string;

  constructor(readonly backendService: BackendService,
              readonly msg: MessageLogService) {super();};

  ngOnInit(): void {
    this.type = this.props.extension;
    this.filename = this.props.filename;
    this.queryParams = this.props.queryParams;
    this.uploaderHeader = `${this.type.toUpperCase()} files with sequences uploader`
  }

  ngAfterViewInit() {
    if (this.formControl.value && Object.keys(this.formControl.value).length !== 0) {
      this.formControl.value.forEach(element => {
        if ('bos' in element.object_type) {
          this.preValue[0] = element;
          if (element.selection.filter["feature_id"]) {
              if (element.selection.filter["feature_id"].op === 'out') {
                this.sequencesDynamicBrowser.dynamicTable.onAllChecked(true);
              }
              const checkedItems = this.sequencesDynamicBrowser.dynamicTable.checkedItems;
              element.selection.filter["feature_id"].unary.forEach((element) => {
                checkedItems.add(element);
              });
          } else {
            this.sequencesDynamicBrowser.dynamicTable.onAllChecked(true);
          }
          const filterWithoutFeatureId = {...element.selection.filter};
          delete filterWithoutFeatureId["feature_id"];
          const filter = {};
          Object.keys(filterWithoutFeatureId).forEach(key => {
            if (filterWithoutFeatureId[key].op === "in") {
              filter[key] = filterWithoutFeatureId[key].unary;
            }
          });
          this.sequencesDynamicBrowser.filterState = filter;
        }
        else {
          this.preValue[1] = element;
        }
      });
      this.setValue();
    }
  }

  setValue() {
    const value = [];
    this.preValue.forEach((m: {}, index) => {
      if (m && Object.entries(m).length !== 0 && m.constructor === Object) {
        const newValue = {
          ...m,
          formlyKey: this.key,
        }
        value.push(newValue);
      }
    });
    this.formControl.setValue(value);
  }

  receiveSequenceBrowse(event) {
    if (event) {
      if (event['filter'] === undefined) {
        event['filter'] = {}
      }
      if (Object.keys(event['filter']).length === 0) {
        event['filter']['sequences'] = {'is_analysis': {"op": "eq", "unary": false}};
        event['filter']['type_id'] = {"op": "in", "unary": [1315]};
        event['is_analysis'] = false;
      }
      if (this.queryParams.length > 0) {
        event["header"] = 'organism_canon_underscored';
      }
      event["only_ids"] = true;
      this.backendService.getSequences(null, event).subscribe({
        next: (response) => {
          const seqs = response['content'];
          const filter = {'filter': {'feature_id':{'op': 'in', 'unary': seqs}}};
          this.preValue[0] = {
            remote_name: this.filename + '.' + this.type,
            selection: filter,
            object_type: {bos: 'sequences'},
            queryParams: "",
            type: this.type
          };
          this.setValue();
        },
        error: (e) => {
          this.msg.error(e.toString());
        }
      });
    } else {
      this.preValue[0] = {};
    }
    const checkedItems = this.sequencesDynamicBrowser.dynamicTable.checkedItems;
    this.props.changeFunc(event, this);
  }

  receiveFiles(files: {}[]) {
    if (files.length > 0)
      this.preValue[1] = files[0];
    else
      this.preValue[1] = {};

    this.setValue();
  }

  updateDataEventDynamicBrowser(event: {type: string, data: null}) {
    switch (event.type) {
      case 'startUpdate':
        this.collapsePanelActiveDynamicBrowser = false;
        break;
      case 'endUpdate':
        if (this.updateDataFirstTime) {
          this.updateDataFirstTime = false;
          this.collapsePanelDisable = false;
        } else {
          this.collapsePanelActiveDynamicBrowser = true;
        }
        break;
    }
  }

  protected readonly Object = Object;
}


export function SequenceSelectorValidator(control: UntypedFormControl): ValidationErrors {
  return control.value && Array.isArray(control.value) && control.value.length !== 0 ? null :
    {sequence_validator: true};
}

export function SequenceSelectorValidatorMessage(err, field: FormlyFieldConfig) {
  return `At least one sequence should be selected.`;
}

