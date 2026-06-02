/**
 * DynamicPageComponent
 *
 * Universal component that renders any Screen definition from the backend.
 * Depending on the screen_type it shows:
 *   - "browser"        → DynamicBrowseComponent (table + filters + CRUD buttons)
 *   - "editable_table"  → DynamicBrowseComponent in editable mode
 *   - "form"            → A reactive form built from the screen definition
 *
 * The screen definition is loaded via the `DynamicPageResolver` which puts
 * the data inside `ActivatedRoute.data['screenDefinition']`.
 *
 * ROUTES that use this component follow the pattern  `/d/:screenName`  and
 * optionally `/d/:screenName/:id` for detail/form views.
 */
import {
  Component, Inject, OnInit, OnDestroy, EventEmitter, ViewChild,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { FormsModule, ReactiveFormsModule, FormGroup, FormControl, Validators } from '@angular/forms';
import { Subscription } from 'rxjs';

// NG-ZORRO
import { NzButtonModule } from 'ng-zorro-antd/button';
import { NzPageHeaderModule } from 'ng-zorro-antd/page-header';
import { NzInputModule } from 'ng-zorro-antd/input';
import { NzFormModule } from 'ng-zorro-antd/form';
import { NzCardModule } from 'ng-zorro-antd/card';
import { NzSpinModule } from 'ng-zorro-antd/spin';
import { NzIconModule } from 'ng-zorro-antd/icon';
import { NzSelectModule } from 'ng-zorro-antd/select';
import { NzMessageService } from 'ng-zorro-antd/message';
import { NzSpaceModule } from 'ng-zorro-antd/space';
import { TranslateModule, TranslateService } from '@ngx-translate/core';

// Library
import {
  BACKEND_SERVICE, BackendServiceInterface,
  MESSAGE_LOG_SERVICE, MessageLogServiceInterface,
} from 'ngt-gui/core';
import { BulkEditGridComponent, ScreenEditableColumn } from 'ngt-gui';
import { DynamicBrowseComponent } from '../dynamic-browse/dynamic-browse.component';
import { SharedModule } from '../../../modules/shared.module';
import { IView } from '../../../interfaces/view.interface';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';

@Component({
  selector: 'app-dynamic-page',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    SharedModule,
    TranslateModule,
    NzButtonModule,
    NzPageHeaderModule,
    NzInputModule,
    NzFormModule,
    NzCardModule,
    NzSpinModule,
    NzIconModule,
    NzSelectModule,
    NzSpaceModule,
    DynamicBrowseComponent,
    BulkEditGridComponent,
  ],
  templateUrl: './dynamic-page.component.html',
  styleUrls: ['./dynamic-page.component.sass'],
})
export class DynamicPageComponent implements OnInit, OnDestroy, IView {
  BREADCRUMB_NAME = '';

  /** The full screen definition from the resolver */
  screenDef: any = null;
  /** 'browser' | 'editable_table' | 'form' */
  screenType: string = 'browser';
  /** Loading state */
  loading = true;
  /** Entity id for form mode (detail page) */
  entityId: string | null = null;

  /** Reactive form for form-type screens */
  form: FormGroup | null = null;
  /** Data loaded for detail form */
  formData: any = null;
  formLoading = false;
  formSaving = false;

  /** Custom BrowserType override – DynamicBrowse expects a string key */
  browserType = '';
  browserTitle = '';
  /** The backend endpoint for the entity */
  endpoint = '';

  private routeSub: Subscription | null = null;

  /** Event emitters for DynamicBrowseComponent */
  openItemEvent = new EventEmitter<any>();
  createEvent = new EventEmitter<any>();
  deleteItemEvent = new EventEmitter<any>();
  exportItemEvent = new EventEmitter<any>();

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private http: HttpClient,
    @Inject(BACKEND_SERVICE) private backendService: BackendServiceInterface,
    @Inject(MESSAGE_LOG_SERVICE) private logService: MessageLogServiceInterface,
    private translateService: TranslateService,
    private messageService: NzMessageService,
  ) {}

  ngOnInit(): void {
    this.routeSub = this.route.data.subscribe(data => {
      this.screenDef = data['screenDefinition'];
      this.entityId = this.route.snapshot.paramMap.get('id');
      if (this.screenDef) {
        this._applyScreenDefinition();
      } else {
        this.loading = false;
      }
    });
  }

  ngOnDestroy(): void {
    this.routeSub?.unsubscribe();
  }

  // ------------------------------------------------------------------
  // Apply screen definition
  // ------------------------------------------------------------------

  private _applyScreenDefinition(): void {
    const def = this.screenDef.definition || {};
    this.screenType = this.screenDef.screen_type || def.type || 'browser';
    this.browserTitle = def.title || this.screenDef.name || '';
    this.BREADCRUMB_NAME = this.browserTitle;
    this.endpoint = this.screenDef.endpoint || '';

    // Register a dynamic browser type in the backend service
    // so that getGenericRequest / getFieldID work for this entity.
    this.browserType = this._registerDynamicBrowserType();

    if (this.screenType === 'form' && this.entityId) {
      this._loadFormData();
    } else if (this.screenType === 'form' && !this.entityId) {
      this._buildForm(def);
      this.loading = false;
    } else {
      this.loading = false;
    }
  }

  /**
   * Register a temporary browser type so the existing DynamicBrowse can
   * call `backendService.getGenericRequest(type, ...)`.
   *
   * We monkey-patch the endpoint/fieldID maps on the BackendService.
   */
  private _registerDynamicBrowserType(): string {
    const typeName = `_dyn_${this.screenDef.name || this.screenDef.id}`;
    const svc = this.backendService as any;

    // Patch getEndpoint's internal map
    if (svc._dynamicEndpoints === undefined) {
      svc._dynamicEndpoints = {};
      const originalGetEndpoint = svc.getEndpoint?.bind(svc);
      if (originalGetEndpoint) {
        svc.getEndpoint = (type: string) => {
          if (svc._dynamicEndpoints[type]) {
            return svc.base_url.replace(/\/api$/, '') + svc._dynamicEndpoints[type];
          }
          return originalGetEndpoint(type);
        };
      }
    }
    svc._dynamicEndpoints[typeName] = this.endpoint;

    // Patch getFieldID
    if (svc._dynamicFieldIds === undefined) {
      svc._dynamicFieldIds = {};
      const originalGetFieldID = svc.getFieldID?.bind(svc);
      if (originalGetFieldID) {
        svc.getFieldID = (type: string) => {
          if (svc._dynamicFieldIds[type]) {
            return svc._dynamicFieldIds[type];
          }
          return originalGetFieldID(type);
        };
      }
    }
    const fieldId = this.screenDef.definition?.fieldId || 'id';
    svc._dynamicFieldIds[typeName] = fieldId;

    return typeName;
  }

  // ------------------------------------------------------------------
  // Browser mode event handlers
  // ------------------------------------------------------------------

  onOpenItem(event: any): void {
    // Navigate to the form/detail screen for this entity
    const def = this.screenDef.definition || {};
    const detailScreenName = def.detailScreen || this.screenDef.name?.replace('_browser', '_form');
    const id = event?.id ?? event;

    if (detailScreenName) {
      this.router.navigate(['/d', detailScreenName, id]);
    }
  }

  onCreateItem(): void {
    const def = this.screenDef.definition || {};
    const detailScreenName = def.detailScreen || this.screenDef.name?.replace('_browser', '_form');
    if (detailScreenName) {
      this.router.navigate(['/d', detailScreenName]);
    }
  }

  onBulkInsert(): void {
    // Navigate to the editable_table screen for the same entity. Synthetic
    // screens follow the convention `<entity>_browser` ↔ `<entity>_editable_table`.
    const bulkScreenName = this.screenDef?.name?.replace('_browser', '_editable_table');
    if (bulkScreenName) {
      this.router.navigate(['/d', bulkScreenName]);
    }
  }

  onDeleteItem(event: any): void {
    const id = event?.id ?? event;
    if (!id || !this.endpoint) return;

    const svc = this.backendService as any;
    const url = svc.base_url.replace(/\/api$/, '') + this.endpoint + '/' + id;

    this.http.delete(url, svc.globalVariablesService?.authOptions ?? {}).subscribe({
      next: () => {
        this.messageService.success('Deleted successfully');
        // Trigger browse refresh by navigating to self
        this.router.navigate([], { relativeTo: this.route, queryParamsHandling: 'preserve' });
      },
      error: (err: any) => this.messageService.error(err?.error?.detail || 'Error deleting'),
    });
  }

  // ------------------------------------------------------------------
  // Form mode
  // ------------------------------------------------------------------

  private _loadFormData(): void {
    this.formLoading = true;
    const svc = this.backendService as any;
    const url = svc.base_url.replace(/\/api$/, '') + this.endpoint + '/' + this.entityId;

    this.http.get(url, svc.globalVariablesService?.authOptions ?? {}).subscribe({
      next: (resp: any) => {
        this.formData = resp.content ?? resp;
        this._buildForm(this.screenDef.definition, this.formData);
        this.formLoading = false;
        this.loading = false;
      },
      error: () => {
        this.messageService.error('Error loading entity');
        this.formLoading = false;
        this.loading = false;
      },
    });
  }

  private _buildForm(def: any, data?: any): void {
    const group: Record<string, FormControl> = {};
    const sections = def.sections || [];

    for (const section of sections) {
      for (const field of section.fields || []) {
        const value = data ? data[field.field] ?? '' : '';
        const validators = field.required ? [Validators.required] : [];
        group[field.field] = new FormControl(value, validators);
      }
    }

    // If we have a JSON schema from the backend, fill in missing fields
    if (this.screenDef.entity_schema?.properties && !sections.length) {
      for (const [key, prop] of Object.entries(this.screenDef.entity_schema.properties) as [string, any][]) {
        if (!group[key] && !['id', 'uuid', 'creation_time', 'ts_vector', 'ts_vector_update_time'].includes(key)) {
          const value = data ? data[key] ?? '' : '';
          group[key] = new FormControl(value);
        }
      }
    }

    this.form = new FormGroup(group);
  }

  get formSections(): any[] {
    return this.screenDef?.definition?.sections || [];
  }

  /**
   * If no sections are defined but entity_schema exists, auto-generate fields.
   */
  get autoFields(): { field: string; label: string; type: string }[] {
    if (this.formSections.length) return [];
    const schema = this.screenDef?.entity_schema;
    if (!schema?.properties) return [];

    const skip = new Set(['id', 'uuid', 'creation_time', 'ts_vector', 'ts_vector_update_time']);
    return Object.entries(schema.properties)
      .filter(([key]) => !skip.has(key))
      .map(([key, prop]: [string, any]) => ({
        field: key,
        label: key.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase()),
        type: prop.type === 'integer' || prop.type === 'number' ? 'number' : 'text',
      }));
  }

  onSubmitForm(): void {
    if (!this.form || this.form.invalid) return;

    this.formSaving = true;
    const svc = this.backendService as any;
    const baseUrl = svc.base_url.replace(/\/api$/, '') + this.endpoint;
    const body = this.form.value;
    const opts = svc.globalVariablesService?.authOptions ?? {};

    const req$ = this.entityId
      ? this.http.put(`${baseUrl}/${this.entityId}`, body, opts)
      : this.http.post(`${baseUrl}/`, body, opts);

    req$.subscribe({
      next: () => {
        this.messageService.success(this.entityId ? 'Updated' : 'Created');
        this.formSaving = false;
        // Navigate back to browser
        const browserName = this.screenDef.name?.replace('_form', '_browser');
        if (browserName) {
          this.router.navigate(['/d', browserName]);
        }
      },
      error: (err: any) => {
        this.messageService.error(err?.error?.detail || 'Error saving');
        this.formSaving = false;
      },
    });
  }

  onCancel(): void {
    const browserName = this.screenDef.name?.replace('_form', '_browser');
    if (browserName) {
      this.router.navigate(['/d', browserName]);
    } else {
      window.history.back();
    }
  }

  // ------------------------------------------------------------------
  // Computed helpers for template
  // ------------------------------------------------------------------

  get browserColumns(): string[] {
    return (this.screenDef?.definition?.columns || []).map((c: any) => c.field);
  }

  get hasCreateAction(): boolean {
    return (this.screenDef?.definition?.actions || []).includes('create');
  }

  get hasDeleteAction(): boolean {
    return (this.screenDef?.definition?.actions || []).includes('delete');
  }

  get hasEditAction(): boolean {
    return (this.screenDef?.definition?.actions || []).includes('edit');
  }

  get hasViewAction(): boolean {
    return (this.screenDef?.definition?.actions || []).includes('view');
  }

  get bulkColumns(): ScreenEditableColumn[] {
    return (this.screenDef?.definition?.columns || []) as ScreenEditableColumn[];
  }

  /** Endpoint without the `/api/` prefix — EntityClient adds it back. */
  get bulkEntityPath(): string {
    const ep = this.endpoint || '';
    return ep.replace(/^\/api/, '').replace(/\/$/, '');
  }
}
