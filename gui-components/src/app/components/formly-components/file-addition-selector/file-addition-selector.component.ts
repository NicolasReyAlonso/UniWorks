import {AfterViewInit, ChangeDetectorRef, Component} from '@angular/core';
import {FieldType, FormlyFieldConfig} from "@ngx-formly/core";
import {UntypedFormControl, ValidationErrors} from "@angular/forms";

@Component({
    selector: 'app-file-addition-selector',
    templateUrl: './file-addition-selector.component.html',
    styleUrls: ['./file-addition-selector.component.sass'],
    standalone: false
})
export class FileAdditionSelectorComponent extends FieldType implements AfterViewInit {

  filesInput = [];

  ngAfterViewInit() {
    if (this.formControl.value && Object.keys(this.formControl.value).length !== 0) {
      this.filesInput = this.formControl.value;
    }
  }

  setValue(files: {}[]) {
    let basename: string;
    let extension: string;
    if (this.props.suffix) {
      for (let i = 0; i < files.length; i++) {
        basename = files[i]['remote_name'].split('.')[0];
        extension = files[i]['remote_name'].split('.')[1];
        if (basename.includes(this.props.suffix)) {
          basename = basename.split(`_${this.props.suffix}`)[0];//delete number
        }
        files[i]['remote_name'] = `${basename}_${this.props.suffix}${i}.${extension}`;
      }
    }
    this.formControl.setValue([...files]);
  }
}

export function FileAdditionSelectorValidator(control: UntypedFormControl): ValidationErrors {
    return control.value && Array.isArray(control.value) && control.value.length !== 0 ? null :
      {file_addition_selector: true};
}

export function FileAdditionSelectorValidatorMessage(err, field: FormlyFieldConfig) {
  return `A file should be added.`;
}

