import { Component } from '@angular/core';
import { RouterModule } from '@angular/router';
import { CommonModule } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';
import { Auth } from '../../core/services/auth';

@Component({
  selector: 'app-bottom-nav',
  standalone: true,
  imports: [CommonModule, RouterModule, MatIconModule],
  templateUrl: './bottom-nav.html',
  styleUrl: './bottom-nav.scss'
})
export class BottomNavComponent {
  constructor(public auth: Auth) {}

  isProUser(): boolean {
    return this.auth.getUserType() === 'Pro';
  }

  isAdmin(): boolean {
    return this.auth.getUserType() === 'Admin';
  }
}
