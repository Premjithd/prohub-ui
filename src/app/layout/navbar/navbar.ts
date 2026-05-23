import { Component, EventEmitter, OnInit, OnDestroy, Output } from '@angular/core';
import { RouterModule } from '@angular/router';
import { CommonModule } from '@angular/common';
import { MatToolbarModule } from '@angular/material/toolbar';
import { MatMenuModule } from '@angular/material/menu';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatBadgeModule } from '@angular/material/badge';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { Auth } from '../../core/services/auth';
import { NotificationService } from '../../services/notification.service';
import { SignalRService } from '../../services/signalr.service';
import { Router } from '@angular/router';
import { Subject, interval } from 'rxjs';
import { takeUntil, startWith, switchMap } from 'rxjs/operators';

@Component({
  selector: 'app-navbar',
  standalone: true,
  imports: [
    CommonModule,
    RouterModule,
    MatToolbarModule,
    MatButtonModule,
    MatIconModule,
    MatBadgeModule,
    MatMenuModule,
    MatSnackBarModule
  ],
  templateUrl: './navbar.html',
  styleUrl: './navbar.scss'
})
export class NavbarComponent implements OnInit, OnDestroy {
  @Output() toggleSidenav = new EventEmitter<void>();

  unreadCount = 0;
  private destroy$ = new Subject<void>();

  constructor(
    public auth: Auth,
    private router: Router,
    private snackBar: MatSnackBar,
    private notificationService: NotificationService,
    private signalRService: SignalRService
  ) {}

  ngOnInit(): void {
    if (this.auth.isAuthenticated() && this.auth.getUserType() === 'Pro') {
      this.startNotificationPolling();
      this.connectSignalR();
    }
  }

  private startNotificationPolling(): void {
    interval(60000).pipe(
      startWith(0),
      switchMap(() => this.notificationService.getUnreadCount()),
      takeUntil(this.destroy$)
    ).subscribe({ next: (r) => { this.unreadCount = r.count; } });
  }

  private connectSignalR(): void {
    const token = this.auth.getToken();
    if (!token) return;
    this.signalRService.connect(token);
    this.signalRService.onNewNotification$.pipe(
      takeUntil(this.destroy$)
    ).subscribe(() => {
      this.notificationService.getUnreadCount().subscribe({
        next: (r) => { this.unreadCount = r.count; }
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

  private _clearAndRedirect(): void {
    this.auth.logout();
    this.snackBar.open('You have been signed out.', '', {
      duration: 3000,
      horizontalPosition: 'center',
      verticalPosition: 'bottom',
      panelClass: ['snack-info']
    });
    this.router.navigate(['/']);
  }
}
