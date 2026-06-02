import {
  ChangeDetectorRef,
  Component,
  CUSTOM_ELEMENTS_SCHEMA,
  OnInit,
  Inject,
  Input
} from '@angular/core';

import {
  NavigationCancel,
  NavigationEnd,
  NavigationError,
  NavigationStart,
  Router, RouterOutlet
} from '@angular/router';

import { URLBuilder } from '@wizpanda/url-builder';
import { animate, state, style, transition, trigger } from "@angular/animations";
import { NzSelectModule } from "ng-zorro-antd/select";
import { FormsModule, ReactiveFormsModule } from "@angular/forms";
import { NzModalModule } from "ng-zorro-antd/modal";
import { NzSpinModule } from "ng-zorro-antd/spin";
import { NzMessageModule } from "ng-zorro-antd/message";
import { NzNotificationModule } from "ng-zorro-antd/notification";
import { NzIconModule } from "ng-zorro-antd/icon";
import { AngularFireAuthModule } from "@angular/fire/compat/auth";
import { CommonModule } from "@angular/common";
import {
  SplitAreaComponent,
  SplitComponent,
  SplitGutterDirective,
} from 'angular-split'
import { MatTabsModule } from '@angular/material/tabs';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';

//Library Services
import { INTERNATIONALIZATION_SERVICE, InternationalizationServiceInterface, StateService } from "ngt-gui/core";
import { InternationalizationService, LANGUAGE_OPTION_TYPES } from 'ngt-gui/core';

//Library Interfaces
import { DynamicTab } from '../../../interfaces/dynamic-tab.interface';

//Library components
import { SidebarComponent } from "../sidebar/sidebar.component";
import { TopAreaComponent } from "../top-area/top-area.component";
import { ModalsComponent } from "../modals/modals.component";
import { MessageGridComponent } from "../message-grid/message-grid.component";


//Library Modules
import { SharedModule } from "../../../modules/shared.module";


import { 
  AuthServiceInterface,
  AUTH_SERVICE_TOKEN,
  ROUTE_PATH_SERVICE, 
  RoutePathServiceInterface, 
  StateServiceInterface, 
  STATE_SERVICE 
} from 'ngt-gui/core';


const sidebarOpenCloseAnimation = trigger('sidebarOpenClose', [
  state('true', style({ width: '*' })),
  state('false', style({ width: '0px' })),
  transition('false <=> true', animate(100))
]);

@Component({
  selector: 'app-tab-layout',
  standalone: true,
  imports: [
    CommonModule,
    SharedModule,
    NzSelectModule,
    FormsModule,
    ReactiveFormsModule,
    NzModalModule,
    NzSpinModule,
    NzMessageModule,
    NzNotificationModule,
    NzIconModule,
    AngularFireAuthModule,
    // Components
    MessageGridComponent,
    SidebarComponent,
    TopAreaComponent,
    RouterOutlet,
    ModalsComponent,
    //SplitArea
    SplitAreaComponent,
    SplitComponent,
    SplitGutterDirective,
    //Tabs
    MatTabsModule,
    MatIconModule,
    MatButtonModule
  ],
  templateUrl: './tab-layout.component.html',
  styleUrls: [
    './tab-layout.component.sass',
    "./ng-zorro.sass"
  ],
  animations: [
    sidebarOpenCloseAnimation,
  ],
  schemas: [CUSTOM_ELEMENTS_SCHEMA]
})
export class TabLayoutComponent implements OnInit {
  title = 'bcs-gui';
  @Input() topBarTitle: string = "TITLE NOT DEFINED";
  @Input() topBarIcon: string = "assets/images/main_icon_ngtgui_white.png";
  
  loading = true;
  validateLogin = false;
  isActiveRegister = false;
  showSidebar = true;
  navigate = false;
  selectedOptionLanguage;
  sidebarSize = 30;
  isSidebarCollapsed = false;
  tabs: DynamicTab[] = [];
  selectedIndex = 0;

  get LanguageItemType() {
    return LANGUAGE_OPTION_TYPES;
  }

  constructor(
    
    //public readonly auth: AuthService,
    @Inject(AUTH_SERVICE_TOKEN) public readonly auth: AuthServiceInterface,
    public readonly router: Router,
    @Inject(INTERNATIONALIZATION_SERVICE) private readonly internacionalizationService: InternationalizationServiceInterface,
    @Inject(ROUTE_PATH_SERVICE) private readonly router_path: RoutePathServiceInterface,
    @Inject(STATE_SERVICE) private readonly stateService: StateServiceInterface,
    private readonly cdf: ChangeDetectorRef
  ) {

  }

  ngOnInit() {
    this.internacionalizationService.changeCurrentLanguage('private-es');
    this.internacionalizationService.setDefaultLanguage('private-empty');
    this.selectedOptionLanguage = this.internacionalizationService.getCurrentLanguage();
    this.internacionalizationService.getLangChangeEvent().subscribe({
      next: (value) => {
        this.selectedOptionLanguage = value.lang;
      }
    });
    this.router.events.subscribe({
      next: ev => {
        if (ev instanceof NavigationStart) {
          this.loading = true;
          this.navigate = true;
        }
        if (ev instanceof NavigationEnd || ev instanceof NavigationCancel || ev instanceof NavigationError) {
          this.loading = false;
          this.stateService.currentUrl = ev.url;
        }
        if (ev instanceof NavigationEnd) {
          this.router_path.routePathCounter++;
          setTimeout(() => this.navigate = false, 200)
        }
      }
    });
    this.auth.initializeAngularFireAuthChange();
    this.router.events.subscribe(event => {
      if (event instanceof NavigationEnd) {
        const route = event.urlAfterRedirects;
        const existingTab = this.tabs.find(t => t.route === route);
        if (route == '/home' || route == '/') {
        } else {

          if (!existingTab) {
            // Creamos una pestaña nueva
            this.tabs.push({ label: this.getLabelFromRoute(route), route });
            this.selectedIndex = this.tabs.length - 1;
          } else {
            // Seleccionamos la pestaña existente
            this.selectedIndex = this.tabs.indexOf(existingTab);
          }
        }
      }
    });

  }

  validateLoginChange(status) {
    console.log(status);
  }

  swicthLanguage(value): void {
    this.internacionalizationService.changeCurrentLanguage(value);
  }

  onActivate(event) {
    const URL = new URLBuilder('http://unusefulurl.com' + this.router.url);
    const params = {};
    URL.getParams().forEach((value, key) => {
      params[key] = value;
    });
    this.router_path.refresh_path({
      rawUrl: this.router.url,
      url: URL.getPath(),
      queryParams: params,
      breadcrumbName: event.BREADCRUMB_NAME ? event.BREADCRUMB_NAME : this.router.url,
    });
  }

  getLanguageTypeLabel(key): string {
    return `AUTH_MODAL.INPUTS.LANGUAGE.TYPES.${key}`;
  }

  showModal(): boolean {
    return (!this.auth.isEmailVerified && !this.auth.isAnonymous) && !this.auth.hiddenAuthModal && !this.navigate;
  }
  toggleSidebar() {
    this.isSidebarCollapsed = !this.isSidebarCollapsed;

    if (this.isSidebarCollapsed) {
      // Guardamos el tamaño actual y ocultamos
      this.sidebarSize = 0;
    } else {
      // Restauramos tamaño (puedes poner 30% u otro valor)
      this.sidebarSize = 30;
    }
  }
  getLabelFromRoute(route: string): string {
    // Podés personalizar los títulos según tus rutas
    if (route.includes('inicio')) return 'Inicio';
    if (route.includes('perfil')) return 'Perfil';
    if (route.includes('configuracion')) return 'Configuración';
    return route.split('/').pop() || 'Página';
  }

  selectTab(index: number) {
    this.router.navigate([this.tabs[index].route]);
  }

  closeTab(index: number) {
    const closed = this.tabs[index];
    this.tabs.splice(index, 1);

    // Si cerrás la pestaña activa, navegar a otra abierta
    if (this.selectedIndex >= this.tabs.length) {
      this.selectedIndex = this.tabs.length - 1;
    }

    if (this.tabs.length > 0) {
      this.router.navigate([this.tabs[this.selectedIndex].route]);
    } else {
      // Si no quedan pestañas, podés definir una ruta por defecto
      this.router.navigate(['/']);
    }
  }
  startEditing(tab: DynamicTab) {
  tab.editing = true;
  setTimeout(() => {
    const input = document.querySelector('.tab-edit-input:last-of-type') as HTMLInputElement;
    input?.focus();
    input?.select();
  });
}

finishEditing(tab: DynamicTab) {
  tab.editing = false;
  tab.label = tab.label.trim() || 'Sin título';
}



}




