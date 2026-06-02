// panel-wrapper.component.ts
import {AfterViewInit, Component, EventEmitter, Input, OnChanges, OnInit, Output, SimpleChanges, ViewChild} from '@angular/core';
import {FieldType, FormlyFieldConfig} from '@ngx-formly/core';
import {UntypedFormControl, ValidationErrors} from '@angular/forms';
import { DynamicBrowseComponent } from 'ngt-gui/gui';

type Writable<T> = { -readonly [K in keyof T]: T[K] };

@Component({
    selector: 'app-alignment-selector',
    templateUrl: './alignment-selector.component.html',
    standalone: false
})
export class AlignmentSelectorComponent extends FieldType implements OnInit, OnChanges, AfterViewInit {

  collapsePanelActiveDynamicBrowser = false;
  updateDataFirstTime = true;
  collapsePanelDisable = true;

  preValue: {}[] = [{},{}]; // alignments, file
  type: string;
  filename: string;
  uploaderHeader: string;
  fileSelectorString = "";
  bos_type_tab_index = 0;
  @ViewChild('alignmentDynamicBrowser') alignmentDynamicBrowser: DynamicBrowseComponent;
  @ViewChild('superMatricesDynamicBrowser') superMatricesDynamicBrowser: DynamicBrowseComponent;
  @Input() filenameInput: string;
  @Input() toInput: {};
  @Output() valueChangedEvent: EventEmitter<any> = new EventEmitter();
  filesSelector = [];

  ngOnChanges(changes: SimpleChanges): void {
    if (changes.hasOwnProperty('filenameInput')) {
      if (changes.filenameInput.isFirstChange()) { // AKA initialization by angular
        this.filename = this.filenameInput;
      }
    }
  }

  ngOnInit(): void {
    if (this.toInput === undefined){
      this.type = this.props.extension;
      this.filename = this.props.filename;
    } else {
      this.type = this.toInput['extension'];
      this.props.queryParams = this.toInput['queryParams'];
    }
    this.uploaderHeader = `${this.type.toUpperCase()} file with alignment uploader`;
  }

  ngAfterViewInit() {
    if (this.formControl.value && Object.keys(this.formControl.value).length !== 0) {
        this.formControl.value.forEach(element => {
        if (element.object_type === 'box') {
          this.preValue[0] = element;
          const bos = element['object_type']['bos'];
          let checkedItems;
          if (bos == 'alignments') {
            checkedItems = this.alignmentDynamicBrowser.dynamicTable.checkedItems;
          } else if (bos == 'supermatrices') {
            this.bos_type_tab_index = 1;
            checkedItems = this.superMatricesDynamicBrowser.dynamicTable.checkedItems;
          }
          checkedItems.add(element['selection']);
        }
        else {
          this.preValue[1] = element;
          this.fileSelectorString = element.text;
        }
      });
      this.setValue();
    }
  }

  setValue() {
    const value = [];
    this.preValue.forEach( (m: {}, index) => {
      if (Object.keys(m).length > 0) {
        const newValue = {
          ...m,
          formlyKey: this.key,
        }
        value.push(newValue);
      }
    });
    this.formControl.setValue(value);
  }

  receiveDataBrowse(event, bos) {
    if (event) {
      this.preValue[0] = {
        remote_name: this.filename + '.' + this.type,
        selection: event.filter.analysis_id.unary[0],
        object_type: {bos: bos},
        queryParams: this.props.queryParams,
        type: this.type,
      };
    } else {
      this.preValue[0] = {};
    }

    this.setValue();
    if (this.toInput === undefined){
      this.props.changeFunc(event, this);
    }
  }

  receiveFiles(files: {}[]) {
    if (files.length > 0) {
      this.preValue[1] = files[0];
      if ('changeFunc' in this.props)
        this.props.changeFunc(files[0], this);
    } else
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


export function AlignmentSelectorValidator(control: UntypedFormControl): ValidationErrors {
    return control.value && Array.isArray(control.value) && control.value.length !== 0 ? null :
      {alignment_validator: true};
}

export function AlignmentSelectorValidatorMessage(err, field: FormlyFieldConfig) {
  return `An alignment should be selected.`;
}

