/* tslint:disable:variable-name */
import { Component, Inject, Input, OnInit } from '@angular/core';
import { es_ES, en_US, pt_PT, NzI18nService } from 'ng-zorro-antd/i18n';
import { Router } from '@angular/router';
import { CommonModule, NgOptimizedImage } from "@angular/common";
import { NzAvatarModule } from "ng-zorro-antd/avatar";
import { NzPopoverModule } from "ng-zorro-antd/popover";
import { NzDropDownModule } from "ng-zorro-antd/dropdown";
import { NzBreadCrumbModule } from "ng-zorro-antd/breadcrumb";
import { NzSelectModule } from "ng-zorro-antd/select";
import { FormsModule, ReactiveFormsModule } from "@angular/forms";
import { NzButtonModule } from "ng-zorro-antd/button";
import { lastValueFrom } from "rxjs";


//Library components
import { PreferencesModalComponent } from "../../miscellaneous/preferences-modal/preferences-modal.component";

//MODULES
import { SharedModule } from "../../../modules/shared.module";
import { AuthServiceInterface, CoreModule } from 'ngt-gui/core';

//Library Services
import { AUTH_SERVICE_TOKEN, StateService } from 'ngt-gui/core';
import {BackendService} from 'ngt-gui/core';
import {AuthService} from "ngt-gui/core";
import { RoutePathService } from 'ngt-gui/core';
import { TopAreaService } from 'ngt-gui/core';
import { BackendServiceInterface } from 'ngt-gui/core';
import { BACKEND_SERVICE } from 'ngt-gui/core';
import { StateServiceInterface } from 'ngt-gui/core';
import { STATE_SERVICE } from 'ngt-gui/core';
import { ROUTE_PATH_SERVICE } from 'ngt-gui/core';
import { RoutePathServiceInterface } from 'ngt-gui/core';
import { GlobalScopeDefinition, GlobalScopeService, ScopeOption } from 'ngt-gui/core';

/**
 * Componente que representa el área superior de la aplicación (header).
 * 
 * Muestra el título, el icono principal, el breadcrumb, las opciones de usuario
 * y un selector por cada ámbito global que declare el backend (zona, proyecto,
 * caso de estudio...). Sin ámbitos declarados no se muestra ningún selector.
 * 
 * También gestiona los cambios de idioma, la sesión de usuario, 
 * y la apertura de preferencias.
 * 
 * @example
 * ```html
 * <app-top-area [title]="'NGTGUIDEMO'" [icon]="'/assets/logo.png'"></app-top-area>
 * ```
 */
@Component({
  selector: 'app-top-area',
  standalone: true,
  imports: [
    CommonModule,
    SharedModule,
    FormsModule,
    ReactiveFormsModule,
    NzAvatarModule,
    NzPopoverModule,
    NzDropDownModule,
    NzBreadCrumbModule,
    NzSelectModule,
    NzButtonModule,
    PreferencesModalComponent,
    NgOptimizedImage
  ],
  templateUrl: './top-area.component.html',
  styleUrls: ['./top-area.component.sass']
})
export class TopAreaComponent implements OnInit {

  /** 
   * Título mostrado en el área superior.  
   * Si no se especifica, se muestra `'TITLE NOT DEFINED'`.
   */
  @Input() title: string = "TITLE NOT DEFINED";

  /**
   * Ruta del ícono mostrado junto al título.  
   * Por defecto: `'./assets/images/main_icon_ngtgui_white.png'`
   */
  @Input() icon: string = "./assets/images/main_icon_ngtgui_white.png";

  /** Lista de elementos de breadcrumb (navegación jerárquica). */
  breadcrumb: any;

  /** Indica si el menú desplegable del usuario está visible. */
  userPopoverVisible = false;

  /** Indica si la ventana modal de preferencias está visible. */
  isVisiblePreferencesModal = false;

  /** Registros seleccionables de cada ámbito global, por nombre de ámbito. */
  scopeOptions: Record<string, ScopeOption[]> = {};

  /** Ámbitos cuyas opciones se están cargando. */
  scopeLoading: Record<string, boolean> = {};

  /** Cadena del título final mostrado en el componente. */
  titleString: string;

  /**
   * Constructor del componente.
   * 
   * @param i18n Servicio de internacionalización de Ng-Zorro.
   * @param auth_service Servicio de autenticación de la aplicación.
   * @param route Servicio de enrutamiento de Angular.
   * @param route_path Servicio de navegación y rutas personalizadas.
   * @param backendService Servicio para comunicación con el backend.
   * @param topAreaService Servicio de eventos relacionados con el área superior.
   * @param stateService Servicio para gestión de estado global.
   */
  constructor(
    private i18n: NzI18nService,
    @Inject(AUTH_SERVICE_TOKEN) public auth_service: AuthServiceInterface,
    private route: Router,
    @Inject(ROUTE_PATH_SERVICE) private route_path: RoutePathServiceInterface,
    @Inject(BACKEND_SERVICE) private backendService: BackendServiceInterface,
    private topAreaService: TopAreaService,
    @Inject(STATE_SERVICE) private readonly stateService: StateServiceInterface,
    public readonly scopeService: GlobalScopeService,
  ) {
    this.breadcrumb = this.route_path._log;
  }

  /**
   * Inicializa el componente:
   * - Configura el idioma por defecto.
   * - Se suscribe a eventos del área superior y del servicio de estado.
   * - Carga los “case studies” disponibles si el usuario está autenticado.
   */
  async ngOnInit(): Promise<void> {
    this.i18n.setLocale(es_ES);

    this.topAreaService.topAreaEventEmitter.subscribe((event: { type: string, value: any }) => {
      switch (event.type) {
        // Evento heredado: alguien creó o borró un caso de estudio. Se recargan
        // las opciones de todos los ámbitos; si el seleccionado ya no existe,
        // el propio servicio lo retira.
        case 'load-case-studies':
          this.reloadScopeOptions();
          break;
      }
    });

    if (this.auth_service.user) {
      await this.loadScopes();
    }

    this.auth_service.changeUserEvent.subscribe(async (user) => {
      if (user) {
        await this.loadScopes();
      } else {
        this.scopeService.reset();
        this.scopeOptions = {};
      }
    });
  }

  /** Carga los ámbitos declarados por el backend y sus opciones. */
  async loadScopes(): Promise<void> {
    await this.scopeService.load();
    this.reloadScopeOptions();
  }

  reloadScopeOptions(): void {
    for (const scope of this.scopeService.scopes()) {
      this.loadScopeOptions(scope);
    }
  }

  /** Carga (o refresca) los registros seleccionables de un ámbito. */
  loadScopeOptions(scope: GlobalScopeDefinition): void {
    this.scopeLoading[scope.name] = true;
    this.scopeService.options(scope).subscribe(options => {
      this.scopeOptions[scope.name] = options;
      this.scopeLoading[scope.name] = false;
    });
  }

  /**
   * Opciones a pintar: las cargadas y, mientras llegan, la ya seleccionada
   * (para que el selector muestre su nombre y no un id suelto).
   */
  scopeOptionsFor(scope: GlobalScopeDefinition): ScopeOption[] {
    const loaded = this.scopeOptions[scope.name];
    if (loaded?.length) return loaded;
    const selected = this.scopeService.selected(scope.name);
    return selected ? [selected] : [];
  }

  /** El usuario fija o limpia el valor de un ámbito. */
  scopeValueChange(scope: GlobalScopeDefinition, id: number | string | null): void {
    const option = (this.scopeOptions[scope.name] || []).find(o => o.id === id) ?? null;
    this.scopeService.select(scope.name, option);
  }

  trackScope = (_: number, scope: GlobalScopeDefinition) => scope.name;

  /**
   * Cambia el idioma de la interfaz.
   * 
   * @param value Código del idioma (ej: `'es_ES'`, `'en_US'`, `'pt_PT'`).
   */
  switchLanguage(value: string): void {
    switch (value) {
      case 'es_ES': this.i18n.setLocale(es_ES); break;
      case 'en_US': this.i18n.setLocale(en_US); break;
      case 'pt_PT': this.i18n.setLocale(pt_PT); break;
      default: break;
    }
  }

  /**
   * Navega hacia un elemento del breadcrumb.
   * 
   * @param routing Objeto con la ruta y los parámetros de navegación.
   */
  clickBreadcrumbItem(routing: any): void {
    this.route_path.goBack(routing);
    this.route.navigate([routing.url], { queryParams: routing.queryParams });
  }

  /**
   * Cambia el estado de visibilidad del menú del usuario.
   * 
   * @param state Estado deseado (opcional). Si no se pasa, se alterna.
   */
  changeUserPopoverState(state?: boolean): void {
    if (state === undefined) {
      this.userPopoverVisible = !this.userPopoverVisible;
      return;
    }
    this.userPopoverVisible = state;
  }

  /** Cierra sesión y redirige al inicio. */
  logout(): void {
    this.changeUserPopoverState(false);
    this.route.navigate(['']).then();
    this.auth_service.logout().then();
  }

  /** Abre la ventana modal de preferencias. */
  openPreferences(): void {
    this.userPopoverVisible = false;
    this.isVisiblePreferencesModal = true;
  }

  /** Cierra la ventana modal de preferencias. */
  closePreferences(): void {
    this.isVisiblePreferencesModal = false;
  }

  /**
   * Devuelve la URL sin parámetros de consulta.
   * 
   * @param rawUrl URL original.
   * @returns La URL sin parámetros.
   */
  getUrlWithoutParam(rawUrl: string): string {
    return rawUrl.split('?')[0];
  }

  /** Verifica si el valor es una cadena. */
  isString(val: any): boolean {
    return typeof val === 'string';
  }

  /** Verifica si el valor es un objeto. */
  isObject(val: any): boolean {
    return typeof val === 'object';
  }

  /** Abre el entorno Jupyter en una nueva pestaña. */
  onJupyterClick(): void {
    window.open("http://jupyter.nextgendem.eu", "_blank");
  }
}
