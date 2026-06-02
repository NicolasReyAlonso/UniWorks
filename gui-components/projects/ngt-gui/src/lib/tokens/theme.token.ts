import { InjectionToken } from '@angular/core';
import { ThemeServiceInterface } from '../interfaces/theme/theme.interface';

export const THEME_SERVICE = new InjectionToken<ThemeServiceInterface>('core.theme.service');
