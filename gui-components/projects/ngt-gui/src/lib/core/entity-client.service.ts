import { Injectable, Inject, Optional } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';

import { GLOBAL_SERVICE } from '../tokens/global.token';
import { GlobalServiceInterface } from '../interfaces/global/global.interface';
import { GlobalService } from './global.service';
import { ApiResponse } from '../interfaces/backend/api-contract';

/**
 * Generic, schema-agnostic CRUD client for backend resources exposed via
 * `make_simple_rest_crud` / `make_crudie_rest_crud`. The shape of every
 * response is `ApiResponse<T>` (the backend ResponseEnvelope).
 *
 * Use `entityClient.for<MyType>('/my_entity')` to obtain a typed resource.
 */
@Injectable({ providedIn: 'root' })
export class EntityClient {
  private readonly global: GlobalServiceInterface;

  constructor(
    private readonly http: HttpClient,
    @Optional() @Inject(GLOBAL_SERVICE) injected: GlobalServiceInterface,
    defaultGlobal: GlobalService,
  ) {
    this.global = injected || defaultGlobal;
  }

  get baseUrl(): string {
    return this.global.getParameter('host') + this.global.getParameter('api_prefix');
  }

  for<T = unknown>(path: string): EntityResource<T> {
    return new EntityResource<T>(this.http, this.global, this.normalize(path));
  }

  private normalize(path: string): string {
    if (!path) return '/';
    return path.startsWith('/') ? path : `/${path}`;
  }
}

export class EntityResource<T = unknown> {
  constructor(
    private readonly http: HttpClient,
    private readonly global: GlobalServiceInterface,
    private readonly path: string,
  ) {}

  private url(suffix = ''): string {
    const base = this.global.getParameter('host') + this.global.getParameter('api_prefix');
    return `${base}${this.path}${suffix}`;
  }

  private params(input?: Record<string, unknown>): HttpParams {
    let p = new HttpParams();
    if (!input) return p;
    for (const [k, v] of Object.entries(input)) {
      if (v === undefined || v === null) continue;
      const value = typeof v === 'string' ? v : JSON.stringify(v);
      p = p.set(k, value);
    }
    return p;
  }

  private opts(extra?: Record<string, unknown>): { [key: string]: unknown } {
    return { ...((this.global.authOptions as object) || {}), ...(extra || {}) };
  }

  list(params?: Record<string, unknown>): Observable<ApiResponse<T[]>> {
    return this.http.get<ApiResponse<T[]>>(
      this.url('/'),
      this.opts({ params: this.params(params) }) as object,
    ) as Observable<ApiResponse<T[]>>;
  }

  get(id: string | number, params?: Record<string, unknown>): Observable<ApiResponse<T>> {
    return this.http.get<ApiResponse<T>>(
      this.url(`/${id}`),
      this.opts({ params: this.params(params) }) as object,
    ) as Observable<ApiResponse<T>>;
  }

  create(value: Partial<T>): Observable<ApiResponse<T>> {
    return this.http.post<ApiResponse<T>>(
      this.url('/'),
      value,
      this.opts() as object,
    ) as Observable<ApiResponse<T>>;
  }

  update(id: string | number, value: Partial<T>): Observable<ApiResponse<T>> {
    return this.http.put<ApiResponse<T>>(
      this.url(`/${id}`),
      value,
      this.opts() as object,
    ) as Observable<ApiResponse<T>>;
  }

  delete(id: string | number, softDelete = false): Observable<ApiResponse<unknown>> {
    return this.http.delete<ApiResponse<unknown>>(
      this.url(`/${id}`),
      this.opts({ params: this.params({ soft_delete: softDelete }) }) as object,
    ) as Observable<ApiResponse<unknown>>;
  }

  schema<S = unknown>(): Observable<ApiResponse<S>> {
    return this.http.get<ApiResponse<S>>(
      this.url('/schema.json'),
      this.opts() as object,
    ) as Observable<ApiResponse<S>>;
  }

  bulk(items: BulkItem[], onError: 'partial' | 'abort' = 'partial'): Observable<ApiResponse<BulkResponse>> {
    return this.http.post<ApiResponse<BulkResponse>>(
      this.url('/bulk'),
      items,
      this.opts({ params: this.params({ on_error: onError }) }) as object,
    ) as Observable<ApiResponse<BulkResponse>>;
  }
}

/** Shape accepted by the bulk endpoint — see uniback/api/crud_factory.py. */
export interface BulkItem {
  id?: string | number;
  data?: Record<string, unknown>;
  _op?: 'delete';
  [key: string]: unknown;
}

export interface BulkResultRow {
  idx: number;
  ok: boolean;
  op: 'create' | 'update' | 'delete' | null;
  id?: string | number | null;
  errors?: Array<{ type?: string; loc?: (string | number)[]; msg: string }>;
}

export interface BulkResponse {
  results: BulkResultRow[];
  summary: { created: number; updated: number; deleted: number; failed: number };
}
