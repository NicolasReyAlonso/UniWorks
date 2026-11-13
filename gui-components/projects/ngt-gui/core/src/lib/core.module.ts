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

/**
 * Registers the core services and their injection tokens.
 *
 * Each token is an ALIAS of its service (`useExisting`), never a second copy
 * (`useClass`): code that asks for `AUTH_SERVICE_TOKEN` and code that asks for
 * `AuthService` must talk to the same object, or a login seen by one is
 * invisible to the other. For the same reason, register this module ONCE, at
 * application level (`importProvidersFrom(CoreModule)`), and do not list it in
 * the `imports` of standalone components: Angular would give that component
 * tree its own private set of services.
 */
@NgModule({
  providers: [
    AuthService, // Agrega esto también
    { provide: AUTH_SERVICE_TOKEN, useExisting: AuthService },
    RoutePathService,
    { provide: ROUTE_PATH_SERVICE, useExisting: RoutePathService },
    BackendService,
    { provide: BACKEND_SERVICE, useExisting: BackendService },
    MessageLogService,
    { provide: MESSAGE_LOG_SERVICE, useExisting: MessageLogService },
    NotificationService,
    { provide: NOTIFICATION_SERVICE, useExisting: NotificationService },
    StateService,
    { provide: STATE_SERVICE, useExisting: StateService },
    InternationalizationService,
    { provide: INTERNATIONALIZATION_SERVICE, useExisting: InternationalizationService },
    FilesService,
    { provide: FILES_SERVICE_TOKEN, useExisting: FilesService },
    GlobalService,
    { provide: GLOBAL_SERVICE, useExisting: GlobalService },

  ]
})
export class CoreModule {}