import {Injectable} from '@angular/core';
import {NzNotificationPlacement, NzNotificationService} from 'ng-zorro-antd/notification';
import { Inject, Optional } from '@angular/core';

// Library service
import {InternationalizationService} from "./internationalization.service";

// Tokens
import { INTERNATIONALIZATION_SERVICE } from '../tokens/internationalization.token';

// Library Interfaces
import { InternationalizationServiceInterface } from '../interfaces/internacionalization/internationalization.interface';
import { NotificationServiceInterface, TypeNotificationEnum} from '../interfaces/notification/notification.interface';



@Injectable({
  providedIn: 'root'
})
export class NotificationService implements NotificationServiceInterface {
private readonly internazionalizationService: InternationalizationServiceInterface;

  constructor(
    private readonly notification: NzNotificationService,
    @Optional() @Inject(INTERNATIONALIZATION_SERVICE) private readonly injectedInternazionalizationService: InternationalizationServiceInterface,
    private readonly defaultInternazionalizationService: InternationalizationService
  ) {
    this.internazionalizationService = injectedInternazionalizationService || defaultInternazionalizationService;
  }

  async createNotificationWithType(type: TypeNotificationEnum, title: string, content: string, placement: NzNotificationPlacement, interpolateParamsContent?: any): Promise<void> {
    title = await this.internazionalizationService.translate(title);
    content = await this.internazionalizationService.translate(content, interpolateParamsContent);
    this.notification.create(type, title, content, {
      nzPlacement: placement,
      nzAnimate: true,
      nzPauseOnHover: true,
      nzDuration: 4500,
    });
  }

  async createNotificationError(content: string, placement: NzNotificationPlacement, interpolateParamsContent?: any): Promise<void> {
    this.createNotificationWithType(TypeNotificationEnum.error, 'NOTIFICATION.ERROR_TITLE', content, placement, interpolateParamsContent).then();
  }

  async createNotificationDeleteSuccess(content: string, placement: NzNotificationPlacement, interpolateParamsContent?: any): Promise<void> {
    this.createNotificationWithType(TypeNotificationEnum.success, 'NOTIFICATION.DELETE_SUCCESS', content, placement, interpolateParamsContent).then();
  }
}
