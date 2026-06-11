import {Injectable, Inject, Optional} from '@angular/core';
import {io, Socket} from 'socket.io-client';
import {Subject} from 'rxjs';
import {NotificationService} from './notification.service';
import { TypeNotificationEnum } from '../interfaces/notification/notification.interface';

// Class interfaces
import { SocketServiceInterface } from '../interfaces/socket/socketService.interface';

// Library Services
import {GlobalService} from "./global.service";

// Library Interfaces
import { GlobalServiceInterface } from '../interfaces/global/global.interface';

// Tokens
import { GLOBAL_SERVICE } from '../tokens/global.token';




@Injectable({
  providedIn: 'root'
})
export class SocketService implements SocketServiceInterface {
  private readonly globalVariablesServices: GlobalServiceInterface;
  private socket: Socket;

  public readonly processStatusChangeSubject = new Subject<any>()

  /** Emitted when the backend signals that the navigation tree changed
   *  (e.g. a node was hot-plugged/unplugged). Consumers reload the sidebar. */
  public readonly navigationChangedSubject = new Subject<any>()

  constructor(
    @Optional() @Inject(GLOBAL_SERVICE) private readonly injectedGlobalService: GlobalServiceInterface,
    private readonly notificationService: NotificationService,
    private readonly defaultglobalVariablesServices: GlobalService
  ) { 
    this.globalVariablesServices = injectedGlobalService || defaultglobalVariablesServices;
  }

  connect() {
    if (!this.socket) {
      this.socket = io(this.globalVariablesServices.getParameter('host'), {
        withCredentials: true,
      });
      this.initEventsProccess();
    }
  }

  initEventsProccess() {
    this.socket.on('navigation_changed', (event) => {
      console.log('🔄 navigation_changed recibido:', event);
      this.navigationChangedSubject.next(event);
    });

    this.socket.on('process_status_change', (event) => {
      console.log({
        job_id: event.id,
        status: event.status,
      });
      this.processStatusChangeSubject.next(event);
      switch (event.status) {
        case "success":
          console.log("notification success");
          this.notificationService.createNotificationWithType(
            TypeNotificationEnum.success,
            `Proceso ${event.id}`,
            `El proceso con id ${event.id} se ha realizado con éxito.`,
            'bottomRight',
          );
          break;
        case "error":
          this.notificationService.createNotificationWithType(
            TypeNotificationEnum.error,
            `Proceso ${event.id}`,
            `El proceso con id ${event.id} no se ha conseguido realizar debido a un error.`,
            'bottomRight',
          );
          break;
      }
    });
  }

  disconnect() {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
    }
  }
}
