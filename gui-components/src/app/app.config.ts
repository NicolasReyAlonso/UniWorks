import {
  ApplicationConfig,
  importProvidersFrom,
  inject,
  isDevMode,
  LOCALE_ID,
  provideAppInitializer
} from "@angular/core";
import {HttpClient, provideHttpClient, withFetch, withInterceptorsFromDi} from "@angular/common/http";
import {ThemeService, ThemeType} from "@services/theme.service";
import {AuthService, AuthServiceInterface} from "ngt-gui/core";
import {AngularFireAuth} from "@angular/fire/compat/auth";
import {provideRouter, RouterFeatures, withHashLocation} from "@angular/router";
import {routes} from "./app.routes";
import {AngularFireModule} from "@angular/fire/compat";
import {environment} from "@environments/environment";
import {provideTranslateService, TranslateLoader} from "@ngx-translate/core";
import {TranslateHttpLoader} from "@ngx-translate/http-loader";
import {registerLocaleData} from "@angular/common";
import * as firebase from "firebase/app";
import localePy from '@angular/common/locales/es-PY';
import {provideAnimations} from "@angular/platform-browser/animations";
import {NzModalModule} from "ng-zorro-antd/modal";
import {FormlyComponentsModule} from "@components/formly-components/formly-components.module";
import { CORE_ENVIRONMENT, GLOBAL_SERVICE } from "ngt-gui/core";
// EntityClient/DynamicForm viven en el entry main de ngt-gui, que tiene su PROPIO
// token CORE_ENVIRONMENT (instancia distinta a la de ngt-gui/core). Lo proveemos
// también con el mismo environment para que su GlobalService se construya.
import {
  CORE_ENVIRONMENT as CORE_ENVIRONMENT_ENTITY,
  GLOBAL_SERVICE as GLOBAL_SERVICE_ENTITY,
} from "ngt-gui";
import { SIDEBAR_YAML_PATH } from "ngt-gui/gui"
import { AUTH_SERVICE_TOKEN } from "ngt-gui/core";
import { CoreModule } from "ngt-gui/core";

registerLocaleData(localePy, 'es');

// Firebase is optional. When no web config is provided we still initialise with a
// harmless placeholder so the application boots and the (server-gated) Basic
// username/password provider can be used. Whether Firebase login options are
// actually shown is decided by the backend's /authn/providers discovery, not here.
const firebaseConfig = (environment as any).firebase_config || {
  apiKey: 'demo-firebase-disabled',
  authDomain: 'demo.local',
  projectId: 'demo',
  appId: 'demo',
};
firebase.initializeApp(firebaseConfig);

const routerFeatures: RouterFeatures[] = isDevMode() ? [withHashLocation()] : []

export const appConfig: ApplicationConfig = {
  providers: [
    provideHttpClient(withInterceptorsFromDi(), withFetch()),
    {provide: LOCALE_ID, useValue: 'es-ES'},
    { provide: CORE_ENVIRONMENT, useValue: environment },
    { provide: CORE_ENVIRONMENT_ENTITY, useValue: environment },
    // El GlobalService de main no recibe authOptions (las credenciales las pone
    // AuthService en el GlobalService de core). Apuntamos el GLOBAL_SERVICE de main
    // al de core para que EntityClient use sus authOptions y no dé 401.
    { provide: GLOBAL_SERVICE_ENTITY, useExisting: GLOBAL_SERVICE },
    { provide: SIDEBAR_YAML_PATH, useValue: 'assets/config/DemoFinal.yaml' },
    
    provideAppInitializer(() => {
      const themeService = inject(ThemeService);
    

        return themeService.loadTheme(ThemeType.themeCyan);
      
    }),
    
    provideAppInitializer(() => {
      const authService = inject(AUTH_SERVICE_TOKEN) as AuthServiceInterface;
      const angularFireAuth = inject(AngularFireAuth);
      
      
        console.log('🚀 APP_INITIALIZER: Inicializando AuthService...');
        return authService.load(angularFireAuth).then(() => {
          console.log('✅ APP_INITIALIZER: AuthService inicializado completamente');
      });
    }),
    
    provideRouter(routes, ...routerFeatures),
    importProvidersFrom(
      AngularFireModule.initializeApp(firebaseConfig),
      NzModalModule,
      FormlyComponentsModule,
      CoreModule
    ),
    provideTranslateService({
      loader: {
        provide: TranslateLoader,
        useFactory: HttpLoaderFactory,
        deps: [HttpClient],
      }
    }),
    provideAnimations()
  ]
};

function HttpLoaderFactory(httpClient: HttpClient) {
  return new TranslateHttpLoader(httpClient, './assets/i18n/', '.json');
}