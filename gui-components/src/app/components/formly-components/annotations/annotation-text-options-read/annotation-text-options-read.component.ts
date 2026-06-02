import { Component, OnInit } from '@angular/core';
import { FieldType } from '@ngx-formly/core';

@Component({
    selector: 'app-annotation-text-options-read',
    templateUrl: './annotation-text-options-read.component.html',
    styleUrls: ['./annotation-text-options-read.component.sass'],
    standalone: false
})
export class AnnotationTextOptionsReadComponent extends FieldType implements OnInit {

  ngOnInit(): void {
  }

}
