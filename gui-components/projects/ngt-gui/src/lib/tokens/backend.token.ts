import { InjectionToken } from '@angular/core';
import { BackendService } from '../core/backend.service';
import { BackendServiceInterface } from '../interfaces/backend/backendService.interface';

export const BACKEND_SERVICE = new InjectionToken<BackendServiceInterface>('core.backend.service');
