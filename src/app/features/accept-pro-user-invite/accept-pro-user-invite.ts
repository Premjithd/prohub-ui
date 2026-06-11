import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { Auth } from '../../core/services/auth';

@Component({
  selector: 'app-accept-pro-user-invite',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule],
  templateUrl: './accept-pro-user-invite.html',
  styleUrl: './accept-pro-user-invite.scss'
})
export class AcceptProUserInviteComponent implements OnInit {
  token = '';
  firstName = '';
  lastName = '';
  password = '';
  confirmPassword = '';

  loading = false;
  error = '';
  success = '';

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private auth: Auth
  ) {}

  ngOnInit(): void {
    this.token = this.route.snapshot.queryParamMap.get('token') ?? '';
    if (!this.token) {
      this.error = 'No invitation token found. Please use the link from your invitation email.';
    }
  }

  get passwordMismatch(): boolean {
    return !!this.confirmPassword && this.password !== this.confirmPassword;
  }

  submit(): void {
    if (!this.firstName || !this.lastName || !this.password || !this.confirmPassword) {
      this.error = 'Please fill in all fields.';
      return;
    }
    if (this.passwordMismatch) {
      this.error = 'Passwords do not match.';
      return;
    }
    if (this.password.length < 6) {
      this.error = 'Password must be at least 6 characters.';
      return;
    }

    this.loading = true;
    this.error = '';

    this.auth.acceptProUserInvite(this.token, this.firstName, this.lastName, this.password).subscribe({
      next: () => {
        this.success = 'Welcome! Your account has been created. Redirecting…';
        this.loading = false;
        setTimeout(() => this.router.navigate(['/']), 2000);
      },
      error: err => {
        this.error = err.error?.message || 'Could not process invitation. Please try again.';
        this.loading = false;
      }
    });
  }
}
