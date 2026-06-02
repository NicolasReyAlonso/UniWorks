// panel-wrapper.component.ts
import {Component, OnInit} from '@angular/core';
import { FieldWrapper } from '@ngx-formly/core';

@Component({
    selector: 'app-data-wrapper',
    templateUrl: './data-wrapper.component.html',
    styleUrls: ['./data-wrapper.component.sass'],
    standalone: false
})
export class DataWrapperComponent extends FieldWrapper implements OnInit{
  ngOnInit(): void {
    console.log(this.fieldComponent);
  }


}
