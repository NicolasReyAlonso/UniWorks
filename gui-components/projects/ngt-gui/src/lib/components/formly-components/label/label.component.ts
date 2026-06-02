import { Component, OnInit } from '@angular/core';
import { FieldType } from '@ngx-formly/core';

@Component({
    selector: 'app-label',
    templateUrl: './label.component.html',
    styleUrls: ['./label.component.sass'],
    standalone: false
})
export class LabelComponent extends FieldType implements OnInit {

  ngOnInit(): void {
    console.log(this.to);
  }

}
