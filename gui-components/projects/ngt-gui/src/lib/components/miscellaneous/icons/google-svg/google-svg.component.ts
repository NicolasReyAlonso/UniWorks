import { Component, Input } from '@angular/core';
import {CommonModule} from "@angular/common";

@Component({
    selector: 'google-svg',
    imports: [
        CommonModule
    ],
    templateUrl: './google-svg.component.html',
    styleUrls: ['./google-svg.component.sass']
})
export class GoogleSvgComponent {

  @Input('size') size = "48px";

  constructor() { }

}
