import { Injectable } from '@angular/core';
import { ActivatedRouteSnapshot, RouterStateSnapshot, UrlTree, Router } from '@angular/router';
import { Observable } from 'rxjs';
import {BackendService} from 'ngt-gui/core';
import {AuthService} from "ngt-gui/core";

@Injectable({
  providedIn: 'root'
})
export class CheckRoleGuard  {

  constructor(private backendService: BackendService, private authService: AuthService, private router: Router) {}

  canActivate(
    route: ActivatedRouteSnapshot,
    state: RouterStateSnapshot): Observable<boolean | UrlTree> | Promise<boolean | UrlTree> | boolean | UrlTree {
    console.log(route.url);
    return this.checkRole(route);
  }

  checkRole(route: ActivatedRouteSnapshot): boolean {
    let checked = false;
    if (this.authService.isAuthenticated) {
      const userId = this.authService.currentUserId;
      const role = this.backendService.getUserRole(userId);
      if (role === route.data.role) {
        checked = true;
      }
    }

    /*if (!checked) {
      this.router.navigate(['no-role']);
    }*/
    return checked;
  }
}
