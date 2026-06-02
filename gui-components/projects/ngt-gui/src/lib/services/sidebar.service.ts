import { EventEmitter, Inject, Injectable, Optional } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import * as yaml from 'js-yaml';
import { firstValueFrom } from 'rxjs';

//Library Services
import { AuthServiceInterface } from 'ngt-gui/core';
import { BackendServiceInterface, BACKEND_SERVICE } from 'ngt-gui/core';

//Library interfaces
import { SidebarItem } from '../interfaces/sidebar-item.interface';
import { NavigationResponse, NavigationMenuItem } from '../interfaces/navigation.interface';

//Library tokens
import { SIDEBAR_YAML_PATH } from '../tokens/sidebar-config.token';
import { AUTH_SERVICE_TOKEN } from "ngt-gui/core";

@Injectable({
  providedIn: 'root'
})
export class SidebarService {
  sidebarEventEmitter = new EventEmitter<{ type: string, value: any }>();
  private defaultYamlPath = '../submenu.yaml';

  /** Cached navigation response from the backend */
  private _navigation: NavigationResponse | null = null;

  constructor(
    private http: HttpClient,
    @Inject(AUTH_SERVICE_TOKEN) private authService: AuthServiceInterface,
    @Inject(BACKEND_SERVICE) private backendService: BackendServiceInterface,
    @Optional() @Inject(SIDEBAR_YAML_PATH) private yamlPath: string,
  ) {}

  // ------------------------------------------------------------------
  // Dynamic navigation from the backend
  // ------------------------------------------------------------------

  /**
   * Load the full navigation tree from the backend.
   * The backend filters items by the current user's permissions so the
   * frontend does not need to duplicate any ACL logic.
   */
  async loadNavigation(appFlavor?: string): Promise<NavigationResponse> {
    const base = (this.backendService as any).base_url;
    let url = `${base}/gui/navigation`;
    if (appFlavor) {
      url += `?app_flavor=${encodeURIComponent(appFlavor)}`;
    }

    try {
      const resp: any = await firstValueFrom(
        this.http.get(url, (this.backendService as any).globalVariablesService?.authOptions ?? {})
      );
      this._navigation = resp.content as NavigationResponse;
      return this._navigation;
    } catch (error) {
      console.warn('⚠️ SidebarService: Could not load navigation from backend, falling back to YAML', error);
      // Fallback: convert YAML to NavigationResponse shape
      return this._fallbackToYaml();
    }
  }

  /**
   * Convert the backend navigation tree into the legacy SidebarItem format
   * so that the existing SidebarComponent can consume it with minimal changes.
   */
  async loadSidebarFromBackend(appFlavor?: string): Promise<SidebarItem> {
    const nav = await this.loadNavigation(appFlavor);
    return this._navigationToSidebarItem(nav);
  }

  /**
   * Returns the raw menu tree (not the legacy format).
   */
  get navigation(): NavigationResponse | null {
    return this._navigation;
  }

  /**
   * Load a screen definition by screen id.
   */
  async loadScreenDefinition(screenId: number): Promise<any> {
    const base = (this.backendService as any).base_url;
    const url = `${base}/gui/screens/${screenId}`;
    const resp: any = await firstValueFrom(
      this.http.get(url, (this.backendService as any).globalVariablesService?.authOptions ?? {})
    );
    return resp.content;
  }

  /**
   * Load a screen definition by name.
   */
  async loadScreenByName(screenName: string): Promise<any> {
    const base = (this.backendService as any).base_url;
    const url = `${base}/gui/screens/by-name/${encodeURIComponent(screenName)}`;
    const resp: any = await firstValueFrom(
      this.http.get(url, (this.backendService as any).globalVariablesService?.authOptions ?? {})
    );
    return resp.content;
  }

  // ------------------------------------------------------------------
  // Legacy YAML-based loading (kept as fallback)
  // ------------------------------------------------------------------

  async loadSidebarItems(yamlPath?: string): Promise<SidebarItem> {
    yamlPath = this.yamlPath || yamlPath || this.defaultYamlPath;
    
    try {
      const yamlText = await firstValueFrom(
        this.http.get(yamlPath, { responseType: 'text' })
      );
      
      const parsed = yaml.load(yamlText) as SidebarItem;
      return parsed;
    } catch (error) {
      throw error;
    }
  }

  // ------------------------------------------------------------------
  // Internal helpers
  // ------------------------------------------------------------------

  /**
   * Convert a backend NavigationResponse into the SidebarItem dictionary
   * expected by the existing sidebar component template.
   */
  private _navigationToSidebarItem(nav: NavigationResponse): SidebarItem {
    const result: SidebarItem = {} as SidebarItem;

    for (const menu of nav.menus) {
      const key = menu.name?.replace(/\s+/g, '_').toLowerCase() || `menu_${menu.id}`;
      const code = menu.definition?.code || `SIDEBAR.${key.toUpperCase()}.TITLE`;

      const routes: any = {};

      if (menu.children?.length) {
        for (const child of menu.children) {
          const childKey = child.name?.replace(/\s+/g, '_').toLowerCase() || `item_${child.id}`;
          const childCode = child.definition?.code || `SIDEBAR.${key.toUpperCase()}.${childKey.toUpperCase()}`;

          const route = child.screen?.route || child.definition?.route || `/d/${child.screen?.name || childKey}`;
          routes[childKey] = {
            routerLink: route.startsWith('/') ? route.substring(1) : route,
            routes: [route],
            permission: child.screen?.permission || child.definition?.permission,
            code: childCode,
            // Store the full screen metadata so the dynamic page can use it
            _screen: child.screen || null,
          };
        }
      }

      result[key] = {
        code,
        icon: menu.icon || 'folder',
        routes,
      };
    }

    return result;
  }

  /**
   * Fallback: load from YAML if backend is unavailable.
   */
  private async _fallbackToYaml(): Promise<NavigationResponse> {
    const items = await this.loadSidebarItems();
    return {
      menus: Object.entries(items).map(([key, val], idx) => ({
        id: idx,
        uuid: null,
        name: key,
        icon: val.icon,
        order: idx * 10,
        definition: { code: val.code },
        children: Object.entries(val.routes || {}).map(([rKey, rVal]: [string, any], rIdx) => ({
          id: idx * 100 + rIdx,
          uuid: null,
          name: rKey,
          icon: null,
          order: rIdx,
          definition: { route: rVal.routerLink, code: rVal.code },
          screen: {
            id: 0,
            uuid: null,
            name: rKey,
            screen_type: 'browser',
            main_entity_type: null,
            endpoint: null,
            route: rVal.routerLink,
            permission: rVal.permission,
          },
        })),
      })),
      permissions: {},
    };
  }
}