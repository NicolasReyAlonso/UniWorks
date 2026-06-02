import { Component, Input  } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
    selector: 'anonymous-svg',
    imports: [
        CommonModule
    ],
    templateUrl: './anonymous-svg.component.html',
    styleUrls: ['./anonymous-svg.component.sass']
})
export class AnonymousSvgComponent {

  @Input('size') size = "48px";
  @Input('color') color = "#000";

  constructor() { }

}
