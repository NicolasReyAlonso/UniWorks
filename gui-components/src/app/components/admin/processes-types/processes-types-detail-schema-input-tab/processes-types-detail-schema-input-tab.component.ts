import {Component, Input} from '@angular/core';
import { CommonModule } from '@angular/common';
import { NzInputModule } from "ng-zorro-antd/input";
import {BehaviorSubject, Observable} from "rxjs";
import {FormsModule} from "@angular/forms";

@Component({
    selector: 'app-processes-types-detail-schema-input-tab',
    imports: [
        CommonModule,
        NzInputModule,
        FormsModule
    ],
    templateUrl: './processes-types-detail-schema-input-tab.component.html',
    styleUrls: ['./processes-types-detail-schema-input-tab.component.sass']
})
export class ProcessesTypesDetailSchemaInputTabComponent {

  @Input({required: true}) public schemaInput: BehaviorSubject<{ value: any, isValid: boolean }>
  @Input() public isReadOnly$: Observable<boolean>;
  public inputValue: string = ''

  valueChange(event: string) {
    try {
      if (event === '') {
        this.schemaInput.next({value: null, isValid: true})
        return
      }
      const value = JSON.parse(event)
      this.schemaInput.next({value: value, isValid: true})
    } catch (e) {
      if (e instanceof SyntaxError) {
        this.schemaInput.next({value: null, isValid: false})
      }
    }
  }

}
