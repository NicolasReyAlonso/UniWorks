import { Component, OnInit } from '@angular/core';
import {FieldType} from '@ngx-formly/core';

@Component({
    selector: 'app-annotation-text-field-read',
    templateUrl: './annotation-text-field-read.component.html',
    styleUrls: ['./annotation-text-field-read.component.sass'],
    standalone: false
})
export class AnnotationTextFieldReadComponent extends FieldType implements OnInit {

  ngOnInit(): void {
  }

}
