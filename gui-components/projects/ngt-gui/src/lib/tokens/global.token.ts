import { InjectionToken } from '@angular/core';
import { GlobalServiceInterface } from '../interfaces/global/global.interface';

export const GLOBAL_SERVICE = new InjectionToken<GlobalServiceInterface>('core.global.service');
