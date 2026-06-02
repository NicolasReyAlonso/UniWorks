import { InjectionToken } from '@angular/core';
import { NotificationServiceInterface } from '../interfaces/notification/notification.interface';

export const NOTIFICATION_SERVICE = new InjectionToken<NotificationServiceInterface>('core.notification.service');