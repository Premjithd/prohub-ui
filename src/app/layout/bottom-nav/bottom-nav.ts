import { Component, OnInit, OnDestroy, ChangeDetectorRef } from '@angular/core';
import { RouterModule, Router, NavigationEnd } from '@angular/router';
import { CommonModule } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';
import { TranslateModule } from '@ngx-translate/core';
import { Auth } from '../../core/services/auth';
import { NotificationService } from '../../services/notification.service';
import { SignalRService } from '../../services/signalr.service';
import { Subject, interval, of } from 'rxjs';
import { takeUntil, startWith, switchMap, catchError, filter, map, distinctUntilChanged } from 'rxjs/operators';

@Component({
  selector: 'app-bottom-nav',
  standalone: true,
  imports: [CommonModule, RouterModule, MatIconModule, TranslateModule],
  templateUrl: './bottom-nav.html',
  styleUrl: './bottom-nav.scss'
})
export class BottomNavComponent implements OnInit, OnDestroy {
  unreadCount = 0;
  private destroy$ = new Subject<void>();
  private signalRConnected = false;

  constructor(
    public auth: Auth,
    private router: Router,
    private notificationService: NotificationService,
    private signalRService: SignalRService,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit(): void {
    this.router.events.pipe(
      filter(e => e instanceof NavigationEnd),
      startWith(null),
      map(() => this.auth.isAuthenticated() && !this.isAdmin()),
      distinctUntilChanged(),
      switchMap(shouldPoll => {
        if (!shouldPoll) {
          this.unreadCount = 0;
          this.signalRConnected = false;
          return of(null);
        }
        if (this.isProUser() && !this.signalRConnected) {
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
  }

  isProUser(): boolean { return this.auth.getUserType() === 'Pro'; }
  isAdmin(): boolean { return this.auth.getUserType() === 'Admin'; }
}
