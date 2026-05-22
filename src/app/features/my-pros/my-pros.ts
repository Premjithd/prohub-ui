import { Component, OnInit, ChangeDetectionStrategy, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { ProUsersService, LinkedPro } from '../../services/pro-users.service';
import { Auth } from '../../core/services/auth';

@Component({
  selector: 'app-my-pros',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, RouterModule, MatIconModule, MatButtonModule, MatProgressSpinnerModule],
  template: `
    <div class="mp-wrapper">
      <div class="mp-header">
        <div class="mp-title">
          <a routerLink="/pending-jobs" mat-icon-button class="back-btn">
            <mat-icon>arrow_back</mat-icon>
          </a>
          <h1>My Professionals</h1>
        </div>
        <span class="mp-subtitle">Professionals you have worked with</span>
      </div>

      <div *ngIf="loading" class="mp-loading">
        <mat-spinner diameter="40"></mat-spinner>
      </div>

      <div *ngIf="!loading && pros.length === 0" class="mp-empty">
        <mat-icon>engineering</mat-icon>
        <p>No professionals linked yet. They appear here once you complete a job together.</p>
      </div>

      <div *ngIf="!loading && pros.length > 0" class="mp-list">
        <div class="mp-card" *ngFor="let p of pros">
          <div class="mp-avatar">
            <mat-icon>engineering</mat-icon>
          </div>
          <div class="mp-info">
            <div class="mp-name">{{ p.name }}</div>
            <div class="mp-business" *ngIf="p.businessName">{{ p.businessName }}</div>
            <div class="mp-email">{{ p.email }}</div>
            <div class="mp-meta">
              <span *ngIf="p.phoneNumber" class="mp-phone">{{ p.phoneNumber }}</span>
              <span class="mp-badge" [class.verified]="p.isEmailVerified" [class.unverified]="!p.isEmailVerified">
                <mat-icon>{{ p.isEmailVerified ? 'verified' : 'unpublished' }}</mat-icon>
                {{ p.isEmailVerified ? 'Verified' : 'Unverified' }}
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .mp-wrapper {
      max-width: 720px;
      margin: 2rem auto;
      padding: 0 1rem;
    }

    .mp-header { margin-bottom: 2rem; }

    .mp-title {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      h1 { margin: 0; font-size: 1.75rem; }
    }

    .back-btn { color: inherit; }

    .mp-subtitle {
      display: block;
      margin-top: 4px;
      padding-left: 48px;
      font-size: 0.9rem;
      color: #666;
    }

    .mp-loading, .mp-empty {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 1rem;
      padding: 4rem 0;
      color: #888;
      mat-icon { font-size: 3rem; width: 3rem; height: 3rem; }
      p { margin: 0; text-align: center; max-width: 380px; }
    }

    .mp-list { display: flex; flex-direction: column; gap: 8px; }

    .mp-card {
      display: flex;
      align-items: center;
      gap: 1rem;
      padding: 1rem 1.25rem;
      background: white;
      border-radius: 10px;
      box-shadow: 0 1px 4px rgba(0,0,0,.08);
    }

    .mp-avatar {
      flex-shrink: 0;
      width: 44px;
      height: 44px;
      border-radius: 50%;
      background: #e8f5e9;
      display: flex;
      align-items: center;
      justify-content: center;
      mat-icon { color: #388e3c; }
    }

    .mp-info { flex: 1; min-width: 0; }
    .mp-name { font-weight: 600; font-size: 1rem; }
    .mp-business { font-size: 0.88rem; color: #444; margin: 1px 0; }
    .mp-email { font-size: 0.83rem; color: #666; }

    .mp-meta {
      display: flex;
      align-items: center;
      gap: 0.75rem;
      margin-top: 4px;
    }

    .mp-phone { font-size: 0.8rem; color: #888; }

    .mp-badge {
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
export class MyProsComponent implements OnInit {
  pros: LinkedPro[] = [];
  loading = true;
  private userId!: number;

  constructor(
    private proUsersService: ProUsersService,
    private auth: Auth,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit(): void {
    this.userId = Number(this.auth.getUserId());
    this.proUsersService.getProsForUser(this.userId).subscribe({
      next: (res) => {
        this.pros = Array.isArray(res) ? res : (res as any)?.$values ?? [];
        this.loading = false;
        this.cdr.markForCheck();
      },
      error: () => { this.loading = false; this.cdr.markForCheck(); }
    });
  }
}
