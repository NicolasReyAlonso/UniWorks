// core.module.ts
import { NgModule } from '@angular/core';
//Library TOKENS
import { AUTH_SERVICE_TOKEN } from './tokens/auth.token';
//Library Services
import { AuthService } from './core/auth.service';

@NgModule({
  providers: [
    AuthService,
    { provide: AUTH_SERVICE_TOKEN, useExisting: AuthService }
  ]
})
export class CoreModule {}
