import {Component, Input} from '@angular/core';
import {CommonModule} from '@angular/common';
import {NzInputModule} from "ng-zorro-antd/input";
import {FormsModule, ReactiveFormsModule} from "@angular/forms";
import {BehaviorSubject, Observable} from "rxjs";

@Component({
    selector: 'app-processes-types-detail-schema-output-tab',
    imports: [
        CommonModule,
        NzInputModule,
        FormsModule
    ],
    templateUrl: './processes-types-detail-schema-output-tab.component.html',
    styleUrls: ['./processes-types-detail-schema-output-tab.component.sass']
})
export class ProcessesTypesDetailSchemaOutputTabComponent {

  @Input({required: true}) public schemaOutput: BehaviorSubject<{ value: any, isValid: boolean }>
  @Input() public isReadOnly$: Observable<boolean>;
  public inputValue: string = ''

  valueChange(event: string) {
    console.log(event)
    try {
      if (event === '') {
        this.schemaOutput.next({value: null, isValid: true})
        return
      }
      const value = JSON.parse(event)
      this.schemaOutput.next({value: value, isValid: true})
    } catch (e) {
      if (e instanceof SyntaxError) {
        this.schemaOutput.next({value: null, isValid: false})
      }
    }
  }

}
