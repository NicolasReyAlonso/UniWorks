import {Injectable} from '@angular/core';
import { ActivatedRouteSnapshot, Resolve} from '@angular/router';
import { Observable, of} from 'rxjs';
import {catchError} from 'rxjs/operators';
import {AuthService} from "ngt-gui/core";
import {BackendService} from 'ngt-gui/core';
@Injectable()
export class AuthResolver implements Resolve<any> {

  constructor(private backendService: BackendService, private authService: AuthService) { }

  resolve(route: ActivatedRouteSnapshot): Observable<any> {
    console.log('Auth Resolver');
    console.log(this.authService.isAuthenticated);
    return this.backendService.putSession().pipe(
        catchError( err => {
          console.log('Authentication API Error: ');
          console.log(err);
          alert('Algo ha fallado');
          return of(err);
        }
      ));
  }
}
