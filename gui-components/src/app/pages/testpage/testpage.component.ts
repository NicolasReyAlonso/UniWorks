import { Component } from '@angular/core';
import { SharedModule } from 'ngt-gui/gui';
import { CommonModule } from '@angular/common';
import { NzResultModule } from "ng-zorro-antd/result";

@Component({
  selector: 'app-testpage',
  imports: [
    CommonModule,
    NzResultModule,
    SharedModule,
  ],
  templateUrl: './testpage.component.html',
  styleUrl: './testpage.component.sass'
})
export class TestpageComponent {

}
