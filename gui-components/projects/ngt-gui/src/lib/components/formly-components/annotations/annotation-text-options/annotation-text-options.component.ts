import { Component, OnInit } from '@angular/core';
import { FieldType } from '@ngx-formly/core';

@Component({
    selector: 'app-annotation-text-options',
    templateUrl: './annotation-text-options.component.html',
    styleUrls: ['./annotation-text-options.component.sass'],
    standalone: false
})
export class AnnotationTextOptionsComponent extends FieldType implements OnInit {

  ngOnInit(): void {
  }

}
