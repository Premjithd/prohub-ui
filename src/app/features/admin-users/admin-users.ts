import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatIconModule } from '@angular/material/icon';
import { MatTabsModule } from '@angular/material/tabs';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatDialogModule, MatDialog, MatDialogRef } from '@angular/material/dialog';
import { MatInputModule } from '@angular/material/input';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatButtonModule } from '@angular/material/button';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { AdminUsersService, Job } from '../../core/services/admin-users.service';
import { User } from '../../core/models/user.model';
import { Pro } from '../../core/models/pro.model';
import { Auth } from '../../core/services/auth';
import { Router } from '@angular/router';
import { ProUsersService, LinkedUser, LinkedPro } from '../../services/pro-users.service';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';

@Component({
  selector: 'app-admin-users',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    MatIconModule,
    MatTabsModule,
    MatProgressSpinnerModule,
    MatDialogModule,
    MatInputModule,
    MatFormFieldModule,
    MatButtonModule,
    ReactiveFormsModule,
    MatSnackBarModule
  ],
  templateUrl: './admin-users.html',
  styleUrl: './admin-users.scss'
})
export class AdminUsersComponent implements OnInit {
  searchQuery = '';
  searchType: 'user' | 'pro' = 'user';
  
  isSearching = false;
  isLoadingDetails = false;
  
  users: User[] = [];
  pros: Pro[] = [];
  
  selectedUser: User | null = null;
  selectedPro: Pro | null = null;
  
  userJobs: Job[] = [];
  proJobs: Job[] = [];
  
  userConversations: any[] = [];
  proConversations: any[] = [];
  
  selectedConversation: any = null;
  conversationMessages: any[] = [];
  
  // Invitations tracking
  adminInvitations: any[] = [];
  isLoadingInvitations = false;

  // Geocode backfill
  isBackfilling = false;
  backfillResult: { message: string; updated: number; failed: number; total: number } | null = null;

  // Service radius inline edit
  isEditingRadius = false;
  editRadiusValue = 25;

  isImpersonating = false;
  impersonationDetails: any = null;

  // Pro-User relationships
  linkedUsers: LinkedUser[] = [];
  linkedPros: LinkedPro[] = [];
  isLoadingRelationships = false;
  addUserId: number | null = null;

  constructor(
    private adminUsersService: AdminUsersService,
    private auth: Auth,
    private cdr: ChangeDetectorRef,
    private router: Router,
    private dialog: MatDialog,
    private fb: FormBuilder,
    private proUsersService: ProUsersService,
    private snack: MatSnackBar
  ) {}

  ngOnInit(): void {
    const userType = this.auth.getUserType();
    
    if (userType !== 'Admin') {
      // Redirect to home if not admin
      this.router.navigate(['/']);
    } else {
      this.loadInvitations();
    }
  }

  loadInvitations(): void {
    this.isLoadingInvitations = true;
    this.adminUsersService.getAdminInvitations(true).subscribe({
      next: (invitations) => {
        this.adminInvitations = invitations || [];
        this.isLoadingInvitations = false;
      },
      error: (error) => {
        this.isLoadingInvitations = false;
      }
    });
  }

  resendInvitation(invitationId: number): void {
    this.adminUsersService.resendAdminInvitation(invitationId).subscribe({
      next: (response) => {
        this.loadInvitations(); // Reload the list
      },
      error: (error) => {
      }
    });
  }

  search(): void {
    if (!this.searchQuery || !this.searchQuery.trim()) {
      return;
    }

    this.isSearching = true;
    this.users = [];
    this.pros = [];

    if (this.searchType === 'user') {
      this.adminUsersService.searchUsers(this.searchQuery).subscribe({
        next: (response) => {
          this.users = Array.isArray(response) ? response : (response.$values || response.data || []);
          this.isSearching = false;
          this.cdr.markForCheck();
        },
        error: (error) => {
          this.isSearching = false;
          this.cdr.markForCheck();
        }
      });
    } else {
      this.adminUsersService.searchPros(this.searchQuery).subscribe({
        next: (response) => {
          this.pros = Array.isArray(response) ? response : (response.$values || response.data || []);
          this.isSearching = false;
          this.cdr.markForCheck();
        },
        error: (error) => {
          this.isSearching = false;
          this.cdr.markForCheck();
        }
      });
    }
  }

  selectUser(user: User): void {
    this.selectedUser = user;
    this.selectedPro = null;
    this.linkedUsers = [];
    this.linkedPros = [];
    this.addUserId = null;
    this.loadUserDetails(user.id);
    this.loadRelationships('user', user.id);
  }

  selectPro(pro: Pro): void {
    this.selectedPro = pro;
    this.selectedUser = null;
    this.linkedUsers = [];
    this.linkedPros = [];
    this.addUserId = null;
    this.loadProDetails(pro.id);
    this.loadRelationships('pro', pro.id);
  }

  loadUserDetails(userId: number): void {
    this.isLoadingDetails = true;
    this.selectedConversation = null;
    this.conversationMessages = [];
    this.userJobs = [];  // Clear previous data
    this.userConversations = [];  // Clear previous data

    // Load user jobs and conversations in parallel
    this.adminUsersService.getUserJobs(userId).subscribe({
      next: (response) => {
        // Handle both $values format (from .NET) and direct array/data format
        this.userJobs = Array.isArray(response) ? response : (response.$values || response.data || []);
        this.cdr.markForCheck();
      },
      error: (error) => {
      }
    });

    this.adminUsersService.getUserConversations(userId).subscribe({
      next: (response) => {
        // Handle both $values format (from .NET) and direct array/data format
        this.userConversations = Array.isArray(response) ? response : (response.$values || response.data || []);
        this.isLoadingDetails = false;
        this.cdr.markForCheck();
      },
      error: (error) => {
        this.isLoadingDetails = false;
        this.cdr.markForCheck();
      }
    });
  }

  loadProDetails(proId: number): void {
    this.isLoadingDetails = true;
    this.selectedConversation = null;
    this.conversationMessages = [];
    this.proJobs = [];  // Clear previous data
    this.proConversations = [];  // Clear previous data

    // Load pro jobs and conversations in parallel
    this.adminUsersService.getProJobs(proId).subscribe({
      next: (response) => {
        // Handle both $values format (from .NET) and direct array/data format
        this.proJobs = Array.isArray(response) ? response : (response.$values || response.data || []);
        this.cdr.markForCheck();
      },
      error: (error) => {
      }
    });

    this.adminUsersService.getProConversations(proId).subscribe({
      next: (response) => {
        // Handle both $values format (from .NET) and direct array/data format
        this.proConversations = Array.isArray(response) ? response : (response.$values || response.data || []);
        this.isLoadingDetails = false;
        this.cdr.markForCheck();
      },
      error: (error) => {
        this.isLoadingDetails = false;
        this.cdr.markForCheck();
      }
    });
  }

  selectConversation(conversation: any): void {
    this.selectedConversation = conversation;
    const userType = this.selectedUser ? 'User' : 'Pro';
    const currentUserId = this.selectedUser ? this.selectedUser.id : this.selectedPro!.id;
    
    this.adminUsersService.getMessages(
      currentUserId,
      userType,
      conversation.userId,
      conversation.userType
    ).subscribe({
      next: (response) => {
        // Handle both $values format (from .NET) and direct array/data format
        this.conversationMessages = Array.isArray(response) ? response : (response.$values || response.data || []);
        this.cdr.markForCheck();
      },
      error: (error) => {
      }
    });
  }

  impersonate(): void {
    if (!this.selectedUser && !this.selectedPro) {
      return;
    }

    const userId = this.selectedUser ? this.selectedUser.id : this.selectedPro!.id;
    const userType = this.selectedUser ? 'User' : 'Pro';

    this.adminUsersService.impersonateUser(userId, userType).subscribe({
      next: (data) => {
        this.isImpersonating = true;
        this.impersonationDetails = data;
        
        // Store impersonation data
        localStorage.setItem('impersonation_token', data.token);
        localStorage.setItem('impersonation_userId', data.userId.toString());
        localStorage.setItem('impersonation_userType', data.userType);
        
        // Redirect to dashboard
        this.router.navigate(['/']);
        this.cdr.markForCheck();
      },
      error: (error) => {
      }
    });
  }

  getDisplayName(user?: User, pro?: Pro): string {
    if (user) {
      return `${user.firstName} ${user.lastName}`;
    }
    if (pro) {
      return pro.proName;
    }
    return '';
  }

  formatDate(date: string | Date): string {
    if (!date) {
      return '';
    }
    return new Date(date).toLocaleDateString();
  }

  clearSelection(): void {
    this.selectedUser = null;
    this.selectedPro = null;
    this.userJobs = [];
    this.proJobs = [];
    this.userConversations = [];
    this.proConversations = [];
    this.selectedConversation = null;
    this.conversationMessages = [];
    this.linkedUsers = [];
    this.linkedPros = [];
    this.addUserId = null;
  }

  loadRelationships(type: 'pro' | 'user', id: number): void {
    this.isLoadingRelationships = true;
    const req = type === 'pro'
      ? this.proUsersService.getUsersUnderPro(id)
      : this.proUsersService.getProsForUser(id);

    req.subscribe({
      next: (res: any) => {
        const items = Array.isArray(res) ? res : (res?.$values ?? []);
        if (type === 'pro') this.linkedUsers = items;
        else this.linkedPros = items;
        this.isLoadingRelationships = false;
        this.cdr.markForCheck();
      },
      error: () => { this.isLoadingRelationships = false; this.cdr.markForCheck(); }
    });
  }

  addUserToPro(): void {
    if (!this.selectedPro || !this.addUserId) return;
    this.proUsersService.addUserToPro(this.selectedPro.id, this.addUserId).subscribe({
      next: () => {
        this.snack.open('User linked.', 'OK', { duration: 3000 });
        this.addUserId = null;
        this.loadRelationships('pro', this.selectedPro!.id);
      },
      error: (err: any) => {
        const msg = err?.error?.message ?? 'Failed to link user.';
        this.snack.open(msg, 'OK', { duration: 4000 });
      }
    });
  }

  removeUserFromPro(userId: number): void {
    if (!this.selectedPro) return;
    this.proUsersService.removeUserFromPro(this.selectedPro.id, userId).subscribe({
      next: () => {
        this.linkedUsers = this.linkedUsers.filter(u => u.id !== userId);
        this.snack.open('User unlinked.', 'OK', { duration: 3000 });
        this.cdr.markForCheck();
      },
      error: () => this.snack.open('Failed to unlink user.', 'OK', { duration: 3000 })
    });
  }

  startEditRadius(): void {
    this.editRadiusValue = this.selectedPro?.serviceRadiusKm ?? 25;
    this.isEditingRadius = true;
  }

  cancelEditRadius(): void {
    this.isEditingRadius = false;
  }

  saveRadius(): void {
    if (!this.selectedPro || !this.editRadiusValue) return;
    this.adminUsersService.updateProServiceRadius(this.selectedPro.id, this.editRadiusValue).subscribe({
      next: (result) => {
        this.selectedPro!.serviceRadiusKm = result.serviceRadiusKm;
        this.isEditingRadius = false;
        this.snack.open(`Service radius updated to ${result.serviceRadiusKm} km.`, 'OK', { duration: 3000, panelClass: 'snack-success' });
        this.cdr.markForCheck();
      },
      error: (err: any) => {
        const msg = err?.error?.message ?? 'Failed to update service radius.';
        this.snack.open(msg, 'OK', { duration: 4000, panelClass: 'snack-error' });
      }
    });
  }

  runGeocodeBackfill(): void {
    this.isBackfilling = true;
    this.backfillResult = null;
    this.adminUsersService.geocodeBackfill().subscribe({
      next: (result) => {
        this.isBackfilling = false;
        this.backfillResult = result;
        this.snack.open(result.message, 'OK', { duration: 8000, panelClass: 'snack-info' });
        this.cdr.markForCheck();
      },
      error: (err: any) => {
        this.isBackfilling = false;
        const msg = err?.error?.message ?? 'Geocode backfill failed.';
        this.snack.open(msg, 'OK', { duration: 4000, panelClass: 'snack-error' });
        this.cdr.markForCheck();
      }
    });
  }

  inviteAdmin(): void {
    const dialogRef = this.dialog.open(InviteAdminDialogComponent, {
      width: '400px',
      data: {}
    });

    dialogRef.afterClosed().subscribe(result => {
      if (result && result.email) {
        this.adminUsersService.inviteAdmin(result.email).subscribe({
          next: (response) => {
            alert('Invitation sent to ' + result.email);
            this.cdr.markForCheck();
          },
          error: (error) => {
            alert('Failed to send invitation. Please try again.');
          }
        });
      }
    });
  }

  openCreateUser(): void {
    const dialogRef = this.dialog.open(CreateUserDialogComponent, { width: '480px' });
    dialogRef.afterClosed().subscribe(result => {
      if (result) {
        this.adminUsersService.createUser(result).subscribe({
          next: (user: any) => {
            this.snack.open(`User "${user.firstName} ${user.lastName}" created successfully.`, 'OK', {
              duration: 4000, panelClass: 'snack-success'
            });
          },
          error: (err: any) => {
            const msg = err?.error?.message ?? err?.error?.title ?? 'Failed to create user.';
            this.snack.open(msg, 'OK', { duration: 4000, panelClass: 'snack-error' });
          }
        });
      }
    });
  }

  openCreatePro(): void {
    const dialogRef = this.dialog.open(CreateProDialogComponent, { width: '480px' });
    dialogRef.afterClosed().subscribe(result => {
      if (result) {
        this.adminUsersService.createPro(result).subscribe({
          next: (pro: any) => {
            this.snack.open(`Professional "${pro.proName}" created successfully.`, 'OK', {
              duration: 4000, panelClass: 'snack-success'
            });
          },
          error: (err: any) => {
            const msg = err?.error?.message ?? err?.error?.title ?? 'Failed to create professional.';
            this.snack.open(msg, 'OK', { duration: 4000, panelClass: 'snack-error' });
          }
        });
      }
    });
  }
}

const DIALOG_STYLES = [`
  .create-form { display: flex; flex-direction: column; gap: 4px; padding-top: 8px; min-width: 380px; }
  .full-width { width: 100%; }
  .form-row { display: flex; gap: 12px; }
  .half-width { flex: 1; }
`];

@Component({
  selector: 'app-create-user-dialog',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, MatDialogModule, MatInputModule, MatFormFieldModule, MatButtonModule],
  template: `
    <h2 mat-dialog-title>Create New User</h2>
    <mat-dialog-content>
      <form [formGroup]="form" class="create-form">
        <div class="form-row">
          <mat-form-field appearance="outline" class="half-width">
            <mat-label>First Name</mat-label>
            <input matInput formControlName="firstName" />
            <mat-error *ngIf="form.get('firstName')?.hasError('required')">Required</mat-error>
          </mat-form-field>
          <mat-form-field appearance="outline" class="half-width">
            <mat-label>Last Name</mat-label>
            <input matInput formControlName="lastName" />
            <mat-error *ngIf="form.get('lastName')?.hasError('required')">Required</mat-error>
          </mat-form-field>
        </div>
        <mat-form-field appearance="outline" class="full-width">
          <mat-label>Email</mat-label>
          <input matInput type="email" formControlName="email" />
          <mat-error *ngIf="form.get('email')?.hasError('required')">Required</mat-error>
          <mat-error *ngIf="form.get('email')?.hasError('email')">Invalid email</mat-error>
        </mat-form-field>
        <mat-form-field appearance="outline" class="full-width">
          <mat-label>Password</mat-label>
          <input matInput type="password" formControlName="passwordHash" />
          <mat-error *ngIf="form.get('passwordHash')?.hasError('required')">Required</mat-error>
          <mat-error *ngIf="form.get('passwordHash')?.hasError('minlength')">Minimum 6 characters</mat-error>
        </mat-form-field>
        <mat-form-field appearance="outline" class="full-width">
          <mat-label>Phone Number</mat-label>
          <input matInput formControlName="phoneNumber" />
        </mat-form-field>
      </form>
    </mat-dialog-content>
    <mat-dialog-actions align="end">
      <button mat-button (click)="dialogRef.close()">Cancel</button>
      <button mat-raised-button color="primary" (click)="submit()" [disabled]="form.invalid">Create User</button>
    </mat-dialog-actions>
  `,
  styles: DIALOG_STYLES
})
export class CreateUserDialogComponent {
  form: FormGroup;

  constructor(
    public dialogRef: MatDialogRef<CreateUserDialogComponent>,
    private fb: FormBuilder
  ) {
    this.form = this.fb.group({
      firstName: ['', Validators.required],
      lastName: ['', Validators.required],
      email: ['', [Validators.required, Validators.email]],
      passwordHash: ['', [Validators.required, Validators.minLength(6)]],
      phoneNumber: ['']
    });
  }

  submit(): void {
    if (this.form.valid) {
      this.dialogRef.close(this.form.value);
    }
  }
}

@Component({
  selector: 'app-create-pro-dialog',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, MatDialogModule, MatInputModule, MatFormFieldModule, MatButtonModule],
  template: `
    <h2 mat-dialog-title>Create New Professional</h2>
    <mat-dialog-content>
      <form [formGroup]="form" class="create-form">
        <mat-form-field appearance="outline" class="full-width">
          <mat-label>Pro Name (Full Name)</mat-label>
          <input matInput formControlName="proName" />
          <mat-error *ngIf="form.get('proName')?.hasError('required')">Required</mat-error>
        </mat-form-field>
        <mat-form-field appearance="outline" class="full-width">
          <mat-label>Business Name</mat-label>
          <input matInput formControlName="businessName" />
          <mat-error *ngIf="form.get('businessName')?.hasError('required')">Required</mat-error>
        </mat-form-field>
        <mat-form-field appearance="outline" class="full-width">
          <mat-label>Email</mat-label>
          <input matInput type="email" formControlName="email" />
          <mat-error *ngIf="form.get('email')?.hasError('required')">Required</mat-error>
          <mat-error *ngIf="form.get('email')?.hasError('email')">Invalid email</mat-error>
        </mat-form-field>
        <mat-form-field appearance="outline" class="full-width">
          <mat-label>Password</mat-label>
          <input matInput type="password" formControlName="passwordHash" />
          <mat-error *ngIf="form.get('passwordHash')?.hasError('required')">Required</mat-error>
          <mat-error *ngIf="form.get('passwordHash')?.hasError('minlength')">Minimum 6 characters</mat-error>
        </mat-form-field>
        <mat-form-field appearance="outline" class="full-width">
          <mat-label>Phone Number</mat-label>
          <input matInput formControlName="phoneNumber" />
        </mat-form-field>
      </form>
    </mat-dialog-content>
    <mat-dialog-actions align="end">
      <button mat-button (click)="dialogRef.close()">Cancel</button>
      <button mat-raised-button color="accent" (click)="submit()" [disabled]="form.invalid">Create Professional</button>
    </mat-dialog-actions>
  `,
  styles: DIALOG_STYLES
})
export class CreateProDialogComponent {
  form: FormGroup;

  constructor(
    public dialogRef: MatDialogRef<CreateProDialogComponent>,
    private fb: FormBuilder
  ) {
    this.form = this.fb.group({
      proName: ['', Validators.required],
      businessName: ['', Validators.required],
      email: ['', [Validators.required, Validators.email]],
      passwordHash: ['', [Validators.required, Validators.minLength(6)]],
      phoneNumber: ['']
    });
  }

  submit(): void {
    if (this.form.valid) {
      this.dialogRef.close(this.form.value);
    }
  }
}

@Component({
  selector: 'app-invite-admin-dialog',
  standalone: true,
  imports: [CommonModule, FormsModule, MatDialogModule, MatInputModule, MatFormFieldModule, MatButtonModule],
  template: `
    <div class="invite-admin-dialog">
      <h2 mat-dialog-title>Invite New Admin</h2>
      <mat-dialog-content>
        <mat-form-field class="full-width">
          <mat-label>Admin Email</mat-label>
          <input matInput [(ngModel)]="email" placeholder="admin@example.com" />
        </mat-form-field>
        <p class="info-text">Enter the email address of the person you want to invite as a platform administrator.</p>
      </mat-dialog-content>
      <mat-dialog-actions align="end">
        <button mat-button (click)="onCancel()">Cancel</button>
        <button mat-raised-button color="primary" (click)="onConfirm()" [disabled]="!isEmailValid()">
          Send Invite
        </button>
      </mat-dialog-actions>
    </div>
  `,
  styles: [`
    .invite-admin-dialog {
      padding: 0;
    }
    .full-width {
      width: 100%;
    }
    .info-text {
      margin-top: 1rem;
      font-size: 0.9rem;
      color: #666;
    }
  `]
})
export class InviteAdminDialogComponent {
  email = '';

  constructor(public dialogRef: MatDialogRef<InviteAdminDialogComponent>) {}

  isEmailValid(): boolean {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(this.email);
  }

  onConfirm(): void {
    if (this.isEmailValid()) {
      this.dialogRef.close({ email: this.email });
    }
  }

  onCancel(): void {
    this.dialogRef.close();
  }
}
