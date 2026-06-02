import { Inject, Injectable, Optional } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { map, shareReplay } from 'rxjs/operators';

import { GLOBAL_SERVICE } from '../tokens/global.token';
import { GlobalServiceInterface } from '../interfaces/global/global.interface';
import { GlobalService } from './global.service';
import { EntityClient } from './entity-client.service';
import {
  ApiResponse,
  SchemaBundle,
  firstError,
  hasErrors,
} from '../interfaces/backend/api-contract';

/**
 * Loads and caches JSON Schemas served by `/<entity>/schema.json`.
 * Consumed by the Formly layer (Incremento 3) to render forms dynamically.
 */
@Injectable({ providedIn: 'root' })
export class SchemaService {
  private readonly cache = new Map<string, Observable<unknown>>();
  private bundle$?: Observable<SchemaBundle>;
  private readonly global: GlobalServiceInterface;

  constructor(
    private readonly entityClient: EntityClient,
    private readonly http: HttpClient,
    @Optional() @Inject(GLOBAL_SERVICE) injected: GlobalServiceInterface,
    defaultGlobal: GlobalService,
  ) {
    this.global = injected || defaultGlobal;
  }

  get<T = unknown>(entityPath: string, options: { reload?: boolean } = {}): Observable<T> {
    const key = this.normalize(entityPath);
    if (options.reload) this.cache.delete(key);

    if (!this.cache.has(key)) {
      const fetch$ = this.entityClient.for<unknown>(key).schema<T>().pipe(
        map((response: ApiResponse<T>) => {
          if (hasErrors(response)) {
            throw new Error(firstError(response)?.message ?? 'Schema fetch failed');
          }
          if (response.content === null || response.content === undefined) {
            throw new Error(`Empty schema returned for "${key}"`);
          }
          return response.content as T;
        }),
        shareReplay({ bufferSize: 1, refCount: false }),
      );
      this.cache.set(key, fetch$ as Observable<unknown>);
    }

    return this.cache.get(key) as Observable<T>;
  }

  invalidate(entityPath?: string): void {
    if (!entityPath) {
      this.cache.clear();
      return;
    }
    this.cache.delete(this.normalize(entityPath));
  }

  /**
   * Fetch the project-wide bundle of every registered entity schema. Cached
   * with `shareReplay` so multiple subscribers share the same HTTP call.
   *
   * Call with `{ reload: true }` to force a refresh.
   */
  getBundle(options: { reload?: boolean } = {}): Observable<SchemaBundle> {
    if (options.reload) this.bundle$ = undefined;
    if (!this.bundle$) {
      const url = this.global.getParameter('host') + this.global.getParameter('api_prefix') + '/sys/schemas';
      const request$ = this.http.get<ApiResponse<SchemaBundle>>(
        url,
        (this.global.authOptions as object) || {},
      ) as Observable<ApiResponse<SchemaBundle>>;
      this.bundle$ = request$.pipe(
        map(response => {
          if (hasErrors(response)) {
            throw new Error(firstError(response)?.message ?? 'Bundle fetch failed');
          }
          if (!response.content) {
            throw new Error('Empty schema bundle');
          }
          return response.content;
        }),
        shareReplay({ bufferSize: 1, refCount: false }),
      );
    }
    return this.bundle$;
  }

  invalidateBundle(): void {
    this.bundle$ = undefined;
  }

  private normalize(path: string): string {
    return path.startsWith('/') ? path : `/${path}`;
  }
}
