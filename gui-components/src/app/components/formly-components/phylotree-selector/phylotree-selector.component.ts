// panel-wrapper.component.ts
import {AfterViewInit, Component, OnInit, ViewChild} from '@angular/core';
import {FieldType, FormlyFieldConfig} from '@ngx-formly/core';
import {UntypedFormControl, ValidationErrors} from '@angular/forms';
import {DynamicBrowseComponent} from 'src/app/components/dynamics/dynamic-browse/dynamic-browse.component';

@Component({
    selector: 'app-sequence-selector',
    templateUrl: './phylotree-selector.component.html',
    standalone: false
})
export class PhylotreeSelectorComponent extends FieldType implements OnInit, AfterViewInit {

  preValue: any[] = [{}, {}]; // tree, file
  type: string;
  filename: string;
  uploaderHeader: string;
  nexusString = "";
  @ViewChild('phylotreeDynamicBrowser') phylotreeDynamicBrowser: DynamicBrowseComponent;
  filesNexus = [];

  ngOnInit(): void {
    this.type = this.props.extension;
    this.filename = this.props.filename;
    this.uploaderHeader = `${this.type.toUpperCase()} file with alignment uploader`
  }

  ngAfterViewInit() {
    if (this.formControl.value && Object.keys(this.formControl.value).length !== 0) {
      this.formControl.value.forEach(element => {
        if (element.inputType === 'selector') {
          this.preValue[0] = element;
          const checkedItems = this.phylotreeDynamicBrowser.dynamicTable.checkedItems;
          checkedItems.add(this.preValue[element.index].selection);
        }
        else {
          this.preValue[1] = element;
          this.nexusString = element.text;
        }
      });
      this.setValue();
    }
  }

  setValue() {
    const value = [];
    this.preValue.forEach((m: {}, index) => {
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

  receivePhyloTreeBrowse(event) {
    if (event) {
      this.preValue[0] = {
        remote_name: this.filename + '.' + this.type,
        selection: event.filter.analysis_id.unary[0],
        object_type: {bos: 'phylotrees'},
        queryParams: '',
        type: this.type,
        inputType: 'selector'
      };
    } else {
      this.preValue[0] = {};
    }

    this.setValue();
  }

  receiveFiles(files: {}[]) {
    if (files.length > 0)
      this.preValue[1] = files[0];
    else
      this.preValue[1] = {};

    this.setValue();
  }

  protected readonly Object = Object;
}


export function PhylotreeSelectorValidator(control: UntypedFormControl): ValidationErrors {
  return control.value && Array.isArray(control.value) && control.value.length !== 0 ? null :
    {phylotree_validator: true};
}

export function PhylotreeSelectorValidatorMessage(err, field: FormlyFieldConfig) {
  return `A Phylogenetic Tree should be selected.`;
}

