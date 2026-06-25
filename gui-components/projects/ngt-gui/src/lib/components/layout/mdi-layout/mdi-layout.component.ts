import {
  ChangeDetectorRef,
  Component,
  CUSTOM_ELEMENTS_SCHEMA,
  Inject,
  Injector,
  Input,
  OnInit,
  Type,
  computed,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import {
  ActivatedRoute,
  ActivatedRouteSnapshot,
  convertToParamMap,
  NavigationCancel,
  NavigationEnd,
  NavigationError,
  NavigationStart,
  Router,
} from '@angular/router';
import { BehaviorSubject } from 'rxjs';
import { animate, state, style, transition, trigger } from '@angular/animations';

import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { NzSelectModule } from 'ng-zorro-antd/select';
import { NzModalModule } from 'ng-zorro-antd/modal';
import { NzSpinModule } from 'ng-zorro-antd/spin';
import { NzMessageModule } from 'ng-zorro-antd/message';
import { NzNotificationModule } from 'ng-zorro-antd/notification';
import { NzIconModule } from 'ng-zorro-antd/icon';
import { AngularFireAuthModule } from '@angular/fire/compat/auth';
import {
  SplitAreaComponent,
  SplitComponent,
  SplitGutterDirective,
} from 'angular-split';

// Library services
import {
  AUTH_SERVICE_TOKEN,
  AuthServiceInterface,
  INTERNATIONALIZATION_SERVICE,
  InternationalizationServiceInterface,
  LANGUAGE_OPTION_TYPES,
  ROUTE_PATH_SERVICE,
  RoutePathServiceInterface,
  STATE_SERVICE,
  StateServiceInterface,
} from 'ngt-gui/core';

// Library components
import { SidebarComponent } from '../sidebar/sidebar.component';
import { TopAreaComponent } from '../top-area/top-area.component';
import { ModalsComponent } from '../modals/modals.component';
import { MessageGridComponent } from '../message-grid/message-grid.component';
import { WindowFrameComponent } from '../window-frame/window-frame.component';
import { WindowHostDirective } from '../window-host.directive';

// Library modules / services
import { SharedModule } from '../../../modules/shared.module';
import { WindowManagerService } from '../../../services/window-manager.service';

const sidebarOpenCloseAnimation = trigger('sidebarOpenClose', [
  state('true', style({ width: '*' })),
  state('false', style({ width: '0px' })),
  transition('false <=> true', animate(100)),
]);

/** Rutas que representan el "escritorio" vacío y no abren ventana. */
const DESKTOP_ROUTES = new Set(['', '/', '/home', 'home']);

/**
 * Layout MDI: mantiene el shell habitual (top-area + sidebar) pero sustituye el
 * área de contenido por un gestor de ventanas. Cada navegación abre una ventana
 * viva (flotante o acoplada como pestaña) en vez de reemplazar un `router-outlet`.
 *
 * No declara `router-outlet`: el componente de cada ruta se resuelve a mano
 * desde el snapshot y se hospeda con `ngComponentOutlet`, inyectando un
 * `ActivatedRoute` congelado por ventana (params + datos de los resolvers).
 *
 * @see WindowManagerService
 */
@Component({
  selector: 'app-mdi-layout',
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
    ModalsComponent,
    WindowFrameComponent,
    WindowHostDirective,
    // Split
    SplitAreaComponent,
    SplitComponent,
    SplitGutterDirective,
  ],
  templateUrl: './mdi-layout.component.html',
  styleUrls: ['./mdi-layout.component.sass'],
  animations: [sidebarOpenCloseAnimation],
  schemas: [CUSTOM_ELEMENTS_SCHEMA],
})
export class MdiLayoutComponent implements OnInit {
  @Input() topBarTitle = 'TITLE NOT DEFINED';
  @Input() topBarIcon = 'assets/images/main_icon_ngtgui_white.png';

  /**
   * Modo en que se abren las ventanas al navegar:
   *  - `'floating'`: ventana flotante en el workspace (por defecto).
   *  - `'docked'`  : pestaña tipo navegador en la barra superior.
   */
  @Input() defaultWindowMode: 'floating' | 'docked' = 'floating';

  loading = false;
  navigate = false;
  selectedOptionLanguage;
  sidebarSize = 30;
  isSidebarCollapsed = false;

  /** Ventana acoplada visible (la pestaña activa): la de mayor z-index. */
  readonly activeDockedId = computed(() => {
    const docked = this.wm.dockedWindows();
    if (docked.length === 0) {
      return null;
    }
    return docked.reduce((a, b) => (b.zIndex > a.zIndex ? b : a)).id;
  });

  get LanguageItemType() {
    return LANGUAGE_OPTION_TYPES;
  }

  constructor(
    @Inject(AUTH_SERVICE_TOKEN) public readonly auth: AuthServiceInterface,
    public readonly router: Router,
    @Inject(INTERNATIONALIZATION_SERVICE)
    private readonly internacionalizationService: InternationalizationServiceInterface,
    @Inject(ROUTE_PATH_SERVICE) private readonly router_path: RoutePathServiceInterface,
    @Inject(STATE_SERVICE) private readonly stateService: StateServiceInterface,
    private readonly injector: Injector,
    public readonly wm: WindowManagerService,
    private readonly cdf: ChangeDetectorRef,
  ) {}

  ngOnInit(): void {
    this.internacionalizationService.changeCurrentLanguage('private-es');
    this.internacionalizationService.setDefaultLanguage('private-empty');
    this.selectedOptionLanguage = this.internacionalizationService.getCurrentLanguage();
    this.internacionalizationService.getLangChangeEvent().subscribe({
      next: (value) => (this.selectedOptionLanguage = value.lang),
    });

    this.router.events.subscribe((ev) => {
      if (ev instanceof NavigationStart) {
        this.loading = true;
        this.navigate = true;
      }
      if (
        ev instanceof NavigationEnd ||
        ev instanceof NavigationCancel ||
        ev instanceof NavigationError
      ) {
        this.loading = false;
        this.stateService.currentUrl = (ev as NavigationEnd).url;
      }
      if (ev instanceof NavigationEnd) {
        this.router_path.routePathCounter++;
        setTimeout(() => (this.navigate = false), 200);
        this.openWindowForCurrentRoute(ev.urlAfterRedirects);
      }
    });

    this.auth.initializeAngularFireAuthChange();
  }

  // ── Navegación → ventana ────────────────────────────────────────────

  /**
   * Resuelve el componente de la ruta activa y abre (o re-enfoca) su ventana.
   * Las rutas de "escritorio" (home / raíz) no abren ventana.
   */
  private async openWindowForCurrentRoute(url: string): Promise<void> {
    const path = url.split('?')[0];
    if (DESKTOP_ROUTES.has(path) || DESKTOP_ROUTES.has(url)) {
      return;
    }

    const snapshot = this.deepestSnapshot();
    if (!snapshot || !snapshot.routeConfig) {
      return;
    }

    const component = await this.resolveComponent(snapshot);
    if (!component) {
      return;
    }

    this.wm.open({
      route: url,
      layoutKey: this.deriveLayoutKey(snapshot),
      title: this.deriveTitle(snapshot, url),
      component,
      injector: this.buildWindowInjector(snapshot),
      docked: this.defaultWindowMode === 'docked',
    });
    this.cdf.markForCheck();
  }

  /** Hoja más profunda del árbol de rutas activo. */
  private deepestSnapshot(): ActivatedRouteSnapshot | null {
    let route: ActivatedRouteSnapshot | null = this.router.routerState.snapshot.root;
    while (route?.firstChild) {
      route = route.firstChild;
    }
    return route;
  }

  /** Obtiene la clase de componente de una ruta (eager o lazy). */
  private async resolveComponent(
    snapshot: ActivatedRouteSnapshot,
  ): Promise<Type<unknown> | null> {
    const cfg: any = snapshot.routeConfig;
    if (cfg?.component) {
      return cfg.component;
    }
    if (cfg?.loadComponent) {
      const loaded: any = await cfg.loadComponent();
      return loaded?.default ?? loaded ?? null;
    }
    return null;
  }

  /**
   * Clave de disposición = patrón de ruta (`sequenceDetail/:id`), uniendo los
   * `path` de la cadena de rutas. Así todas las instancias de una página
   * comparten geometría/acoplado guardados.
   */
  private deriveLayoutKey(snapshot: ActivatedRouteSnapshot): string {
    const parts: string[] = [];
    let node: ActivatedRouteSnapshot | null = snapshot;
    while (node) {
      const path = node.routeConfig?.path;
      if (path) {
        parts.unshift(path);
      }
      node = node.parent;
    }
    return parts.join('/') || snapshot.url.map((s) => s.path).join('/');
  }

  /** Título de la ventana a partir del snapshot o del último segmento de URL. */
  private deriveTitle(snapshot: ActivatedRouteSnapshot, url: string): string {
    return (
      snapshot.title ||
      snapshot.data?.['title'] ||
      snapshot.data?.['BREADCRUMB_NAME'] ||
      url.split('?')[0].split('/').filter(Boolean).pop() ||
      'Ventana'
    );
  }

  /**
   * Injector por-ventana con un `ActivatedRoute` congelado: el snapshot real
   * (params + datos de resolvers) y observables sembrados con sus valores, de
   * modo que no muten cuando se navegue a otra ventana.
   */
  private buildWindowInjector(snapshot: ActivatedRouteSnapshot): Injector {
    const frozen = {
      snapshot,
      url: new BehaviorSubject(snapshot.url),
      params: new BehaviorSubject(snapshot.params),
      queryParams: new BehaviorSubject(snapshot.queryParams),
      fragment: new BehaviorSubject(snapshot.fragment),
      data: new BehaviorSubject(snapshot.data),
      paramMap: new BehaviorSubject(convertToParamMap(snapshot.params)),
      queryParamMap: new BehaviorSubject(convertToParamMap(snapshot.queryParams)),
      outlet: snapshot.outlet,
      routeConfig: snapshot.routeConfig,
    } as unknown as ActivatedRoute;

    return Injector.create({
      providers: [{ provide: ActivatedRoute, useValue: frozen }],
      parent: this.injector,
    });
  }

  // ── Shell (idéntico a tab-layout) ───────────────────────────────────

  swicthLanguage(value): void {
    this.internacionalizationService.changeCurrentLanguage(value);
  }

  getLanguageTypeLabel(key): string {
    return `AUTH_MODAL.INPUTS.LANGUAGE.TYPES.${key}`;
  }

  showModal(): boolean {
    return (
      !this.auth.isEmailVerified &&
      !this.auth.isAnonymous &&
      !this.auth.hiddenAuthModal &&
      !this.navigate
    );
  }

  toggleSidebar(): void {
    this.isSidebarCollapsed = !this.isSidebarCollapsed;
    this.sidebarSize = this.isSidebarCollapsed ? 0 : 30;
  }

  /** trackBy estable por id: preserva las instancias `ngComponentOutlet`. */
  trackById(_index: number, win: { id: string }): string {
    return win.id;
  }
}
