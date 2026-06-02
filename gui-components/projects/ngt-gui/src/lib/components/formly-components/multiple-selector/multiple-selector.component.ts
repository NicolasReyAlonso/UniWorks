// panel-wrapper.component.ts
import {AfterViewInit, Component, OnInit, ViewChildren} from '@angular/core';
import {FieldType, FormlyFieldConfig} from '@ngx-formly/core';
import {UntypedFormControl, ValidationErrors} from '@angular/forms';

@Component({
    selector: 'app-multiple-selector',
    templateUrl: './multiple-selector.component.html',
    styleUrls: ['./multiple-selector.component.sass'],
    standalone: false
})
export class MultipleSelectorComponent extends FieldType implements OnInit, AfterViewInit {

  collapsePanelActiveDynamicBrowser: boolean[] = [];
  updateDataFirstTime = true;
  collapsePanelDisable = true;

  i = 0;
  value: any[] = [];
  uploaderHeader: string;
  readonly inputFiles = [];
  //radioValue = null;
  baseFileName: string;
  @ViewChildren('alignmentDynamicBrowser') alignmentDynamicBrowsers: any;

  ngOnInit(): void {
    this.baseFileName = this.props.bos + '_';
    this.uploaderHeader = `${this.props.extension.toUpperCase()} file with alignment uploader`
  }

  ngAfterViewInit(): void {
    if (this.formControl.value && this.formControl.value.length !== 0) {
      let index;
      let dynamicBrowser;
      let checkedItems
      for (let v of this.formControl.value) {
        if ('bos' in v.object_type ) {
          index = v.remote_name.replace(/\D/g,'') - 1;
          dynamicBrowser = this.alignmentDynamicBrowsers.get(index)
          if (dynamicBrowser) {
            checkedItems = dynamicBrowser.dynamicTable.checkedItems;
            checkedItems.add(v['selection']);
          }
        }
        else {
          this.inputFiles.push([v]);
        }
        this.collapsePanelActiveDynamicBrowser.push(false);
        this.value.push(v);
      }
      this.i = this.value.length;
      this.setValue();
    }
    else {
      this.value.push({});
      this.inputFiles.push([]);
      this.collapsePanelActiveDynamicBrowser.push(false);
      this.value[0].remote_name = this.baseFileName + '1.' + this.props.extension;
      this.i = 1
    }
  }

  insertSelector(): void {
    this.value.push({});
    this.inputFiles.push([]);
    this.i += 1;
  }

  executeChangeFunction(v) {
    if ('object_type' in v && 'filesAPI' in v['object_type']) {
      this.props.changeFunc(v, this);
    } else {
      this.props.changeFunc({filter: {analysis_id: {op: 'in', unary: [v.selection]}}}, this);
    }
  }

  removeValue(index) {
    if (this.value.length <= 1) {
      return;
    }
    this.value.splice(index, 1);
    this.inputFiles.splice(index, 1);
    this.i--;
    this.setValue();
  }

  setValue() {
    this.formControl.setValue(this.value);
    if (this.value.length === 1)
      this.executeChangeFunction(this.value[0]);
  }

  receiveAlignmentBrowse(index: number, event) {
    if (event != null) {
      this.value[index] = {
        queryParams: this.props.queryParams,
        type: this.props.extension,
        object_type: {bos: this.props.bos},
        remote_name: this.baseFileName + index.toString() + '.' + this.props.extension
      }
      this.value[index].selection = event.filter.analysis_id.unary[0];
    } else {
      this.value[index] = {};
    }
    this.setValue();
  }

  radioValueChange(index: number, event: string) {
    this.value[index].region = event;
    this.setValue();
  }

  updateDataEventDynamicBrowser(event: {type: string, data: null}, index: number) {
    switch (event.type) {
      case 'startUpdate':
        this.collapsePanelActiveDynamicBrowser[index] = false;
        break;
      case 'endUpdate':
        if (this.updateDataFirstTime) {
          this.updateDataFirstTime = false;
          this.collapsePanelDisable = false;
        } /*else {
          this.collapsePanelActiveDynamicBrowser[index] = true;
        }*/
        break;
    }
  }

  receiveFiles(files: {}[], j: number) {
    if (files.length > 0) {
      this.value[j] = files[0];
      this.value[j].remote_name = this.baseFileName + j.toString() + '.' + this.props.extension;
    }
    else {
      this.value[j] = {}
    }
    this.setValue();
  }

  protected readonly Object = Object;
}

export function MultipleSelectorValidator(control: UntypedFormControl): ValidationErrors {
  if (!control.value || control.value.length === 0) {
    return {multiple_validator: true};
  }
  for (let value of control.value) {
    if (!value.region) {
      return {multiple_validator: true};
    }
    if (Object.keys(value).length === 0) {
      return {multiple_validator: true};
    }
  }
}

export function MultipleSelectorValidatorMessage(err, field: FormlyFieldConfig) {
  return `All selectors must be correctly confirmed and a region should be selected.`;
}
