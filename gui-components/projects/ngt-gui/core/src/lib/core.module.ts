// ngt-gui/core/core.module.ts
import { NgModule } from '@angular/core';
import { AUTH_SERVICE_TOKEN } from '../tokens/auth.token';
import { AuthService } from '../core/auth.service';
import { RoutePathService } from '../core/route-path.service';
import { ROUTE_PATH_SERVICE } from '../tokens/route-path.token';
import { BackendService } from '../core/backend.service';
import { BACKEND_SERVICE } from '../tokens/backend.token';
import { MESSAGE_LOG_SERVICE } from '../tokens/message-log.token';
import { MessageLogService } from '../core/message-log.service';
import { NotificationService } from '../core/notification.service';
import { NOTIFICATION_SERVICE } from '../tokens/notification.token';
import { StateService } from '../core/state.service';
import { STATE_SERVICE } from '../tokens/state.token';
import { InternationalizationService } from '../core/internationalization.service';
import { INTERNATIONALIZATION_SERVICE } from '../tokens/internationalization.token';
import { FilesService } from '../core/files.service';
import { FILES_SERVICE_TOKEN } from '../tokens/files.token';
import { GLOBAL_SERVICE } from '../tokens/global.token';
import { GlobalService } from '../core/global.service';
import { GlobalServiceInterface } from '../interfaces/global/global.interface';
import { G } from '@angular/cdk/overlay.d-BdoMy0hX';

@NgModule({
  providers: [
    AuthService, // Agrega esto también
    { provide: AUTH_SERVICE_TOKEN, useClass: AuthService },
    RoutePathService,
    { provide: ROUTE_PATH_SERVICE, useClass: RoutePathService },
    BackendService,
    { provide: BACKEND_SERVICE, useClass: BackendService },
    MessageLogService,
    { provide: MESSAGE_LOG_SERVICE, useClass: MessageLogService },
    NotificationService,
    { provide: NOTIFICATION_SERVICE, useClass: NotificationService },
    StateService,
    { provide: STATE_SERVICE, useClass: StateService },
    InternationalizationService,
    { provide: INTERNATIONALIZATION_SERVICE, useClass: InternationalizationService },
    FilesService,
    { provide: FILES_SERVICE_TOKEN, useClass: FilesService },
    GlobalService,
    { provide: GLOBAL_SERVICE, useClass: GlobalService},

  ]
})
export class CoreModule {}