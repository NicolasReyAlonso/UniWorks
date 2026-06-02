import { Injectable, Inject, Optional } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { BehaviorSubject, Observable, of } from 'rxjs';
import { catchError, map, shareReplay, tap } from 'rxjs/operators';

import { GLOBAL_SERVICE } from '../tokens/global.token';
import { GlobalServiceInterface } from '../interfaces/global/global.interface';
import { GlobalService } from './global.service';
import {
  ApiResponse,
  EntityDescriptor,
  ServiceDescriptor,
  firstError,
  hasErrors,
} from '../interfaces/backend/api-contract';

/**
 * Consumes the backend discovery endpoints to know, at runtime, which
 * services and CRUD entities are available. This is the cornerstone of the
 * "totally dynamic" framework promise.
 */
@Injectable({ providedIn: 'root' })
export class DiscoveryService {
  private readonly global: GlobalServiceInterface;

  private readonly entitiesSubject = new BehaviorSubject<EntityDescriptor[]>([]);
  readonly entities$ = this.entitiesSubject.asObservable();

  private readonly servicesSubject = new BehaviorSubject<ServiceDescriptor[]>([]);
  readonly services$ = this.servicesSubject.asObservable();

  private entitiesRequest$?: Observable<EntityDescriptor[]>;
  private servicesRequest$?: Observable<ServiceDescriptor[]>;

  constructor(
    private readonly http: HttpClient,
    @Optional() @Inject(GLOBAL_SERVICE) injected: GlobalServiceInterface,
    defaultGlobal: GlobalService,
  ) {
    this.global = injected || defaultGlobal;
  }

  loadEntities(force = false): Observable<EntityDescriptor[]> {
    if (force) this.entitiesRequest$ = undefined;
    if (!this.entitiesRequest$) {
      const request$ = this.http.get<ApiResponse<EntityDescriptor[]>>(
        this.url('/sys/entities'),
        (this.global.authOptions as object) || {},
      ) as Observable<ApiResponse<EntityDescriptor[]>>;
      this.entitiesRequest$ = request$.pipe(
        map(r => this.unwrap<EntityDescriptor>(r, 'Failed to load /sys/entities')),
        tap(items => this.entitiesSubject.next(items)),
        shareReplay({ bufferSize: 1, refCount: false }),
      );
    }
    return this.entitiesRequest$;
  }

  loadServices(force = false): Observable<ServiceDescriptor[]> {
    if (force) this.servicesRequest$ = undefined;
    if (!this.servicesRequest$) {
      const request$ = this.http.get<ApiResponse<ServiceDescriptor[]>>(
        this.url('/sys/discovery'),
        (this.global.authOptions as object) || {},
      ) as Observable<ApiResponse<ServiceDescriptor[]>>;
      this.servicesRequest$ = request$.pipe(
        map(r => this.unwrap<ServiceDescriptor>(r, 'Failed to load /sys/discovery')),
        tap(items => this.servicesSubject.next(items)),
        shareReplay({ bufferSize: 1, refCount: false }),
        catchError(() => {
          // discovery upstream (traefik) may be down; degrade gracefully
          this.servicesSubject.next([]);
          return of<ServiceDescriptor[]>([]);
        }),
      );
    }
    return this.servicesRequest$;
  }

  findEntity(name: string): EntityDescriptor | undefined {
    return this.entitiesSubject.value.find(e => e.name === name);
  }

  private url(path: string): string {
    return this.global.getParameter('host') + this.global.getParameter('api_prefix') + path;
  }

  private unwrap<T>(response: ApiResponse<T[]>, errorPrefix: string): T[] {
    if (hasErrors(response)) {
      throw new Error(`${errorPrefix}: ${firstError(response)?.message}`);
    }
    return (response.content as T[] | null) ?? [];
  }
}
