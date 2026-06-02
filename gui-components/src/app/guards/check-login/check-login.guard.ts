import {Injectable, Inject} from '@angular/core';
import { ActivatedRouteSnapshot, RouterStateSnapshot, Router } from '@angular/router';
import {Observable, timer} from 'rxjs';
import {AUTH_SERVICE_TOKEN, AuthService, AuthServiceInterface} from "ngt-gui/core";

@Injectable({
  providedIn: 'root'
})
export class CheckLoginGuard  {

  constructor(
    @Inject(AUTH_SERVICE_TOKEN) private authService: AuthServiceInterface,
    private router: Router,
  ) {
  }

  canActivate(route: ActivatedRouteSnapshot, state: RouterStateSnapshot) {
    return new Observable<boolean>((observer) => {
      if (this.authService.user) {
        observer.next(true);
        observer.complete();
      } else {
        console.log('No authenticated user, redirecting to home.');
        this.router.navigate(['home']);
        observer.next(false);
        observer.complete();
      }
    });
  }
}
