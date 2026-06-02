import { InjectionToken } from '@angular/core';
import { CoreEnvironment } from '../interfaces/core-environment.interface';

export const CORE_ENVIRONMENT = new InjectionToken<CoreEnvironment>('core.environment');
