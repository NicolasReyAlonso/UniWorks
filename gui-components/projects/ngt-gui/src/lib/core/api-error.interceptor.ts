import { Injectable } from '@angular/core';
import {
  HttpErrorResponse,
  HttpEvent,
  HttpHandler,
  HttpInterceptor,
  HttpRequest,
  HttpResponse,
} from '@angular/common/http';
import { Observable, of } from 'rxjs';
import { catchError, map } from 'rxjs/operators';

import { ApiResponse, Issue, IssueType } from '../interfaces/backend/api-contract';

/**
 * Normalizes HTTP errors into the ApiResponse envelope. Any non-2xx response
 * is turned into `ApiResponse<null>` with an `issues[]` array carrying the
 * server-provided Issues (when the body is already an envelope) or a synthetic
 * Issue derived from the HTTP status when the body is opaque.
 *
 * Components should subscribe to ApiResponse<T> and inspect `issues`, rather
 * than relying on `next/error` semantics of HttpClient.
 */
@Injectable()
export class ApiErrorInterceptor implements HttpInterceptor {
  intercept(req: HttpRequest<unknown>, next: HttpHandler): Observable<HttpEvent<unknown>> {
    return next.handle(req).pipe(
      map(event => {
        if (event instanceof HttpResponse && this.shouldNormalize(event.body)) {
          // Ensure missing `issues` becomes an empty array, so callers don't have to null-check.
          const body = event.body as Partial<ApiResponse<unknown>>;
          if (!Array.isArray(body.issues)) {
            return event.clone({ body: { ...body, issues: [] } as ApiResponse<unknown> });
          }
        }
        return event;
      }),
      catchError((err: HttpErrorResponse) => {
        const envelope = this.envelopeFromError(err);
        const synthetic = new HttpResponse({
          body: envelope,
          status: err.status || 0,
          statusText: err.statusText || 'Error',
          url: err.url ?? undefined,
        });
        return of<HttpEvent<unknown>>(synthetic);
      }),
    );
  }

  private shouldNormalize(body: unknown): body is Partial<ApiResponse<unknown>> {
    return !!body && typeof body === 'object' && 'content' in (body as object);
  }

  private envelopeFromError(err: HttpErrorResponse): ApiResponse<null> {
    const fromServer = this.shouldNormalize(err.error) ? (err.error as ApiResponse<null>) : null;
    if (fromServer) {
      return {
        content: null,
        count: 0,
        issues: Array.isArray(fromServer.issues) && fromServer.issues.length
          ? fromServer.issues
          : [this.syntheticIssue(err)],
      };
    }
    return {
      content: null,
      count: 0,
      issues: [this.syntheticIssue(err)],
    };
  }

  private syntheticIssue(err: HttpErrorResponse): Issue {
    const code = `HTTP_${err.status || 0}`;
    const message =
      err.status === 0
        ? 'Network error: backend unreachable'
        : (typeof err.error === 'string' && err.error) || err.message || err.statusText || 'Request failed';
    return { type: IssueType.ERROR, code, message };
  }
}
