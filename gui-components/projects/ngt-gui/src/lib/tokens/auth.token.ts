import { InjectionToken } from '@angular/core';
import { AuthServiceInterface } from '../interfaces/auth/authService.interface';

export const AUTH_SERVICE_TOKEN = new InjectionToken<AuthServiceInterface>('core.auth.service');
