import { Component, OnInit, ChangeDetectionStrategy, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatDialogModule, MatDialog } from '@angular/material/dialog';
import { RouterModule } from '@angular/router';
import { ProUsersService, LinkedUser } from '../../services/pro-users.service';
import { Auth } from '../../core/services/auth';
import { ConfirmDialogComponent } from '../../shared/confirm-dialog/confirm-dialog.component';

@Component({
  selector: 'app-my-clients',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, MatIconModule, MatButtonModule, MatProgressSpinnerModule,
    MatTooltipModule, MatSnackBarModule, MatDialogModule, RouterModule],
  template: `
    <div class="mc-wrapper">
      <div class="mc-header">
        <div class="mc-title">
          <a routerLink="/my-jobs-pro" mat-icon-button class="back-btn">
            <mat-icon>arrow_back</mat-icon>
          </a>
          <h1>My Clients</h1>
        </div>
        <span class="mc-subtitle">Users you have worked with</span>
      </div>

      <div *ngIf="loading" class="mc-loading">
        <mat-spinner diameter="40"></mat-spinner>
      </div>

      <div *ngIf="!loading && clients.length === 0" class="mc-empty">
        <mat-icon>group_off</mat-icon>
        <p>No clients linked yet. Clients appear here once an admin links them or you complete jobs together.</p>
      </div>

      <div *ngIf="!loading && clients.length > 0" class="mc-list">
        <div class="mc-card" *ngFor="let c of clients">
          <div class="mc-avatar">
            <mat-icon>person</mat-icon>
          </div>
          <div class="mc-info">
            <div class="mc-name">{{ c.name }}</div>
            <div class="mc-email">{{ c.email }}</div>
            <div class="mc-meta">
              <span *ngIf="c.phoneNumber" class="mc-phone">{{ c.phoneNumber }}</span>
              <span class="mc-badge" [class.verified]="c.isEmailVerified" [class.unverified]="!c.isEmailVerified">
                <mat-icon>{{ c.isEmailVerified ? 'verified' : 'unpublished' }}</mat-icon>
                {{ c.isEmailVerified ? 'Email verified' : 'Email unverified' }}
              </span>
            </div>
          </div>
          <button mat-icon-button color="warn" matTooltip="Remove client"
                  (click)="confirmRemove(c)">
            <mat-icon>person_remove</mat-icon>
          </button>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .mc-wrapper {
      max-width: 720px;
      margin: 2rem auto;
      padding: 0 1rem;
    }

    .mc-header {
      margin-bottom: 2rem;
    }

    .mc-title {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      h1 { margin: 0; font-size: 1.75rem; }
    }

    .back-btn { color: inherit; }

    .mc-subtitle {
      display: block;
      margin-top: 4px;
      padding-left: 48px;
      font-size: 0.9rem;
      color: #666;
    }

    .mc-loading, .mc-empty {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 1rem;
      padding: 4rem 0;
      color: #888;
      mat-icon { font-size: 3rem; width: 3rem; height: 3rem; }
      p { margin: 0; text-align: center; max-width: 380px; }
    }

    .mc-list {
      display: flex;
      flex-direction: column;
      gap: 8px;
    }

    .mc-card {
      display: flex;
      align-items: center;
      gap: 1rem;
      padding: 1rem 1.25rem;
      background: white;
      border-radius: 10px;
      box-shadow: 0 1px 4px rgba(0,0,0,.08);
    }

    .mc-avatar {
      flex-shrink: 0;
      width: 44px;
      height: 44px;
      border-radius: 50%;
      background: #e8eeff;
      display: flex;
      align-items: center;
      justify-content: center;
      mat-icon { color: #667eea; }
    }

    .mc-info {
      flex: 1;
      min-width: 0;
    }

    .mc-name { font-weight: 600; font-size: 1rem; }
    .mc-email { font-size: 0.85rem; color: #555; margin: 2px 0; }

    .mc-meta {
      display: flex;
      align-items: center;
      gap: 0.75rem;
      margin-top: 4px;
    }

    .mc-phone { font-size: 0.8rem; color: #888; }

    .mc-badge {
      display: flex;
      align-items: center;
      gap: 3px;
      font-size: 0.75rem;
      font-weight: 500;

      mat-icon { font-size: 14px; width: 14px; height: 14px; }

      &.verified { color: #2e7d32; }
      &.unverified { color: #b71c1c; }
    }
  `]
})
export class MyClientsComponent implements OnInit {
  clients: LinkedUser[] = [];
  loading = true;
  private proId!: number;

  constructor(
    private proUsersService: ProUsersService,
    private auth: Auth,
    private dialog: MatDialog,
    private snack: MatSnackBar,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit(): void {
    this.proId = Number(this.auth.getUserId());
    this.load();
  }

  load(): void {
    this.loading = true;
    this.proUsersService.getUsersUnderPro(this.proId).subscribe({
      next: (res) => {
        this.clients = Array.isArray(res) ? res : (res as any)?.$values ?? [];
        this.loading = false;
        this.cdr.markForCheck();
      },
      error: () => { this.loading = false; this.cdr.markForCheck(); }
    });
  }

  confirmRemove(client: LinkedUser): void {
    const ref = this.dialog.open(ConfirmDialogComponent, {
      data: { message: `Remove ${client.name} from your clients?` }
    });
    ref.afterClosed().subscribe(confirmed => {
      if (!confirmed) return;
      this.proUsersService.removeUserFromPro(this.proId, client.id).subscribe({
        next: () => {
          this.clients = this.clients.filter(c => c.id !== client.id);
          this.snack.open('Client removed.', 'OK', { duration: 3000 });
          this.cdr.markForCheck();
        },
        error: () => this.snack.open('Failed to remove client.', 'OK', { duration: 3000 })
      });
    });
  }
}
