import { Injectable, Inject} from '@angular/core';
import { ActivatedRouteSnapshot, RouterStateSnapshot, UrlTree, Router } from '@angular/router';
import { Observable } from 'rxjs';
import { map, filter } from 'rxjs/operators';
import {BackendService} from '../../core/backend.service';
import { AuthServiceInterface} from "../../interfaces/auth/authService.interface";
import { AUTH_SERVICE_TOKEN } from '../../tokens/auth.token';
import { B } from '@angular/cdk/bidi-module.d-D-fEBKdS';
import { BACKEND_SERVICE } from '../../tokens/backend.token';
import { BackendServiceInterface } from '../../interfaces/backend/backendService.interface';

@Injectable({
  providedIn: 'root'
})
export class CheckRoleGuard  {
  constructor(
    @Inject(AUTH_SERVICE_TOKEN) private authService: AuthServiceInterface,
    @Inject(BACKEND_SERVICE) private backendService: BackendServiceInterface, 
    private router: Router
  ) {}

  canActivate(
    route: ActivatedRouteSnapshot,
    state: RouterStateSnapshot
  ): Observable<boolean> {
    console.log('🔐 CheckRoleGuard: Verificando rol...');
    
    // Esperar a que la autenticación esté lista
    return this.authService.authInit$.pipe(
      filter(authInit => authInit === true),
      map(() => {
        if (!this.authService.isAuthenticated) {
          console.log('❌ Usuario no autenticado');
          return false;
        }
        
        const userId = this.authService.currentUserId;
        const role = this.backendService.getUserRole(userId);
        const checked = role === route.data.role;
        
        console.log(checked ? '✅ Rol verificado' : '❌ Rol no coincide');
        return checked;
      })
    );
  }
}