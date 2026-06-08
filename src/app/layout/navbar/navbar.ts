import { Component, EventEmitter, OnInit, OnDestroy, Output, ChangeDetectorRef, NgZone } from '@angular/core';
import { RouterModule, Router, NavigationEnd } from '@angular/router';
import { CommonModule } from '@angular/common';
import { MatToolbarModule } from '@angular/material/toolbar';
import { MatMenuModule } from '@angular/material/menu';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { Auth } from '../../core/services/auth';
import { LanguageService, AppLang } from '../../core/services/language.service';
import { NotificationService } from '../../services/notification.service';
import { SignalRService } from '../../services/signalr.service';
import { Subject, interval, of } from 'rxjs';
import { takeUntil, startWith, switchMap, catchError, filter, map, distinctUntilChanged } from 'rxjs/operators';

@Component({
  selector: 'app-navbar',
  standalone: true,
  imports: [
    CommonModule,
    RouterModule,
    MatToolbarModule,
    MatButtonModule,
    MatIconModule,
    MatMenuModule,
    MatSnackBarModule,
    TranslateModule
  ],
  templateUrl: './navbar.html',
  styleUrl: './navbar.scss'
})
export class NavbarComponent implements OnInit, OnDestroy {
  @Output() toggleSidenav = new EventEmitter<void>();

  unreadCount = 0;
  private destroy$ = new Subject<void>();
  private signalRConnected = false;

  readonly langs = [
    { code: 'en' as AppLang, label: 'EN' },
    { code: 'ml' as AppLang, label: 'ML' },
    { code: 'hi' as AppLang, label: 'HI' },
  ];

  constructor(
    public auth: Auth,
    public langService: LanguageService,
    private router: Router,
    private snackBar: MatSnackBar,
    private notificationService: NotificationService,
    private signalRService: SignalRService,
    private cdr: ChangeDetectorRef,
    private ngZone: NgZone,
    private translate: TranslateService
  ) {}

  ngOnInit(): void {
    this.router.events.pipe(
      filter(e => e instanceof NavigationEnd),
      startWith(null),
      map(() => this.auth.isAuthenticated()),
      distinctUntilChanged(),
      switchMap(isAuth => {
        if (!isAuth) {
          this.unreadCount = 0;
          this.signalRConnected = false;
          return of(null);
        }
        if (this.auth.getUserType() === 'Pro' && !this.signalRConnected) {
          this.connectSignalR();
        }
        return interval(60000).pipe(
          startWith(0),
          switchMap(() => this.notificationService.getUnreadCount().pipe(
            catchError(() => of({ count: this.unreadCount }))
          ))
        );
      }),
      takeUntil(this.destroy$)
    ).subscribe({ next: (r: any) => {
      if (r?.count !== undefined) {
        this.unreadCount = r.count;
        this.cdr.detectChanges();
      }
    } });
  }

  private connectSignalR(): void {
    const token = this.auth.getToken();
    if (!token) return;
    this.signalRConnected = true;
    this.signalRService.connect(token);
    this.signalRService.onNewNotification$.pipe(
      takeUntil(this.destroy$)
    ).subscribe(() => {
      this.notificationService.getUnreadCount().subscribe({
        next: (r) => { this.unreadCount = r.count; this.cdr.detectChanges(); }
      });
    });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
    this.signalRService.disconnect();
  }

  onToggleSidenav(): void {
    this.toggleSidenav.emit();
  }

  isProUser(): boolean {
    return this.auth.getUserType() === 'Pro';
  }

  onLogout(): void {
    this.auth.logoutOnServer().subscribe({
      complete: () => this._clearAndRedirect(),
      error: () => this._clearAndRedirect()
    });
  }

  switchLang(lang: AppLang): void {
    this.langService.use(lang);
    this.cdr.detectChanges();
  }

  private _clearAndRedirect(): void {
    this.auth.logout();
    this.ngZone.run(() => {
      this.snackBar.open(this.translate.instant('NAV.SIGN_OUT') + '.', '', {
        duration: 3000,
        horizontalPosition: 'center',
        verticalPosition: 'bottom',
        panelClass: ['snack-info']
      });
    });
    setTimeout(() => { window.location.href = '/'; }, 800);
  }
}
