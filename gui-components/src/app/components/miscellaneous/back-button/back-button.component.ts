import { Component, Input, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { RoutePathService } from '@services/route-path.service';
import { CommonModule } from '@angular/common';
import {NzIconModule} from "ng-zorro-antd/icon";

@Component({
    selector: 'app-back-button',
    imports: [
        CommonModule,
        NzIconModule,
    ],
    templateUrl: './back-button.component.html',
    styleUrls: ['./back-button.component.sass']
})
export class BackButtonComponent implements OnInit {

  @Input() style;

  constructor(
    public readonly routePath: RoutePathService,
    private readonly router: Router,
    ) { }

  ngOnInit(): void {

  }

  backPage() {
    const previousPath = this.routePath.getPreviousPath();
    this.routePath.goBack(previousPath);
    this.router.navigateByUrl(previousPath.rawUrl);
  }

}
