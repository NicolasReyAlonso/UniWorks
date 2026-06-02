import { InjectionToken } from '@angular/core';
import { StateServiceInterface } from '../interfaces/state/state.interface';

export const STATE_SERVICE = new InjectionToken<StateServiceInterface>('core.state.service');
