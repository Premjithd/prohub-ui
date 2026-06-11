import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../environments/environment';

interface ProUser {
  id: number;
  status: 'Pending' | 'Active' | 'Revoked';
  inviteEmail: string;
  createdAt: string;
  user: {
    id: number;
    firstName: string;
    lastName: string;
    email: string;
    phoneNumber: string;
    isEmailVerified: boolean;
  } | null;
}

@Component({
  selector: 'app-my-users',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule],
  templateUrl: './my-users.html',
  styleUrl: './my-users.scss'
})
export class MyUsersComponent implements OnInit {
  users: ProUser[] = [];
  loading = true;
  error = '';

  showInvitePanel = false;
  inviteEmail = '';
  inviteLoading = false;
  inviteError = '';
  inviteSuccess = '';

  private readonly api = `${environment.apiUrl}/pro-users`;

  constructor(private http: HttpClient, private cdr: ChangeDetectorRef) {}

  ngOnInit(): void {
    this.loadUsers();
  }

  loadUsers(): void {
    this.loading = true;
    this.http.get<ProUser[]>(this.api).subscribe({
      next: users => {
        this.users = users;
        this.loading = false;
        this.cdr.detectChanges();
      },
      error: () => {
        this.error = 'Could not load team members.';
        this.loading = false;
        this.cdr.detectChanges();
      }
    });
  }

  openInvitePanel(): void {
    this.showInvitePanel = true;
    this.inviteEmail = '';
    this.inviteError = '';
    this.inviteSuccess = '';
  }

  closeInvitePanel(): void {
    this.showInvitePanel = false;
  }

  sendInvite(): void {
    if (!this.inviteEmail?.trim()) {
      this.inviteError = 'Please enter an email address.';
      return;
    }
    this.inviteLoading = true;
    this.inviteError = '';
    this.inviteSuccess = '';

    this.http.post<{ message: string }>(`${this.api}/invite`, {
      email: this.inviteEmail.trim(),
      baseUrl: window.location.origin
    }).subscribe({
      next: res => {
        this.inviteSuccess = res.message || 'Invitation sent!';
        this.inviteLoading = false;
        this.inviteEmail = '';
        this.loadUsers();
        this.cdr.detectChanges();
      },
      error: err => {
        this.inviteError = err.error?.message || 'Could not send invitation.';
        this.inviteLoading = false;
        this.cdr.detectChanges();
      }
    });
  }

  revoke(id: number): void {
    if (!confirm('Remove this user from your team?')) return;
    this.http.delete(`${this.api}/${id}`).subscribe({
      next: () => {
        this.users = this.users.filter(u => u.id !== id);
        this.cdr.detectChanges();
      },
      error: () => {
        alert('Could not remove user. Please try again.');
      }
    });
  }

  displayName(u: ProUser): string {
    if (u.user) return `${u.user.firstName} ${u.user.lastName}`;
    return u.inviteEmail;
  }
}
