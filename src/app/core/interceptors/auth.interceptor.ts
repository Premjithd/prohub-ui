import { Injectable } from '@angular/core';
import {
  HttpRequest,
  HttpHandler,
  HttpEvent,
  HttpInterceptor,
  HttpErrorResponse,
  HttpClient,
  HttpBackend
} from '@angular/common/http';
import { BehaviorSubject, Observable, throwError } from 'rxjs';
import { catchError, filter, switchMap, take } from 'rxjs/operators';
import { StorageService } from '../services/storage';
import { Router } from '@angular/router';
import { environment } from '../../../environments/environment';

@Injectable()
export class AuthInterceptor implements HttpInterceptor {
  // Duplicated from Auth to avoid circular DI (Auth → ApiService → HttpClient → Interceptor → Auth)
  private readonly AUTH_TOKEN_KEY    = 'auth_token';
  private readonly REFRESH_TOKEN_KEY = 'refresh_token';
  private readonly ADMIN_TOKEN_KEY   = 'admin_restore_token';
  private readonly ADMIN_REFRESH_KEY = 'admin_restore_refresh_token';
  private readonly ADMIN_TYPE_KEY    = 'admin_restore_type';
  private readonly ADMIN_NAME_KEY    = 'admin_restore_name';
  private readonly ADMIN_ID_KEY      = 'admin_restore_id';
  private readonly USER_TYPE_KEY     = 'user_type';
  private readonly USER_NAME_KEY     = 'user_name';
  private readonly USER_ID_KEY       = 'user_id';

  private refreshing = false;
  private refreshSubject = new BehaviorSubject<string | null>(null);

  // HttpClient that bypasses interceptors — used for the refresh call to avoid circular requests
  private httpDirect: HttpClient;

  constructor(
    private storage: StorageService,
    private router: Router,
    httpBackend: HttpBackend
  ) {
    this.httpDirect = new HttpClient(httpBackend);
  }

  intercept(request: HttpRequest<unknown>, next: HttpHandler): Observable<HttpEvent<unknown>> {
    const token = this.storage.getItem(this.AUTH_TOKEN_KEY);
    if (token) {
      request = this.attachToken(request, token);
    }

    return next.handle(request).pipe(
      catchError((error: HttpErrorResponse) => {
        if (error.status === 401 && !this.isAuthUrl(request.url)) {
          return this.handle401(request, next);
        }
        return throwError(() => error);
      })
    );
  }

  private attachToken(req: HttpRequest<unknown>, token: string): HttpRequest<unknown> {
    return req.clone({ setHeaders: { Authorization: `Bearer ${token}` } });
  }

  private isAuthUrl(url: string): boolean {
    return url.includes('/auth/');
  }

  private handle401(
    request: HttpRequest<unknown>,
    next: HttpHandler
  ): Observable<HttpEvent<unknown>> {
    // Impersonation token expired — restore admin session silently
    if (this.storage.getItem(this.ADMIN_TOKEN_KEY)) {
      this.restoreAdminSession();
      this.router.navigate(['/admin-users']);
      return throwError(() => new Error('Impersonation session expired'));
    }

    const refreshToken = this.storage.getItem(this.REFRESH_TOKEN_KEY);
    if (!refreshToken) {
      this.clearAuth();
      this.router.navigate(['/login']);
      return throwError(() => new Error('Session expired — please log in again'));
    }

    // If a refresh is already in flight, queue this request until it completes
    if (this.refreshing) {
      return this.refreshSubject.pipe(
        filter(token => token !== null),
        take(1),
        switchMap(token => next.handle(this.attachToken(request, token!)))
      );
    }

    this.refreshing = true;
    this.refreshSubject.next(null);

    return this.httpDirect
      .post<{ accessToken: string; refreshToken: string }>(
        `${environment.apiUrl}/auth/refresh`,
        { refreshToken }
      )
      .pipe(
        switchMap(data => {
          this.storage.setItem(this.AUTH_TOKEN_KEY,    data.accessToken);
          this.storage.setItem(this.REFRESH_TOKEN_KEY, data.refreshToken);
          this.refreshSubject.next(data.accessToken);
          this.refreshing = false;
          return next.handle(this.attachToken(request, data.accessToken));
        }),
        catchError(err => {
          this.refreshing = false;
          this.clearAuth();
          this.router.navigate(['/login']);
          return throwError(() => err);
        })
      );
  }

  private restoreAdminSession(): void {
    const adminToken = this.storage.getItem(this.ADMIN_TOKEN_KEY);
    if (!adminToken) return;

    this.storage.setItem(this.AUTH_TOKEN_KEY, adminToken);
    this.storage.setItem(this.USER_TYPE_KEY,  this.storage.getItem(this.ADMIN_TYPE_KEY) ?? 'Admin');
    this.storage.setItem(this.USER_NAME_KEY,  this.storage.getItem(this.ADMIN_NAME_KEY) ?? '');
    this.storage.setItem(this.USER_ID_KEY,    this.storage.getItem(this.ADMIN_ID_KEY)   ?? '');

    const adminRefresh = this.storage.getItem(this.ADMIN_REFRESH_KEY);
    if (adminRefresh) this.storage.setItem(this.REFRESH_TOKEN_KEY, adminRefresh);
    else this.storage.removeItem(this.REFRESH_TOKEN_KEY);

    [this.ADMIN_TOKEN_KEY, this.ADMIN_REFRESH_KEY,
     this.ADMIN_TYPE_KEY, this.ADMIN_NAME_KEY, this.ADMIN_ID_KEY]
      .forEach(k => this.storage.removeItem(k));
  }

  private clearAuth(): void {
    [this.AUTH_TOKEN_KEY, this.REFRESH_TOKEN_KEY, this.USER_TYPE_KEY,
     this.USER_NAME_KEY, this.USER_ID_KEY, this.ADMIN_TOKEN_KEY,
     this.ADMIN_REFRESH_KEY, this.ADMIN_TYPE_KEY, this.ADMIN_NAME_KEY, this.ADMIN_ID_KEY]
      .forEach(k => this.storage.removeItem(k));
  }
}
