import { Injectable } from '@angular/core';
import { ActivatedRouteSnapshot, RouterStateSnapshot, UrlTree, Router } from '@angular/router';
import { Observable } from 'rxjs';
import { RoutePathService } from 'ngt-gui/core';

@Injectable({
  providedIn: 'root'
})
export class CheckProcedenceGuard  {

  PROCESS_DETAIL_COMPONENT = 'ProcessDetailComponent';

  constructor(private routePathService: RoutePathService, private router: Router) { }

  canActivate(
    route: ActivatedRouteSnapshot,
    state: RouterStateSnapshot): Observable<boolean | UrlTree> | Promise<boolean | UrlTree> | boolean | UrlTree {


    let checked = false;
    if (route.routeConfig.component.name === this.PROCESS_DETAIL_COMPONENT) {
      checked = this.checkProcessDetailProcedence(this.routePathService.getCurrentPath());
    }
    if (!checked) {
      this.router.navigate(['']);
    }
    return checked;
  }

  checkProcessDetailProcedence(prevPath: any): boolean {
    let checked = false;
    if (prevPath) {
      checked = prevPath.url === '/process/processesBrowse' || prevPath.url === '/process/processSetup';
    }
    return checked;
  }
}
