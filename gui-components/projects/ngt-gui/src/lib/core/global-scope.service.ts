import { Inject, Injectable, Injector, Optional, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, Subject, firstValueFrom, of } from 'rxjs';
import { catchError, map, tap } from 'rxjs/operators';

import { GLOBAL_SERVICE } from '../tokens/global.token';
import { STATE_SERVICE } from '../tokens/state.token';
import { GlobalServiceInterface } from '../interfaces/global/global.interface';
import { GlobalService } from './global.service';
import {
  AppliedScope,
  GlobalScopeDefinition,
  ScopeOption,
} from '../interfaces/scope/global-scope.interface';

const STORAGE_KEY = 'ngt-global-scopes';

/**
 * Global work scopes: the "zone / project / case study" the user pins once in
 * the header so that everything they see afterwards is narrowed to it.
 *
 * The backend declares the scopes and, for each, the entities it applies to
 * and through which field (`GET /gui/scopes`, derived from the ORM foreign
 * keys). This service only keeps the selection and answers, for any entity
 * path, "which filter and which default values does the current selection
 * imply?". It knows nothing about the domain: with no scopes declared it
 * answers "none" and the header shows no selector.
 */
@Injectable({ providedIn: 'root' })
export class GlobalScopeService {
  private readonly global: GlobalServiceInterface;

  /** Scopes the backend declares, in display order. */
  readonly scopes = signal<GlobalScopeDefinition[]>([]);
  /** Current selection, by scope name. */
  readonly selection = signal<Record<string, ScopeOption>>({});

  private readonly changed = new Subject<void>();
  /** Emits whenever what a listing should show may have changed. */
  readonly changes$ = this.changed.asObservable();

  constructor(
    private readonly http: HttpClient,
    private readonly injector: Injector,
    @Optional() @Inject(GLOBAL_SERVICE) injectedGlobal: GlobalServiceInterface,
    defaultGlobal: GlobalService,
  ) {
    this.global = injectedGlobal || defaultGlobal;
  }

  // ------------------------------------------------------------------ loading

  /** Fetch the declared scopes and restore the remembered selection. */
  async load(): Promise<void> {
    let declared: GlobalScopeDefinition[] = [];
    try {
      const response = await firstValueFrom(
        this.http.get<{ content: GlobalScopeDefinition[] | null }>(
          this.apiBase() + '/gui/scopes', this.authOptions(),
        ),
      );
      declared = response?.content ?? [];
    } catch {
      // No scopes endpoint (older backend) or not reachable: the application
      // simply runs unscoped.
      declared = [];
    }
    this.scopes.set(declared);

    const remembered = this.readStorage();
    const restored: Record<string, ScopeOption> = {};
    for (const scope of declared) {
      if (remembered[scope.name]) {
        restored[scope.name] = remembered[scope.name];
      } else if (scope.state_key) {
        // Selection made before scopes existed, kept in the legacy state.
        const legacy = this.legacyState()?.getState?.(scope.state_key);
        if (legacy !== undefined && legacy !== null && legacy !== '') {
          restored[scope.name] = { id: legacy as number | string, label: '' };
        }
      }
    }
    this.selection.set(restored);
    for (const scope of declared) this.mirrorLegacyState(scope);
    this.changed.next();
  }

  /** Forget the declared scopes (logout). The remembered selection is kept. */
  reset(): void {
    this.scopes.set([]);
    this.selection.set({});
    this.changed.next();
  }

  /**
   * Records the user can choose for a scope. Also reconciles the selection
   * with them: a selected record that no longer exists is dropped, and its
   * label is refreshed.
   */
  options(scope: GlobalScopeDefinition): Observable<ScopeOption[]> {
    const url = this.apiBase() + this.normalize(scope.endpoint) + '/';
    return this.http.get<{ content: Record<string, unknown>[] | null }>(url, this.authOptions()).pipe(
      map(response => (response?.content ?? []).map(item => {
        const id = item[scope.value_field] as number | string;
        const label = item[scope.label_field];
        return { id, label: label === undefined || label === null ? String(id) : String(label) };
      })),
      tap(options => this.reconcile(scope, options)),
      catchError(() => of([] as ScopeOption[])),
    );
  }

  // ---------------------------------------------------------------- selection

  selected(scopeName: string): ScopeOption | null {
    return this.selection()[scopeName] ?? null;
  }

  /** Pin `option` as the scope's value, or clear the scope with `null`. */
  select(scopeName: string, option: ScopeOption | null): void {
    const scope = this.scopes().find(s => s.name === scopeName);
    if (!scope) return;
    const current = this.selected(scopeName);
    if ((current?.id ?? null) === (option?.id ?? null) && (current?.label ?? '') === (option?.label ?? '')) {
      return;
    }

    const next = { ...this.selection() };
    if (option) next[scopeName] = option; else delete next[scopeName];
    this.selection.set(next);
    this.writeStorage(next);
    this.mirrorLegacyState(scope);
    this.changed.next();
  }

  // -------------------------------------------------- what a selection implies

  /** Active scopes that narrow the entity served at `entityPath`. */
  appliedTo(entityPath: string): AppliedScope[] {
    const path = this.normalize(entityPath);
    const applied: AppliedScope[] = [];
    for (const scope of this.scopes()) {
      const option = this.selected(scope.name);
      if (!option) continue;
      const target = scope.targets.find(t => this.normalize(t.endpoint) === path);
      if (target) applied.push({ scope, target, option });
    }
    return applied;
  }

  /** Listing filter for the entity, in the backend's filter DSL. Scopes combine with AND. */
  filterFor(entityPath: string): Record<string, unknown> {
    const filter: Record<string, unknown> = {};
    for (const { target, option } of this.appliedTo(entityPath)) {
      filter[target.field] = option.id;
    }
    return filter;
  }

  /**
   * Values a NEW record of the entity should start with. Only foreign-key
   * targets: a membership (N:M) is not a field of the record.
   */
  defaultsFor(entityPath: string): Record<string, unknown> {
    const defaults: Record<string, unknown> = {};
    for (const { target, option } of this.appliedTo(entityPath)) {
      if (target.kind === 'fk') defaults[target.field] = option.id;
    }
    return defaults;
  }

  // ------------------------------------------------------------------ helpers

  private reconcile(scope: GlobalScopeDefinition, options: ScopeOption[]): void {
    const current = this.selected(scope.name);
    if (!current) return;
    // eslint-disable-next-line eqeqeq -- ids restored from storage/legacy state may be strings
    const match = options.find(o => o.id == current.id);
    this.select(scope.name, match ?? null);
  }

  /** `/api/plants/`, `http://host/api/plants` and `plants` all name `/plants`. */
  private normalize(path: string): string {
    let p = (path || '').trim().replace(/^https?:\/\/[^/]+/i, '').split('?')[0];
    const prefix = this.apiPrefix();
    if (prefix && (p === prefix || p.startsWith(prefix + '/'))) p = p.slice(prefix.length);
    p = p.replace(/\/+$/, '');
    return p.startsWith('/') ? p : '/' + p;
  }

  private apiPrefix(): string {
    return String(this.global.getParameter('api_prefix') ?? '/api').replace(/\/+$/, '');
  }

  private apiBase(): string {
    return String(this.global.getParameter('host') ?? '') + this.apiPrefix();
  }

  private authOptions(): object {
    return (this.global.authOptions as object) || {};
  }

  /** Screens older than scopes read the selection from the global state. */
  private mirrorLegacyState(scope: GlobalScopeDefinition): void {
    if (!scope.state_key) return;
    const state = this.legacyState();
    if (!state?.setState) return;
    const value = this.selected(scope.name)?.id ?? null;
    if ((state.getState?.(scope.state_key) ?? null) === value) return;
    try {
      void Promise.resolve(state.setState(scope.state_key, value)).catch(() => undefined);
    } catch {
      // The legacy state is a courtesy; never let it break scoping.
    }
  }

  private legacyState(): { getState?: (k: string) => unknown; setState?: (k: string, v: unknown) => unknown } | null {
    try {
      return this.injector.get(STATE_SERVICE, null, { optional: true }) as never;
    } catch {
      return null;
    }
  }

  private readStorage(): Record<string, ScopeOption> {
    try {
      const parsed = JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}');
      return parsed && typeof parsed === 'object' ? parsed : {};
    } catch {
      return {};
    }
  }

  private writeStorage(value: Record<string, ScopeOption>): void {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(value));
    } catch {
      // Storage unavailable (private mode): the selection lives for the session.
    }
  }
}
