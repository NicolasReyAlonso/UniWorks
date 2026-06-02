import { Inject, Injectable } from '@angular/core';
import { ActivatedRouteSnapshot, RouterStateSnapshot, UrlTree, Router } from '@angular/router';
import { Observable } from 'rxjs';
import { RoutePathServiceInterface } from '../../interfaces/route/route-path.interface';
import { ROUTE_PATH_SERVICE } from '../../tokens/route-path.token';
import { AuthServiceInterface } from '../../interfaces/auth/authService.interface';

@Injectable({
  providedIn: 'root'
})
export class CheckProcedenceGuard  {

  PROCESS_DETAIL_COMPONENT = 'ProcessDetailComponent';

  constructor(
    @Inject(ROUTE_PATH_SERVICE) private routePathService: RoutePathServiceInterface,
    private router: Router) { }

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
