import { Component, OnInit, ChangeDetectorRef, Inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatIconModule } from '@angular/material/icon';
import { MatTabsModule } from '@angular/material/tabs';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatDialogModule, MatDialog, MatDialogRef } from '@angular/material/dialog';
import { MatInputModule } from '@angular/material/input';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatButtonModule } from '@angular/material/button';
import { MatBottomSheet, MatBottomSheetModule, MatBottomSheetRef, MAT_BOTTOM_SHEET_DATA } from '@angular/material/bottom-sheet';
import { AdminUsersService, Job } from '../../core/services/admin-users.service';
import { User } from '../../core/models/user.model';
import { Pro } from '../../core/models/pro.model';
import { Auth } from '../../core/services/auth';
import { Router } from '@angular/router';
import { ProUsersService, LinkedUser, LinkedPro } from '../../services/pro-users.service';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { ServiceAreaService, ServiceArea } from '../../core/services/service-area.service';

type AdminView = 'search' | 'service-areas' | 'invite-admin' | 'geocode';

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
    MatSnackBarModule,
    MatBottomSheetModule
  ],
  templateUrl: './admin-users.html',
  styleUrl: './admin-users.scss'
})
export class AdminUsersComponent implements OnInit {

  // ── Navigation ────────────────────────────────────────────────────────────
  activeView: AdminView = 'search';
  showToolsMenu = false;

  readonly navItems: { id: AdminView; label: string; icon: string }[] = [
    { id: 'search',        label: 'User / Pro Search', icon: 'manage_search' },
    { id: 'service-areas', label: 'Service Areas',     icon: 'location_on'   },
    { id: 'invite-admin',  label: 'Invite Admin',      icon: 'person_add'    },
    { id: 'geocode',       label: 'Geocode',           icon: 'my_location'   },
  ];

  setView(view: AdminView): void {
    this.activeView = view;
    this.showToolsMenu = false;
  }

  getActiveViewLabel(): string {
    return this.navItems.find(n => n.id === this.activeView)?.label ?? '';
  }

  getActiveViewIcon(): string {
    return this.navItems.find(n => n.id === this.activeView)?.icon ?? 'menu';
  }

  // ── Search ────────────────────────────────────────────────────────────────
  searchQuery = '';
  searchType: 'user' | 'pro' = 'user';

  setSearchType(type: 'user' | 'pro'): void {
    this.searchType = type;
    this.users = [];
    this.pros = [];
    this.selectedUser = null;
    this.selectedPro = null;
    this.cdr.detectChanges();
  }
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

  // ── Invite Admin ──────────────────────────────────────────────────────────
  adminInvitations: any[] = [];
  isLoadingInvitations = false;
  inviteEmail = '';
  inviteSending = false;
  inviteSuccess = '';
  inviteError = '';

  // ── Geocode ───────────────────────────────────────────────────────────────
  isBackfillingPros = false;
  isBackfillingUsers = false;
  proBackfillResult: { message: string; updated: number; failed: number; total: number } | null = null;
  userBackfillResult: { message: string; updated: number; failed: number; total: number } | null = null;

  // ── Service Radius ────────────────────────────────────────────────────────
  isEditingRadius = false;
  editRadiusValue = 25;

  // ── Disputes ──────────────────────────────────────────────────────────────
  disputes: any[] = [];
  isLoadingDisputes = false;
  resolvingDisputeId: number | null = null;

  // ── Relationships ─────────────────────────────────────────────────────────
  linkedUsers: LinkedUser[] = [];
  linkedPros: LinkedPro[] = [];
  isLoadingRelationships = false;
  addUserId: number | null = null;

  // ── Service Areas ─────────────────────────────────────────────────────────
  serviceAreas: ServiceArea[] = [];
  isLoadingAreas = false;
  isSavingArea = false;
  areaErrorMsg = '';
  newArea = { country: '', state: '', district: '', pinCode: '', notes: '', isActive: true };

  constructor(
    private adminUsersService: AdminUsersService,
    private auth: Auth,
    private cdr: ChangeDetectorRef,
    private router: Router,
    private dialog: MatDialog,
    private proUsersService: ProUsersService,
    private snack: MatSnackBar,
    private serviceAreaService: ServiceAreaService,
    private bottomSheet: MatBottomSheet
  ) {}

  ngOnInit(): void {
    if (this.auth.getUserType() !== 'Admin') {
      this.router.navigate(['/']);
      return;
    }
    this.loadInvitations();
    this.loadDisputes();
    this.loadServiceAreas();
  }

  // ── Disputes ──────────────────────────────────────────────────────────────

  loadDisputes(): void {
    this.isLoadingDisputes = true;
    this.adminUsersService.getDisputes().subscribe({
      next: (disputes) => {
        this.disputes = disputes ?? [];
        this.isLoadingDisputes = false;
        this.cdr.markForCheck();
      },
      error: () => {
        this.isLoadingDisputes = false;
        this.cdr.markForCheck();
      }
    });
  }

  resolveDispute(jobId: number, resolution: 'complete' | 'refund'): void {
    this.resolvingDisputeId = jobId;
    this.adminUsersService.resolveDispute(jobId, resolution).subscribe({
      next: (result) => {
        this.disputes = this.disputes.filter(d => d.jobId !== jobId);
        this.resolvingDisputeId = null;
        this.snack.open(result.message, 'OK', { duration: 4000, panelClass: 'snack-success' });
        this.cdr.markForCheck();
      },
      error: (err) => {
        this.resolvingDisputeId = null;
        const msg = err?.error?.message ?? 'Failed to resolve dispute.';
        this.snack.open(msg, 'OK', { duration: 4000, panelClass: 'snack-error' });
        this.cdr.markForCheck();
      }
    });
  }

  // ── Invitations ───────────────────────────────────────────────────────────

  loadInvitations(): void {
    this.isLoadingInvitations = true;
    this.adminUsersService.getAdminInvitations(true).subscribe({
      next: (invitations) => {
        this.adminInvitations = invitations || [];
        this.isLoadingInvitations = false;
        this.cdr.markForCheck();
      },
      error: () => { this.isLoadingInvitations = false; }
    });
  }

  resendInvitation(invitationId: number): void {
    this.adminUsersService.resendAdminInvitation(invitationId).subscribe({
      next: () => this.loadInvitations(),
      error: () => {}
    });
  }

  sendInviteInline(): void {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(this.inviteEmail)) {
      this.inviteError = 'Enter a valid email address.';
      return;
    }
    this.inviteSending = true;
    this.inviteSuccess = '';
    this.inviteError = '';
    this.adminUsersService.inviteAdmin(this.inviteEmail).subscribe({
      next: () => {
        this.inviteSuccess = `Invitation sent to ${this.inviteEmail}`;
        this.inviteEmail = '';
        this.inviteSending = false;
        this.loadInvitations();
        this.cdr.markForCheck();
      },
      error: (err: any) => {
        this.inviteError = err?.error?.message ?? 'Failed to send invitation.';
        this.inviteSending = false;
        this.cdr.markForCheck();
      }
    });
  }

  // ── Search ────────────────────────────────────────────────────────────────

  search(): void {
    if (!this.searchQuery?.trim()) return;
    this.isSearching = true;
    this.selectedUser = null;
    this.selectedPro = null;
    this.users = [];
    this.pros = [];
    this.cdr.detectChanges();
    if (this.searchType === 'user') {
      this.adminUsersService.searchUsers(this.searchQuery).subscribe({
        next: (response) => {
          this.users = Array.isArray(response) ? response : (response.$values || response.data || []);
          this.isSearching = false;
          this.cdr.detectChanges();
        },
        error: () => { this.isSearching = false; this.cdr.detectChanges(); }
      });
    } else {
      this.adminUsersService.searchPros(this.searchQuery).subscribe({
        next: (response) => {
          this.pros = Array.isArray(response) ? response : (response.$values || response.data || []);
          this.isSearching = false;
          this.cdr.detectChanges();
        },
        error: () => { this.isSearching = false; this.cdr.detectChanges(); }
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
    this.userJobs = [];
    this.userConversations = [];
    this.adminUsersService.getUserJobs(userId).subscribe({
      next: (response) => {
        this.userJobs = Array.isArray(response) ? response : (response.$values || response.data || []);
        this.cdr.markForCheck();
      },
      error: () => {}
    });
    this.adminUsersService.getUserConversations(userId).subscribe({
      next: (response) => {
        this.userConversations = Array.isArray(response) ? response : (response.$values || response.data || []);
        this.isLoadingDetails = false;
        this.cdr.markForCheck();
      },
      error: () => { this.isLoadingDetails = false; this.cdr.markForCheck(); }
    });
  }

  loadProDetails(proId: number): void {
    this.isLoadingDetails = true;
    this.selectedConversation = null;
    this.conversationMessages = [];
    this.proJobs = [];
    this.proConversations = [];
    this.adminUsersService.getProJobs(proId).subscribe({
      next: (response) => {
        this.proJobs = Array.isArray(response) ? response : (response.$values || response.data || []);
        this.cdr.markForCheck();
      },
      error: () => {}
    });
    this.adminUsersService.getProConversations(proId).subscribe({
      next: (response) => {
        this.proConversations = Array.isArray(response) ? response : (response.$values || response.data || []);
        this.isLoadingDetails = false;
        this.cdr.markForCheck();
      },
      error: () => { this.isLoadingDetails = false; this.cdr.markForCheck(); }
    });
  }

  selectConversation(conversation: any): void {
    this.selectedConversation = conversation;
    const userType = this.selectedUser ? 'User' : 'Pro';
    const currentUserId = this.selectedUser ? this.selectedUser.id : this.selectedPro!.id;
    this.adminUsersService.getMessages(currentUserId, userType, conversation.userId, conversation.userType).subscribe({
      next: (response) => {
        this.conversationMessages = Array.isArray(response) ? response : (response.$values || response.data || []);
        this.cdr.markForCheck();
      },
      error: () => {}
    });
  }

  impersonate(): void {
    if (!this.selectedUser && !this.selectedPro) return;
    const userId = this.selectedUser ? this.selectedUser.id : this.selectedPro!.id;
    const userType = this.selectedUser ? 'User' : 'Pro';
    const displayName = this.selectedUser
      ? `${this.selectedUser.firstName} ${this.selectedUser.lastName}`
      : this.selectedPro!.proName;
    const ref = this.bottomSheet.open(ImpersonateSheetComponent, {
      data: { displayName, userType }
    });
    ref.afterDismissed().subscribe((confirmed: boolean) => {
      if (!confirmed) return;
      this.adminUsersService.impersonateUser(userId, userType).subscribe({
        next: (data) => {
          this.auth.startImpersonation(data.token, data.userId, data.userType, displayName);
          this.router.navigate(['/']);
        },
        error: (err) => {
          const msg = err?.error?.message ?? 'Impersonation failed.';
          this.snack.open(msg, 'OK', { duration: 4000, panelClass: 'snack-error' });
        }
      });
    });
  }

  getDisplayName(user?: User, pro?: Pro): string {
    if (user) return `${user.firstName} ${user.lastName}`;
    if (pro) return pro.proName;
    return '';
  }

  formatDate(date: string | Date): string {
    if (!date) return '';
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
        this.snack.open(err?.error?.message ?? 'Failed to link user.', 'OK', { duration: 4000 });
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

  cancelEditRadius(): void { this.isEditingRadius = false; }

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
        this.snack.open(err?.error?.message ?? 'Failed to update service radius.', 'OK', { duration: 4000, panelClass: 'snack-error' });
      }
    });
  }

  // ── Geocode ───────────────────────────────────────────────────────────────

  runGeocodeBackfillPros(): void {
    this.isBackfillingPros = true;
    this.proBackfillResult = null;
    this.adminUsersService.geocodeBackfillPros().subscribe({
      next: (result) => {
        this.isBackfillingPros = false;
        this.proBackfillResult = result;
        this.cdr.markForCheck();
      },
      error: (err: any) => {
        this.isBackfillingPros = false;
        this.snack.open(err?.error?.message ?? 'Pro geocode backfill failed.', 'OK', { duration: 4000, panelClass: 'snack-error' });
        this.cdr.markForCheck();
      }
    });
  }

  runGeocodeBackfillUsers(): void {
    this.isBackfillingUsers = true;
    this.userBackfillResult = null;
    this.adminUsersService.geocodeBackfillUsers().subscribe({
      next: (result) => {
        this.isBackfillingUsers = false;
        this.userBackfillResult = result;
        this.cdr.markForCheck();
      },
      error: (err: any) => {
        this.isBackfillingUsers = false;
        this.snack.open(err?.error?.message ?? 'User geocode backfill failed.', 'OK', { duration: 4000, panelClass: 'snack-error' });
        this.cdr.markForCheck();
      }
    });
  }

  // ── Service Areas ─────────────────────────────────────────────────────────

  loadServiceAreas(): void {
    this.isLoadingAreas = true;
    this.serviceAreaService.getAll().subscribe({
      next: (areas) => {
        this.serviceAreas = Array.isArray(areas) ? areas : (areas as any)?.$values ?? [];
        this.isLoadingAreas = false;
        this.cdr.markForCheck();
      },
      error: () => { this.isLoadingAreas = false; this.cdr.markForCheck(); }
    });
  }

  addServiceArea(): void {
    if (!this.newArea.country.trim()) return;
    this.isSavingArea = true;
    this.areaErrorMsg = '';
    this.serviceAreaService.add({
      country: this.newArea.country.trim(),
      state: this.newArea.state.trim() || undefined,
      district: this.newArea.district.trim() || undefined,
      pinCode: this.newArea.pinCode.trim() || undefined,
      notes: this.newArea.notes.trim() || undefined,
      isActive: true
    }).subscribe({
      next: (area) => {
        this.serviceAreas = [...this.serviceAreas, area];
        this.newArea = { country: '', state: '', district: '', pinCode: '', notes: '', isActive: true };
        this.isSavingArea = false;
        this.snack.open('Service area added.', 'OK', { duration: 3000, panelClass: 'snack-success' });
        this.cdr.markForCheck();
      },
      error: (err: any) => {
        this.isSavingArea = false;
        this.areaErrorMsg = err?.error?.message ?? 'Failed to add service area.';
        this.cdr.markForCheck();
      }
    });
  }

  toggleServiceArea(id: number): void {
    this.serviceAreaService.toggle(id).subscribe({
      next: (result) => {
        const area = this.serviceAreas.find(a => a.id === id);
        if (area) area.isActive = result.isActive;
        this.snack.open(result.isActive ? 'Area enabled.' : 'Area disabled.', 'OK', {
          duration: 2500,
          panelClass: result.isActive ? 'snack-success' : 'snack-info'
        });
        this.cdr.markForCheck();
      },
      error: () => this.snack.open('Failed to update area.', 'OK', { duration: 3000, panelClass: 'snack-error' })
    });
  }

  deleteServiceArea(area: ServiceArea): void {
    const ref = this.bottomSheet.open(DeleteAreaSheetComponent, {
      data: { breadcrumb: [area.country, area.state, area.district, area.pinCode].filter(Boolean).join(' › ') }
    });
    ref.afterDismissed().subscribe((confirmed: boolean) => {
      if (!confirmed) return;
      this.serviceAreaService.delete(area.id).subscribe({
        next: () => {
          this.serviceAreas = this.serviceAreas.filter(a => a.id !== area.id);
          this.snack.open('Service area deleted.', 'OK', { duration: 3000, panelClass: 'snack-success' });
          this.cdr.detectChanges();
        },
        error: () => this.snack.open('Failed to delete area.', 'OK', { duration: 3000, panelClass: 'snack-error' })
      });
    });
  }
}

@Component({
  selector: 'app-impersonate-sheet',
  standalone: true,
  imports: [CommonModule, MatIconModule, MatButtonModule],
  template: `
    <div class="impersonate-sheet">
      <div class="ims-icon-row">
        <mat-icon class="ims-icon">manage_accounts</mat-icon>
      </div>
      <p class="ims-title">Impersonate {{ data.userType }}?</p>
      <p class="ims-name">{{ data.displayName }}</p>
      <p class="ims-warning">You will browse the app as this {{ data.userType.toLowerCase() }}. An "Exit Impersonation" banner will appear at the top of every page.</p>
      <div class="ims-actions">
        <button mat-stroked-button (click)="cancel()">Cancel</button>
        <button mat-raised-button color="primary" (click)="confirm()">
          <mat-icon>login</mat-icon> Impersonate
        </button>
      </div>
    </div>
  `,
  styles: [`
    .impersonate-sheet { padding: 1.5rem 1.5rem 2rem; text-align: center; }
    .ims-icon-row { margin-bottom: 0.5rem; }
    .ims-icon { font-size: 2.5rem; width: 2.5rem; height: 2.5rem; color: #667eea; }
    .ims-title { margin: 0 0 0.3rem; font-size: 1.05rem; font-weight: 700; color: #1a1a1a; }
    .ims-name { margin: 0 0 0.6rem; font-size: 1rem; color: #444; font-weight: 600; }
    .ims-warning { margin: 0 0 1.25rem; font-size: 0.82rem; color: #888; line-height: 1.5; }
    .ims-actions { display: flex; gap: 0.75rem; justify-content: center; }
    .ims-actions button { min-width: 110px; }
    .ims-actions mat-icon { font-size: 1rem; width: 1rem; height: 1rem; margin-right: 0.2rem; }
  `]
})
export class ImpersonateSheetComponent {
  constructor(
    private sheetRef: MatBottomSheetRef<ImpersonateSheetComponent>,
    @Inject(MAT_BOTTOM_SHEET_DATA) public data: { displayName: string; userType: string }
  ) {}
  confirm(): void { this.sheetRef.dismiss(true); }
  cancel(): void { this.sheetRef.dismiss(false); }
}

@Component({
  selector: 'app-delete-area-sheet',
  standalone: true,
  imports: [CommonModule, MatIconModule, MatButtonModule],
  template: `
    <div class="delete-area-sheet">
      <div class="das-icon-row">
        <mat-icon class="das-icon">delete_forever</mat-icon>
      </div>
      <p class="das-title">Delete service area?</p>
      <p class="das-breadcrumb">{{ data.breadcrumb }}</p>
      <p class="das-warning">This cannot be undone.</p>
      <div class="das-actions">
        <button mat-stroked-button (click)="cancel()">Cancel</button>
        <button mat-raised-button color="warn" (click)="confirm()">Delete</button>
      </div>
    </div>
  `,
  styles: [`
    .delete-area-sheet { padding: 1.5rem 1.5rem 2rem; text-align: center; }
    .das-icon-row { margin-bottom: 0.5rem; }
    .das-icon { font-size: 2.5rem; width: 2.5rem; height: 2.5rem; color: #e53935; }
    .das-title { margin: 0 0 0.4rem; font-size: 1.05rem; font-weight: 700; color: #1a1a1a; }
    .das-breadcrumb { margin: 0 0 0.3rem; font-size: 0.9rem; color: #444; font-weight: 500; }
    .das-warning { margin: 0 0 1.25rem; font-size: 0.82rem; color: #999; }
    .das-actions { display: flex; gap: 0.75rem; justify-content: center; }
    .das-actions button { min-width: 100px; }
  `]
})
export class DeleteAreaSheetComponent {
  constructor(
    private sheetRef: MatBottomSheetRef<DeleteAreaSheetComponent>,
    @Inject(MAT_BOTTOM_SHEET_DATA) public data: { breadcrumb: string }
  ) {}
  confirm(): void { this.sheetRef.dismiss(true); }
  cancel(): void { this.sheetRef.dismiss(false); }
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
    .invite-admin-dialog { padding: 0; }
    .full-width { width: 100%; }
    .info-text { margin-top: 1rem; font-size: 0.9rem; color: #666; }
  `]
})
export class InviteAdminDialogComponent {
  email = '';

  constructor(public dialogRef: MatDialogRef<InviteAdminDialogComponent>) {}

  isEmailValid(): boolean {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(this.email);
  }

  onConfirm(): void {
    if (this.isEmailValid()) this.dialogRef.close({ email: this.email });
  }

  onCancel(): void {
    this.dialogRef.close();
  }
}
