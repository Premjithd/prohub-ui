import { Component, OnInit, OnDestroy, ChangeDetectionStrategy, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterModule } from '@angular/router';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatChipsModule } from '@angular/material/chips';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { NotificationService, JobNotification } from '../../services/notification.service';
import { SignalRService } from '../../services/signalr.service';

@Component({
  selector: 'app-notifications',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, RouterModule, MatIconModule, MatButtonModule, MatProgressSpinnerModule, MatChipsModule],
  template: `
    <div class="notif-wrapper">
      <div class="notif-header">
        <h1>Notifications</h1>
        <button mat-stroked-button (click)="markAllRead()" [disabled]="unreadCount === 0">
          <mat-icon>done_all</mat-icon> Mark all read
        </button>
      </div>

      <div *ngIf="loading" class="notif-loading">
        <mat-spinner diameter="40"></mat-spinner>
      </div>

      <div *ngIf="!loading && notifications.length === 0" class="notif-empty">
        <mat-icon>notifications_none</mat-icon>
        <p>No notifications yet. New job postings that match your services will appear here.</p>
      </div>

      <div *ngIf="!loading && notifications.length > 0" class="notif-list">
        <div *ngFor="let n of notifications"
             class="notif-item"
             [class.unread]="!n.isRead"
             (click)="openNotification(n)">
          <div class="notif-icon">
            <mat-icon>{{ n.notificationType === 'JobPosted' ? 'work' : 'notifications' }}</mat-icon>
          </div>
          <div class="notif-body">
            <p class="notif-message">{{ n.message }}</p>
            <span class="notif-time">{{ n.createdAt | date: 'MMM d, y, h:mm a' }}</span>
          </div>
          <div class="notif-status">
            <span *ngIf="!n.isRead" class="unread-dot"></span>
          </div>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .notif-wrapper {
      max-width: 720px;
      margin: 2rem auto;
      padding: 0 1rem;
    }

    .notif-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 1.5rem;

      h1 { margin: 0; font-size: var(--text-h1, 1.75rem); }
    }

    .notif-loading, .notif-empty {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 1rem;
      padding: 4rem 0;
      color: #888;

      mat-icon { font-size: 3rem; width: 3rem; height: 3rem; }
      p { margin: 0; text-align: center; }
    }

    .notif-list {
      display: flex;
      flex-direction: column;
      gap: 2px;
    }

    .notif-item {
      display: flex;
      align-items: center;
      gap: 1rem;
      padding: 1rem 1.25rem;
      background: white;
      border-radius: 8px;
      cursor: pointer;
      transition: background 0.15s;

      &:hover { background: #f5f5f5; }

      &.unread {
        background: #f0f4ff;
        &:hover { background: #e8eeff; }
      }

      .notif-icon {
        flex-shrink: 0;
        width: 40px;
        height: 40px;
        border-radius: 50%;
        background: #e8eeff;
        display: flex;
        align-items: center;
        justify-content: center;

        mat-icon { color: #667eea; }
      }

      .notif-body {
        flex: 1;
        min-width: 0;

        .notif-message {
          margin: 0 0 4px;
          font-size: 0.95rem;
          color: #333;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }

        .notif-time {
          font-size: 0.8rem;
          color: #888;
        }
      }

      .notif-status {
        flex-shrink: 0;

        .unread-dot {
          display: block;
          width: 10px;
          height: 10px;
          border-radius: 50%;
          background: #667eea;
        }
      }
    }
  `]
})
export class NotificationsComponent implements OnInit, OnDestroy {
  notifications: JobNotification[] = [];
  loading = true;
  unreadCount = 0;
  private destroy$ = new Subject<void>();

  constructor(
    private notificationService: NotificationService,
    private signalRService: SignalRService,
    private router: Router,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit(): void {
    this.load();
    this.signalRService.onNewNotification$.pipe(
      takeUntil(this.destroy$)
    ).subscribe(() => this.load());
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  load(): void {
    this.loading = true;
    this.notificationService.getNotifications().subscribe({
      next: (res) => {
        // handle both wrapped ($values) and plain array responses
        const raw = (res as any)?.notifications;
        this.notifications = Array.isArray(raw) ? raw
          : (raw?.$values ?? []);
        this.unreadCount = this.notifications.filter(n => !n.isRead).length;
        this.loading = false;
        this.cdr.markForCheck();
      },
      error: () => { this.loading = false; this.cdr.markForCheck(); }
    });
  }

  openNotification(n: JobNotification): void {
    if (!n.isRead) {
      this.notificationService.markRead(n.id).subscribe(() => {
        n.isRead = true;
        this.unreadCount = Math.max(0, this.unreadCount - 1);
        this.cdr.markForCheck();
      });
    }
    if (n.jobId) {
      this.router.navigate(['/available-jobs']);
    }
  }

  markAllRead(): void {
    this.notificationService.markAllRead().subscribe(() => {
      this.notifications.forEach(n => n.isRead = true);
      this.unreadCount = 0;
      this.cdr.markForCheck();
    });
  }
}
