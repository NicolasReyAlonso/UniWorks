import {Component, Inject} from '@angular/core';
import {CommonModule} from '@angular/common';
import {NzResultModule} from "ng-zorro-antd/result";
import {SharedModule} from "ngt-gui/gui";
import {AUTH_SERVICE_TOKEN, AuthServiceInterface} from "ngt-gui/core";

@Component({
    selector: 'app-home',
    imports: [
        CommonModule,
        NzResultModule,
        SharedModule,
    ],
    templateUrl: './home.component.html',
    styleUrls: ['./home.component.sass']
})
export class HomeComponent {

  constructor(
    @Inject(AUTH_SERVICE_TOKEN) public readonly authService: AuthServiceInterface,
  ) { }

}
