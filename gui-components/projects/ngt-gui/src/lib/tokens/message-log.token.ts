import { InjectionToken } from '@angular/core';
import { MessageLogServiceInterface } from '../interfaces/message-log/message-log.interface';

export const MESSAGE_LOG_SERVICE = new InjectionToken<MessageLogServiceInterface>('core.messagelog.service');