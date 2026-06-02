import {Injectable, Inject} from '@angular/core';
import { ActivatedRouteSnapshot, RouterStateSnapshot, Router } from '@angular/router';
import {Observable} from 'rxjs';
import {map, filter, tap} from 'rxjs/operators';
import {AUTH_SERVICE_TOKEN} from "../../tokens/auth.token";
import {AuthServiceInterface} from "../../interfaces/auth/authService.interface";

@Injectable({
  providedIn: 'root'
})
export class CheckLoginGuard {
  constructor(
    @Inject(AUTH_SERVICE_TOKEN) private authService: AuthServiceInterface,
    private router: Router,
  ) {}

  canActivate(route: ActivatedRouteSnapshot, state: RouterStateSnapshot): Observable<boolean> {
    console.log('🔒 CheckLoginGuard ejecutándose...');
    
    return this.authService.authInit$.pipe(
      filter(authInit => authInit === true),
      map(() => this.authService.user), // Obtener el usuario actual
      tap(user => console.log('👤 Usuario en CheckLoginGuard:', user)),
      map(user => {
        if (user) {
          console.log('✅ Usuario autenticado, permitir acceso');
          return true;
        } else {
          console.log('❌ No autenticado, redirigir a home');
          this.router.navigate(['home']);
          return false;
        }
      })
    );
  }
}