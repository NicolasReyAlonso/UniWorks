import { InjectionToken } from '@angular/core';
import { RoutePathServiceInterface } from '../interfaces/route/route-path.interface';

export const ROUTE_PATH_SERVICE = new InjectionToken<RoutePathServiceInterface>('core.routepath.service');
