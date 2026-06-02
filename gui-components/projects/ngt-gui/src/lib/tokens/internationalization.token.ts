import { InjectionToken } from '@angular/core';
import { InternationalizationServiceInterface } from '../interfaces/internacionalization/internationalization.interface';

export const INTERNATIONALIZATION_SERVICE = new InjectionToken<InternationalizationServiceInterface>('core.internationalization.service');
