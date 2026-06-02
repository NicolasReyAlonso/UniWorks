import { Injectable } from '@angular/core';
import { ActivatedRoute, ChildActivationEnd, NavigationEnd, Router, RouterEvent } from '@angular/router';
import { of } from 'rxjs';
import {URLBuilder} from '@wizpanda/url-builder';
import { StateService } from 'ngt-gui/core';

@Injectable({
  providedIn: 'root'
})
export class RoutePathService {
  _log: any[] = [];
  log: any = of(this._log);
  lastUrl: any;
  breadcrumbTicket = -1;
  routePathCounter = 0;

  constructor(private router: Router, private readonly route: ActivatedRoute) {
    router.events.subscribe(e => {
      if (e instanceof NavigationEnd) {
        // const URL = new URLBuilder('http://unusefulurl.com' + e.url);
        // const params = {};
        // URL.getParams().forEach( (value, key) => {
        //   params[key] = value;
        // });
        // console.log({rawUrl: e.urlAfterRedirects, url: URL.getPath(), queryParams: params});
        // this.refresh_path({rawUrl: e.urlAfterRedirects, url: URL.getPath(), queryParams: params});
      }
    });
  }

  refresh_path(routing: any) {
    if (routing.url === '/home') return;
    if (routing.url) {
      for (let i = 0; i < this._log.length; i ++){
        if (this._log[i].rawUrl === routing.rawUrl) {
          this._log.splice(i, 1);
          break;
        }
      }
      this._log.push(routing);
    }
  }

  goBack(routing) {
    this.breadcrumbTicket = this.routePathCounter + 1;
    for (let i = 0; i < this._log.length; i ++){
      if (this._log[i].rawUrl === routing.rawUrl) {
        this._log.splice(i);
        break;
      }
    }
  }

  getCurrentPath() {
    return this._log[this._log.length - 1];
  }

  getPreviousPath() {
    return this._log[this._log.length - 2];
  }


}
