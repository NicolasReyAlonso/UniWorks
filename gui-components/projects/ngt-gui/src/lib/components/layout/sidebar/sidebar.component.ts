import { Component, Input, OnInit, Inject, Optional } from '@angular/core';
import { ActivatedRoute, NavigationEnd, Router, RouterModule } from '@angular/router';
import { CommonModule } from '@angular/common';
import { NzMenuModule } from "ng-zorro-antd/menu";
import { FormsModule } from '@angular/forms';
import { NzInputModule } from 'ng-zorro-antd/input';
import { TranslateService } from '@ngx-translate/core';

//Library Services
import {AUTH_SERVICE_TOKEN, AuthServiceInterface} from "ngt-gui/core";
import {SOCKET_SERVICE, SocketServiceInterface, SocketService} from "ngt-gui/core";

//Library Services (NOT CORE)
import { SidebarService } from '../../../services/sidebar.service';

//Library pipes
import { KeyValueCustomPipe } from "../../../pipes/key-value-custom.pipe";

//Library Modules
import { SharedModule } from "../../../modules/shared.module";
import { SidebarItem } from '../../../interfaces/sidebar-item.interface';

@Component({
  selector: 'app-sidebar',
  imports: [
    CommonModule,
    SharedModule,
    NzMenuModule,
    RouterModule,
    KeyValueCustomPipe,
    FormsModule,
    NzInputModule
  ],
  templateUrl: './sidebar.component.html',
  styleUrls: ['./sidebar.component.sass']
})

export class SidebarComponent implements OnInit {
  
  @Input() isCollapsable: boolean = false;
  
  items: SidebarItem | null;
  show: boolean = true;
  filteredItems: any = {};
  currentUrl = '';
  customRawUrlSelect = null;
  openMap: { [name: string]: boolean } = {};
  searchText: string = '';
  lastSearchText: string = '';
  lastState: { [name: string]: boolean } = {};
  isSearching: boolean = false;

  openHandler(value: string): void {
    if (!this.isSearching) {
      for (const key in this.openMap) {
        if (key !== value) {
          this.openMap[key] = false;
        }
      }
      this.updateLastState();
    }
  }

  private updateLastState(): void {
    this.lastState = { ...this.openMap };
  }

  private readonly socketService: SocketServiceInterface;

  constructor(
    public activeRoute: ActivatedRoute,
    private router: Router,
    private sidebarService: SidebarService,
    @Inject(AUTH_SERVICE_TOKEN) public authService: AuthServiceInterface,
    private translate: TranslateService,
    @Optional() @Inject(SOCKET_SERVICE) injectedSocketService: SocketServiceInterface,
    defaultSocketService: SocketService,
  ) {
    this.socketService = injectedSocketService || defaultSocketService;
  }

  async ngOnInit(): Promise<void> {

    await this.loadItems();

    // Hot-plug: when the backend signals that the navigation tree changed
    // (a node was plugged in or died), reload the sidebar in place.
    this.socketService.navigationChangedSubject?.subscribe(async () => {
      await this.loadItems(true);
    });

    this.sidebarService.sidebarEventEmitter.subscribe((event: { type: string, value: any }) => {
      switch (event.type) {
        case 'customRawUrlSelect':
          this.customRawUrlSelect = event.value;
          if (this.customRawUrlSelect) {
            this.openMenuDependCurrentView();
          }
          break;
      }
    });

    this.router.events.subscribe((event) => {
      if (event instanceof NavigationEnd) {
        this.currentUrl = this.router.url;
        console.log('🔗 Navegación a:', this.currentUrl);
        this.openMenuDependCurrentView();
      }
    });

    // Reload the menu whenever the active user changes (login / logout /
    // account switch). The backend filters /gui/navigation by the current
    // user's permissions, so a stale tree from a previous session would
    // otherwise keep showing menus the new account is not allowed to see.
    this.authService.changeUserEvent.subscribe(async (user) => {
      if (user) {
        await this.loadItems();
      } else {
        this.clearItems();
      }
    });
  }

  /**
   * Clear the menu tree (used on logout) so no menus from the previous
   * session remain visible.
   */
  private clearItems(): void {
    this.items = null;
    this.filteredItems = {};
    this.openMap = {};
    this.updateLastState();
  }

  /**
   * Load (or reload) the sidebar tree from the backend, keeping the
   * open/closed state of the menus that survive the reload.
   */
  private async loadItems(keepState: boolean = false): Promise<void> {
    // Try loading navigation from the backend (dynamic).
    // Falls back to YAML if the backend is unreachable.
    try {
      this.items = await this.sidebarService.loadSidebarFromBackend();
    } catch (_) {
      this.items = await this.sidebarService.loadSidebarItems('/assets/config/subDemo.yaml');
    }
    this.filteredItems = { ...this.items };

    const previousOpenMap = this.openMap;
    this.openMap = {};
    if (this.items) {
      Object.keys(this.items).forEach(submenu => {
        this.openMap[submenu] = keepState ? (previousOpenMap[submenu] ?? false) : false;
      });
    }
    this.updateLastState();
    if (this.searchText) {
      this.onSearchChange();
    }
  }

  debugClick(item: any) {
  console.log('🔍 Click en item:', item);
  console.log('🔗 Ruta:', item.value.routes[0]);
  console.log('🔐 Permiso:', item.value.permission);
  console.log('✅ Tiene permiso:', this.funcCondition(item.value.permission));
}
  /**
   * Evalúa permisos en TIEMPO REAL
   */
  showSubMenu(subMenu: SidebarItem): boolean {
    const routes = subMenu.routes;
    
    // Si no hay rutas, no mostrar
    if (!routes) {
      console.log('⚠️ Submenú sin rutas:', subMenu);
      return false;
    }
    
    for (const key in routes) {
      const route = routes[key];
      
      // Si no tiene permiso requerido, mostrar
      if (!route.permission) {
        return true;
      }
      
      // Evaluar permiso en tiempo real
      if (this.funcCondition(route.permission)) {
        return true;
      }
    }
    
    return false;
  }

  private openMenuDependCurrentView() {
    const openMenu = (value: string) => {
      if (!this.isSearching) {
        this.openMap[value] = true;
        this.openHandler(value);
        this.updateLastState();
      }
    };

    for (const submenu in this.items) {
      for (const keyItem in this.items[submenu].routes) {
        for (const route of this.items[submenu].routes[keyItem].routes) {
          if (this.customRawUrlSelect &&
            (this.currentUrl.startsWith('/process/processDetail') ||
              this.currentUrl.startsWith('/geoprocessInstancesDetail'))) {
            if (this.customRawUrlSelect.startsWith(route)) {
              openMenu(submenu);
              return;
            }
          } else if (this.currentUrl.startsWith(route)) {
            openMenu(submenu);
            return;
          }
        }
      }
    }
  }

  isSelectedItem(item): boolean {
    if (this.currentUrl.startsWith('/process/processDetail') ||
      this.currentUrl.startsWith('/geoprocessInstancesDetail')) {
      if (this.customRawUrlSelect) {
        for (const route of item.routes) {
          if (this.customRawUrlSelect.startsWith(route)) { return true; }
        }
      }
      return false;
    }
    for (const route of item.routes) {
      if (this.currentUrl.startsWith(route)) { return true; }
    }
    return false;
  }

  getText(item: SidebarItem | { key: string; value: any }): string {
    return item.value?.code ? item.value.code : `SIDEBAR.${item.key}.title`;
  }

  /**
   * CRÍTICO: Evaluar permisos en tiempo real
   */
  funcCondition(perm: string): boolean {
    if (!this.authService) {
      return false;
    }
    const hasPermission = this.authService.havePermission(perm);
    return hasPermission;
  }

  search(query: string): void {
    console.log('🔍 Buscar en el sidebar:', query);
  }

  onSearchChange() {
    const query = this.searchText.trim().toLowerCase();

    if (!query) {
      this.isSearching = false;
      this.filteredItems = { ...this.items };
      this.openMap = { ...this.lastState };
      return;
    }

    this.isSearching = true;
    
    if (!this.lastSearchText) {
      this.updateLastState();
    }

    this.lastSearchText = query;

    const result: any = {};

    for (const [subKey, subMenu] of Object.entries(this.items)) {
      const filteredRoutes = Object.entries(subMenu.routes || {}).filter(
        ([routeKey, routeValue]: [string, any]) => {
          const itemWrapper = { key: routeKey, value: routeValue };
          const code = this.getText(itemWrapper);
          const translated = this.translate.instant(code)?.toLowerCase() || '';
          return (
            code.toLowerCase().includes(query) ||
            translated.includes(query) ||
            routeKey.toLowerCase().includes(query)
          );
        }
      );

      const subMenuCode = subMenu.code || `SIDEBAR.${subKey}.title`;
      const subMenuTranslated = this.translate.instant(subMenuCode)?.toLowerCase() || '';
      const subMenuMatches =
        subMenuCode.toLowerCase().includes(query) ||
        subMenuTranslated.includes(query) ||
        subKey.toLowerCase().includes(query);

      if (subMenuMatches || filteredRoutes.length > 0) {
        result[subKey] = {
          ...subMenu,
          routes: subMenuMatches
            ? subMenu.routes
            : Object.fromEntries(filteredRoutes)
        };
        this.openMap[subKey] = true;
      }
    }

    this.filteredItems = result;
  }

  clearSearch() {
    this.searchText = '';
    this.lastSearchText = '';
    this.onSearchChange();
  }
}