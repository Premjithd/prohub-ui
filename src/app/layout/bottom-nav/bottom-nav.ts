import { Component, OnInit, OnDestroy } from '@angular/core';
import { RouterModule } from '@angular/router';
import { CommonModule } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';
import { MatBadgeModule } from '@angular/material/badge';
import { Auth } from '../../core/services/auth';
import { NotificationService } from '../../services/notification.service';
import { Subject, interval } from 'rxjs';
import { takeUntil, startWith, switchMap } from 'rxjs/operators';

@Component({
  selector: 'app-bottom-nav',
  standalone: true,
  imports: [CommonModule, RouterModule, MatIconModule, MatBadgeModule],
  templateUrl: './bottom-nav.html',
  styleUrl: './bottom-nav.scss'
})
export class BottomNavComponent implements OnInit, OnDestroy {
  unreadCount = 0;
  private destroy$ = new Subject<void>();

  constructor(public auth: Auth, private notificationService: NotificationService) {}

  ngOnInit(): void {
    if (this.isProUser()) {
      interval(30000).pipe(
        startWith(0),
        switchMap(() => this.notificationService.getUnreadCount()),
        takeUntil(this.destroy$)
      ).subscribe({ next: (r) => { this.unreadCount = r.count; } });
    }
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  isProUser(): boolean { return this.auth.getUserType() === 'Pro'; }
  isAdmin(): boolean { return this.auth.getUserType() === 'Admin'; }
}
