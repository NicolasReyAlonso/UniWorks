import {NzNotificationPlacement, NzNotificationService} from 'ng-zorro-antd/notification';

export enum TypeNotificationEnum {
  success = 'success',
  info = 'info',
  warning = 'warning',
  error = 'error',
}

export interface NotificationServiceInterface {

  createNotificationWithType(type: TypeNotificationEnum, title: string, content: string, placement: NzNotificationPlacement, interpolateParamsContent?: any): Promise<void>;
  createNotificationError(content: string, placement: NzNotificationPlacement, interpolateParamsContent?: any): Promise<void>;
  createNotificationDeleteSuccess(content: string, placement: NzNotificationPlacement, interpolateParamsContent?: any): Promise<void>;
}
