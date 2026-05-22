import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';

@Component({
  selector: 'app-empty-state',
  standalone: true,
  imports: [CommonModule, RouterModule, MatIconModule, MatButtonModule],
  template: `
    <div class="empty-state">
      <mat-icon class="empty-icon">{{ icon }}</mat-icon>
      <h3>{{ title }}</h3>
      <p>{{ message }}</p>
      <a *ngIf="ctaLabel && ctaRoute" mat-raised-button color="primary" [routerLink]="ctaRoute">
        {{ ctaLabel }}
      </a>
    </div>
  `,
  styles: [`
    .empty-state {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      padding: 60px 24px;
      text-align: center;
      color: var(--color-text-muted, #6b7280);
    }

    .empty-icon {
      font-size: 64px;
      width: 64px;
      height: 64px;
      opacity: 0.3;
      margin-bottom: 20px;
    }

    h3 {
      font-size: var(--text-h2, 1.25rem);
      font-weight: 600;
      color: var(--color-text, #1f2937);
      margin: 0 0 8px;
    }

    p {
      font-size: var(--text-body, 1rem);
      margin: 0 0 24px;
      max-width: 320px;
      line-height: 1.6;
    }
  `]
})
export class EmptyStateComponent {
  @Input() icon = 'inbox';
  @Input() title = 'Nothing here yet';
  @Input() message = '';
  @Input() ctaLabel = '';
  @Input() ctaRoute = '';
}
