import {EventEmitter, Injectable, Inject, Optional} from '@angular/core';

// Class Interfaces
import { StateServiceInterface } from '../interfaces/state/state.interface';

// Library Services
import {RoutePathService} from "./route-path.service";
import {BackendService} from './backend.service';
import {InternationalizationService} from "./internationalization.service";
import {ThemeService} from './theme.service';

// Library interfaces
import { RoutePathServiceInterface } from '../interfaces/route/route-path.interface';
import { BackendServiceInterface } from '../interfaces/backend/backendService.interface';
import { InternationalizationServiceInterface } from '../interfaces/internacionalization/internationalization.interface';
import { ThemeServiceInterface } from '../interfaces/theme/theme.interface';

// Tokens
import { BACKEND_SERVICE } from '../tokens/backend.token'
import { ROUTE_PATH_SERVICE } from '../tokens/route-path.token'
import { INTERNATIONALIZATION_SERVICE } from '../tokens/internationalization.token';
import { THEME_SERVICE } from '../tokens/theme.token';

@Injectable({
  providedIn: 'root'
})
export class StateService implements StateServiceInterface {

  // View states
  states: any = {};
  currentUrl: string = "";

  stateServiceEvent = new EventEmitter<{ type: string, event: any }>();

  // Optionals
    private backendService: BackendServiceInterface;
    private readonly themeService: ThemeServiceInterface;
    private readonly internationalizationService: InternationalizationServiceInterface;
    private readonly routePathService: RoutePathServiceInterface;

  constructor(
    @Optional() @Inject(BACKEND_SERVICE) private injectedBackendService: BackendServiceInterface,
    @Optional() @Inject(THEME_SERVICE) private readonly injectedThemeService: ThemeServiceInterface,
    @Optional() @Inject(INTERNATIONALIZATION_SERVICE) private readonly injectedInternationalizationService: InternationalizationServiceInterface,
    @Optional() @Inject(ROUTE_PATH_SERVICE) private readonly injectedRoutePathService: RoutePathServiceInterface,
    private defaultBackendService: BackendService,
    private readonly defaultThemeService: ThemeService,
    private readonly defaultInternationalizationService: InternationalizationService,
    private readonly defaultRoutePathService: RoutePathService,
  ) {
    this.backendService = injectedBackendService || defaultBackendService;
    this. themeService = injectedThemeService || defaultThemeService;
    this. internationalizationService = injectedInternationalizationService || defaultInternationalizationService;
    this.routePathService = injectedRoutePathService || defaultRoutePathService;
  }

  changeCurrentUrlForState(): string {
    const searchRegExp = /\//g;
    return this.currentUrl.replace(searchRegExp, '$');
  }

  async getStateCurrenView(): Promise<any> {
    const identityStoreUrl = this.changeCurrentUrlForState();
    if (!this.states[identityStoreUrl]) {
      try {
        const response: any = await this.backendService.getIdentityStore(identityStoreUrl).toPromise();
        const content = response.content;
        return content ? content : null;
      } catch (e) {
        return null;
      }
    }
    return this.states[identityStoreUrl];
  }


  async getStateCurrenViewWithoutBackend(): Promise<any> {
    const identityStoreUrl = this.changeCurrentUrlForState();
    return this.states[identityStoreUrl];
  }

  async setStateCurrentView(value): Promise<void> {
    const identityStoreUrl = this.changeCurrentUrlForState();
    this.states[identityStoreUrl] = value;
    await this.backendService.putIdentityStore(identityStoreUrl, value).toPromise();
  }

  async setStateCurrentViewWithoutBackend(value): Promise<void> {
    const identityStoreUrl = this.changeCurrentUrlForState();
    this.states[identityStoreUrl] = value;
  }

  isFromBreadcrumb(): boolean {
    return this.routePathService.routePathCounter === this.routePathService.breadcrumbTicket;
  }

  getState(key): any {
    return this.states[key];
  }

  async setState(key, value, notUpdateBackend?): Promise<void> {
    this.states[key] = value;
    this.stateServiceEvent.emit({
      type: key,
      event: value,
    });
    if (!notUpdateBackend) {
      await this.backendService.putIdentityStore(key, value).toPromise();
    }
  }

  getCurrentViewUrl(): string {
    return this.currentUrl;
  }

  async loadGlobalService(): Promise<void> {
    try {
      const cfgResponse: any = await this.backendService.getIdentityStore('cfg').toPromise();
      const cfg = cfgResponse.content;
      if (cfg.theme) {
        this.themeService.loadTheme(cfg.theme);
      }
      if (cfg.language) {
        this.internationalizationService.changeCurrentLanguage(cfg.language);
      }
      this.setState('cfg', cfg, true);
    } catch (e) {

    }

    try {
      const gblResponse: any = await this.backendService.getIdentityStore('gbl_cs').toPromise();
      const gbl_cs = gblResponse.content;
      if (gbl_cs) {
        await this.setState('gbl_cs', gbl_cs, true);
      }
    } catch (e) {

    }
  }
}
