import { InjectionToken } from '@angular/core';
import { SocketServiceInterface } from '../interfaces/socket/socketService.interface';

export const SOCKET_SERVICE = new InjectionToken<SocketServiceInterface>('core.socket.service');
