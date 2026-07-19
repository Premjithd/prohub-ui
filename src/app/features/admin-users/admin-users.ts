import { Component, OnInit, OnDestroy, ChangeDetectorRef, Inject } from '@angular/core';
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
import { HttpClient } from '@angular/common/http';
import { firstValueFrom, Subscription, distinctUntilChanged, map } from 'rxjs';
import { AdminUsersService, Job, CommissionConfig, RegistrationMetrics, CategoryJobCount } from '../../core/services/admin-users.service';
import { User } from '../../core/models/user.model';
import { Pro } from '../../core/models/pro.model';
import { Auth } from '../../core/services/auth';
import { Router, ActivatedRoute } from '@angular/router';
import { ProUsersService, LinkedUser, LinkedPro } from '../../services/pro-users.service';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { ServiceAreaService, ServiceArea } from '../../core/services/service-area.service';
import { PayoutService } from '../../services/payout.service';
import { Payout } from '../../models/payout.model';
import { SettingsService } from '../../core/services/settings.service';
import { ServiceCategoryService } from '../../core/services/service-category.service';
import { ServiceCategory } from '../../core/models/service-category.model';
import { TeamService, TeamMember } from '../../core/services/team.service';

type AdminView = 'dashboard' | 'disputes' | 'search' | 'service-areas' | 'invite-admin' | 'geocode' | 'settings' | 'categories';

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
export class AdminUsersComponent implements OnInit, OnDestroy {

  // ── Navigation ────────────────────────────────────────────────────────────
  activeView: AdminView = 'dashboard';
  showToolsMenu = false;
  private viewSub?: Subscription;

  readonly navItems: { id: AdminView; label: string; icon: string }[] = [
    { id: 'dashboard',     label: 'Dashboard',         icon: 'dashboard'    },
    { id: 'disputes',      label: 'Disputes',          icon: 'gavel'        },
    { id: 'search',        label: 'User / Pro Search', icon: 'manage_search' },
    { id: 'service-areas', label: 'Service Areas',     icon: 'location_on'   },
    { id: 'categories',    label: 'Categories',        icon: 'category'      },
    { id: 'invite-admin',  label: 'Invite Admin',      icon: 'person_add'    },
    { id: 'geocode',       label: 'Geocode',           icon: 'my_location'   },
    { id: 'settings',      label: 'Settings',          icon: 'tune'          },
  ];

  setView(view: AdminView): void {
    this.showToolsMenu = false;
    this.router.navigate([], {
      relativeTo: this.route,
      queryParams: { view },
      queryParamsHandling: 'merge'
    });
  }

  private applyView(view: AdminView): void {
    this.activeView = view;
    if (view === 'dashboard') this.loadDashboard();
    if (view === 'disputes') this.loadDisputes();
    if (view === 'settings') { this.loadSettings(); this.loadCommissionConfig(); this.loadTeamSettings(); }
    if (view === 'categories') this.loadAdminCategories();
    if (view === 'geocode') this.loadPendingGeocodes();
    this.cdr.markForCheck();
  }

  getActiveViewLabel(): string {
    return this.navItems.find(n => n.id === this.activeView)?.label ?? '';
  }

  getActiveViewIcon(): string {
    return this.navItems.find(n => n.id === this.activeView)?.icon ?? 'menu';
  }

  // ── Dashboard ─────────────────────────────────────────────────────────────
  dateRangePreset: '7d' | '30d' | '90d' | 'year' | 'all' | 'custom' = '30d';
  customFrom = '';
  customTo = '';
  metrics: RegistrationMetrics | null = null;
  isLoadingMetrics = false;
  jobsByCategory: CategoryJobCount[] = [];
  isLoadingJobsByCat = false;
  dashCountry = '';
  dashState = '';
  dashDistrict = '';

  loadDashboard(): void {
    this.loadRegistrationMetrics();
    this.loadJobsByCategory();
  }

  private computeRange(): { from?: string; to?: string } {
    const now = new Date();
    const iso = (d: Date) => d.toISOString();
    const daysAgo = (n: number) => iso(new Date(now.getTime() - n * 86400000));
    if (this.dateRangePreset === 'all') return {};
    if (this.dateRangePreset === 'custom') {
      const r: { from?: string; to?: string } = {};
      if (this.customFrom) r.from = new Date(this.customFrom).toISOString();
      if (this.customTo) {
        // make 'to' inclusive of the selected day by using the next day as the exclusive bound
        const t = new Date(this.customTo);
        t.setDate(t.getDate() + 1);
        r.to = t.toISOString();
      }
      return r;
    }
    if (this.dateRangePreset === 'year') return { from: iso(new Date(now.getFullYear(), 0, 1)), to: iso(now) };
    const days = this.dateRangePreset === '7d' ? 7 : this.dateRangePreset === '90d' ? 90 : 30;
    return { from: daysAgo(days), to: iso(now) };
  }

  applyPreset(preset: '7d' | '30d' | '90d' | 'year' | 'all'): void {
    this.dateRangePreset = preset;
    this.loadDashboard();
  }

  applyCustomRange(): void {
    this.dateRangePreset = 'custom';
    this.loadDashboard();
  }

  loadRegistrationMetrics(): void {
    const { from, to } = this.computeRange();
    this.isLoadingMetrics = true;
    this.adminUsersService.getRegistrationMetrics(from, to).subscribe({
      next: (m) => { this.metrics = m; this.isLoadingMetrics = false; this.cdr.markForCheck(); },
      error: () => { this.isLoadingMetrics = false; this.cdr.markForCheck(); }
    });
  }

  loadJobsByCategory(): void {
    const { from, to } = this.computeRange();
    this.isLoadingJobsByCat = true;
    this.adminUsersService.getJobsByCategory({
      country: this.dashCountry || undefined,
      state: this.dashState || undefined,
      district: this.dashDistrict || undefined,
      from, to,
    }).subscribe({
      next: (rows) => { this.jobsByCategory = rows ?? []; this.isLoadingJobsByCat = false; this.cdr.markForCheck(); },
      error: () => { this.isLoadingJobsByCat = false; this.cdr.markForCheck(); }
    });
  }

  get jobsByCategoryMax(): number {
    return this.jobsByCategory.reduce((m, r) => Math.max(m, r.count), 0);
  }

  barPct(count: number): number {
    const max = this.jobsByCategoryMax;
    return max > 0 ? Math.round((count / max) * 100) : 0;
  }

  // Region dropdown options, reusing the service areas already loaded in ngOnInit.
  get dashCountries(): string[] {
    return [...new Set(this.serviceAreas.map(a => a.country).filter((c): c is string => !!c))].sort();
  }
  get dashStates(): string[] {
    const src = this.dashCountry ? this.serviceAreas.filter(a => a.country === this.dashCountry) : this.serviceAreas;
    return [...new Set(src.map(a => a.state).filter((s): s is string => !!s))].sort();
  }
  get dashDistricts(): string[] {
    const src = this.serviceAreas.filter(a =>
      (!this.dashCountry || a.country === this.dashCountry) &&
      (!this.dashState || a.state === this.dashState));
    return [...new Set(src.map(a => a.district).filter((d): d is string => !!d))].sort();
  }

  onDashCountryChange(val: string): void { this.dashCountry = val; this.dashState = ''; this.dashDistrict = ''; this.loadJobsByCategory(); }
  onDashStateChange(val: string): void { this.dashState = val; this.dashDistrict = ''; this.loadJobsByCategory(); }
  onDashDistrictChange(val: string): void { this.dashDistrict = val; this.loadJobsByCategory(); }
  clearDashRegion(): void { this.dashCountry = ''; this.dashState = ''; this.dashDistrict = ''; this.loadJobsByCategory(); }

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
  isLoadingPendingPros = false;
  isLoadingPendingUsers = false;
  pendingProGeocodes: any[] = [];
  pendingUserGeocodes: any[] = [];
  proBackfillResult: { message: string; updated: number; failed: number; total: number; details: any[] } | null = null;
  userBackfillResult: { message: string; updated: number; failed: number; total: number; details: any[] } | null = null;

  // ── Service Radius ────────────────────────────────────────────────────────
  isEditingRadius = false;
  editRadiusValue = 25;

  // ── Entity Payments (user/pro detail tab) ────────────────────────────────
  entityPayments: any[] = [];
  isLoadingEntityPayments = false;
  refundingPaymentId: number | null = null;
  refundConfirmPaymentId: number | null = null;
  refundDirectNotes = '';

  // ── Pro Payouts (admin payout management) ────────────────────────────────
  proPayouts: Payout[] = [];
  isLoadingProPayouts = false;
  retryingPayoutId: number | null = null;

  loadEntityPayments(): void {
    const userId  = this.selectedUser?.id;
    const proId   = this.selectedPro?.id;
    if (!userId && !proId) return;

    this.isLoadingEntityPayments = true;
    this.adminUsersService.getAdminPayments(undefined, userId, proId).subscribe({
      next: (payments) => {
        this.entityPayments = payments ?? [];
        this.isLoadingEntityPayments = false;
        this.cdr.markForCheck();
      },
      error: () => {
        this.isLoadingEntityPayments = false;
        this.cdr.markForCheck();
      }
    });
  }

  openDirectRefundConfirm(paymentId: number): void {
    this.refundConfirmPaymentId = paymentId;
    this.refundDirectNotes = '';
  }

  confirmDirectRefund(paymentId: number): void {
    this.refundingPaymentId = paymentId;
    this.adminUsersService.refundPayment(paymentId, this.refundDirectNotes.trim() || 'Admin-initiated refund').subscribe({
      next: () => {
        const p = this.entityPayments.find(x => x.id === paymentId);
        if (p) {
          p.status = 'Refunded';
          p.refundedAt = new Date().toISOString();
          p.refundAmount = p.amount;
          p.refundReason = this.refundDirectNotes.trim() || 'Admin-initiated refund';
        }
        this.refundingPaymentId = null;
        this.refundConfirmPaymentId = null;
        this.snack.open('Refund processed successfully.', 'OK', { duration: 4000, panelClass: 'snack-success' });
        this.cdr.markForCheck();
      },
      error: (err) => {
        this.refundingPaymentId = null;
        const msg = err?.error?.message ?? 'Failed to process refund.';
        this.snack.open(msg, 'OK', { duration: 4000, panelClass: 'snack-error' });
        this.cdr.markForCheck();
      }
    });
  }

  loadProPayouts(proId: number): void {
    this.isLoadingProPayouts = true;
    this.payoutService.getAdminPayouts(proId).subscribe({
      next: (payouts) => {
        this.proPayouts = payouts ?? [];
        this.isLoadingProPayouts = false;
        this.cdr.markForCheck();
      },
      error: () => { this.isLoadingProPayouts = false; this.cdr.markForCheck(); }
    });
  }

  retryPayout(payoutId: number): void {
    this.retryingPayoutId = payoutId;
    this.payoutService.retryPayout(payoutId).subscribe({
      next: () => {
        const p = this.proPayouts.find(x => x.id === payoutId);
        if (p) p.status = 'Processing';
        this.retryingPayoutId = null;
        this.snack.open('Payout retry initiated.', 'OK', { duration: 3000, panelClass: 'snack-success' });
        this.cdr.markForCheck();
      },
      error: (err) => {
        this.retryingPayoutId = null;
        const msg = err?.error?.message ?? 'Payout retry failed.';
        this.snack.open(msg, 'OK', { duration: 4000, panelClass: 'snack-error' });
        this.cdr.markForCheck();
      }
    });
  }

  // ── Disputes ──────────────────────────────────────────────────────────────
  disputes: any[] = [];
  isLoadingDisputes = false;
  resolvingDisputeId: number | null = null;
  refundConfirmJobId: number | null = null;
  refundNotes = '';
  completeConfirmJobId: number | null = null;
  completeNotes = '';

  // Disputes view sub-tabs (open vs resolved history)
  disputeTab: 'open' | 'resolved' = 'open';
  resolvedDisputes: any[] = [];
  isLoadingResolved = false;
  resolvedFrom = '';
  resolvedTo = '';
  resolvedSearch = '';

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

  // ── Service Area List Filter ───────────────────────────────────────────────
  listFilterCountry = '';
  listFilterState = '';
  listShowInactive = false;

  get listStates(): string[] {
    const src = this.listFilterCountry
      ? this.serviceAreas.filter(a => a.country === this.listFilterCountry)
      : this.serviceAreas;
    return [...new Set(src.map(a => a.state).filter((s): s is string => !!s))].sort();
  }

  get filteredListAreas(): ServiceArea[] {
    return this.serviceAreas.filter(a => {
      if (!this.listShowInactive && !a.isActive) return false;
      if (this.listFilterCountry && a.country !== this.listFilterCountry) return false;
      if (this.listFilterState && a.state !== this.listFilterState) return false;
      return true;
    });
  }

  onListCountryChange(val: string): void {
    this.listFilterCountry = val;
    this.listFilterState = '';
  }

  onListStateChange(val: string): void {
    this.listFilterState = val;
  }

  onListInactiveChange(val: boolean): void {
    this.listShowInactive = val;
  }

  // ── Service Area Map ───────────────────────────────────────────────────────
  showMapView = false;
  mapFilterCountry = '';
  mapFilterState = '';
  mapShowInactive = false;
  isGeocodingAreas = false;
  private leafletMap: any = null;
  private mapMarkers: any[] = [];
  private geocodeCache = new Map<string, { lat: number; lng: number; geojson?: any } | null>();
  private regionBoundsCache = new Map<string, [[number, number], [number, number]] | null>();
  private mapLoadId = 0;
  private lastGeocodeMs = 0;

  get mapCountries(): string[] {
    return [...new Set(this.serviceAreas.map(a => a.country))].sort();
  }

  get mapStates(): string[] {
    const src = this.mapFilterCountry
      ? this.serviceAreas.filter(a => a.country === this.mapFilterCountry)
      : this.serviceAreas;
    return [...new Set(src.map(a => a.state).filter((s): s is string => !!s))].sort();
  }

  get filteredMapAreas(): ServiceArea[] {
    return this.serviceAreas.filter(a => {
      if (!this.mapShowInactive && !a.isActive) return false;
      if (this.mapFilterCountry && a.country !== this.mapFilterCountry) return false;
      if (this.mapFilterState && a.state !== this.mapFilterState) return false;
      return true;
    });
  }

  // ── Categories ────────────────────────────────────────────────────────────
  adminCategories: ServiceCategory[] = [];
  categoriesLoading = false;
  showAddCategoryForm = false;
  addingCategory = false;
  newCategory = { name: '', description: '', icon: '' };
  newCategoryError = '';
  editingCategoryId: number | null = null;
  editCategory = { name: '', description: '', icon: '', isActive: true };
  savingCategoryId: number | null = null;

  get activeCategoryCount(): number {
    return this.adminCategories.filter(c => c.isActive).length;
  }

  loadAdminCategories(): void {
    this.categoriesLoading = true;
    this.serviceCategoryService.getAllCategories().subscribe({
      next: cats => {
        this.adminCategories = cats;
        this.categoriesLoading = false;
        this.cdr.detectChanges();
      },
      error: () => {
        this.categoriesLoading = false;
        this.cdr.detectChanges();
      }
    });
  }

  submitNewCategory(): void {
    if (!this.newCategory.name.trim()) return;
    this.addingCategory = true;
    this.newCategoryError = '';
    this.serviceCategoryService.createCategory({
      name: this.newCategory.name.trim(),
      description: this.newCategory.description.trim() || undefined,
      icon: this.newCategory.icon.trim() || undefined,
    }).subscribe({
      next: cat => {
        cat.serviceCount = 0;
        this.adminCategories = [...this.adminCategories, cat].sort((a, b) => a.name.localeCompare(b.name));
        this.newCategory = { name: '', description: '', icon: '' };
        this.showAddCategoryForm = false;
        this.addingCategory = false;
        this.cdr.detectChanges();
        this.snack.open(`Category "${cat.name}" created`, 'OK', { duration: 2500, panelClass: 'snack-success' });
      },
      error: err => {
        this.newCategoryError = err.error?.message || err.error?.title || 'Failed to create category.';
        this.addingCategory = false;
        this.cdr.detectChanges();
      }
    });
  }

  startEditCategory(cat: ServiceCategory): void {
    this.editingCategoryId = cat.id;
    this.editCategory = { name: cat.name, description: cat.description ?? '', icon: cat.icon ?? '', isActive: cat.isActive };
    this.cdr.detectChanges();
  }

  cancelEditCategory(): void {
    this.editingCategoryId = null;
    this.cdr.detectChanges();
  }

  saveEditCategory(cat: ServiceCategory): void {
    if (!this.editCategory.name.trim()) return;
    this.savingCategoryId = cat.id;
    this.serviceCategoryService.updateCategory(cat.id, {
      ...cat,
      name: this.editCategory.name.trim(),
      description: this.editCategory.description.trim() || undefined,
      icon: this.editCategory.icon.trim() || undefined,
      isActive: this.editCategory.isActive,
    }).subscribe({
      next: updated => {
        const idx = this.adminCategories.findIndex(c => c.id === cat.id);
        if (idx >= 0) this.adminCategories[idx] = { ...updated, serviceCount: cat.serviceCount };
        this.adminCategories = [...this.adminCategories].sort((a, b) => a.name.localeCompare(b.name));
        this.editingCategoryId = null;
        this.savingCategoryId = null;
        this.cdr.detectChanges();
        this.snack.open('Category updated', 'OK', { duration: 2000, panelClass: 'snack-success' });
      },
      error: () => {
        this.savingCategoryId = null;
        this.cdr.detectChanges();
        this.snack.open('Failed to update category', 'OK', { duration: 3000, panelClass: 'snack-error' });
      }
    });
  }

  toggleCategoryActive(cat: ServiceCategory): void {
    this.savingCategoryId = cat.id;
    this.serviceCategoryService.updateCategory(cat.id, { ...cat, isActive: !cat.isActive }).subscribe({
      next: updated => {
        const idx = this.adminCategories.findIndex(c => c.id === cat.id);
        if (idx >= 0) this.adminCategories[idx] = { ...updated, serviceCount: cat.serviceCount };
        this.adminCategories = [...this.adminCategories];
        this.savingCategoryId = null;
        this.cdr.detectChanges();
      },
      error: () => {
        this.savingCategoryId = null;
        this.cdr.detectChanges();
        this.snack.open('Failed to update category', 'OK', { duration: 3000, panelClass: 'snack-error' });
      }
    });
  }

  // ── Settings ───────────────────────────────────────────────────────────────
  settingsLoading = false;
  settingsSaving = false;
  showProCountOnCategories = false;

  loadSettings(): void {
    this.settingsLoading = true;
    this.settingsService.getSetting('show_pro_count_on_categories').subscribe(value => {
      this.showProCountOnCategories = value === 'true';
      this.settingsLoading = false;
      this.cdr.detectChanges();
    });
  }

  toggleShowProCount(enabled: boolean): void {
    this.settingsSaving = true;
    this.settingsService.updateSetting('show_pro_count_on_categories', String(enabled)).subscribe({
      next: () => {
        this.showProCountOnCategories = enabled;
        this.settingsSaving = false;
        this.cdr.detectChanges();
        this.snack.open(`Pro count display ${enabled ? 'enabled' : 'disabled'}`, 'OK', { duration: 2500, panelClass: 'snack-success' });
      },
      error: () => {
        this.settingsSaving = false;
        this.cdr.detectChanges();
        this.snack.open('Failed to save setting', 'OK', { duration: 3000, panelClass: 'snack-error' });
      }
    });
  }

  // ── Our Team management (platform settings) ────────────────────────────────
  showOurTeam = false;
  ourTeamSaving = false;
  teamMembers: TeamMember[] = [];
  teamLoading = false;
  showAddTeamForm = false;
  addingTeamMember = false;
  newTeamMember: Partial<TeamMember> = { name: '', role: '', bio: '', initials: '', displayOrder: 0, isActive: true };
  editingTeamMemberId: number | null = null;
  editTeamMember: Partial<TeamMember> = {};
  savingTeamMemberId: number | null = null;

  loadTeamSettings(): void {
    this.settingsService.getSetting('show_our_team').subscribe(value => {
      this.showOurTeam = value === 'true';
      this.cdr.detectChanges();
    });
    this.teamLoading = true;
    this.teamService.getAll().subscribe({
      next: members => { this.teamMembers = members ?? []; this.teamLoading = false; this.cdr.detectChanges(); },
      error: () => { this.teamLoading = false; this.cdr.detectChanges(); }
    });
  }

  toggleOurTeam(enabled: boolean): void {
    this.ourTeamSaving = true;
    this.settingsService.updateSetting('show_our_team', String(enabled)).subscribe({
      next: () => {
        this.showOurTeam = enabled;
        this.ourTeamSaving = false;
        this.cdr.detectChanges();
        this.snack.open(`Our Team section ${enabled ? 'shown' : 'hidden'}`, 'OK', { duration: 2500, panelClass: 'snack-success' });
      },
      error: () => {
        this.ourTeamSaving = false;
        this.cdr.detectChanges();
        this.snack.open('Failed to save setting', 'OK', { duration: 3000, panelClass: 'snack-error' });
      }
    });
  }

  submitNewTeamMember(): void {
    if (!this.newTeamMember.name?.trim()) return;
    this.addingTeamMember = true;
    this.teamService.create(this.newTeamMember).subscribe({
      next: m => {
        this.teamMembers = [...this.teamMembers, m].sort((a, b) => (a.displayOrder ?? 0) - (b.displayOrder ?? 0));
        this.newTeamMember = { name: '', role: '', bio: '', initials: '', displayOrder: 0, isActive: true };
        this.showAddTeamForm = false;
        this.addingTeamMember = false;
        this.cdr.detectChanges();
        this.snack.open('Team member added', 'OK', { duration: 2000, panelClass: 'snack-success' });
      },
      error: () => { this.addingTeamMember = false; this.cdr.detectChanges(); this.snack.open('Failed to add member', 'OK', { duration: 3000, panelClass: 'snack-error' }); }
    });
  }

  startEditTeamMember(m: TeamMember): void {
    this.editingTeamMemberId = m.id;
    this.editTeamMember = { ...m };
    this.cdr.detectChanges();
  }

  cancelEditTeamMember(): void { this.editingTeamMemberId = null; this.cdr.detectChanges(); }

  saveTeamMember(m: TeamMember): void {
    if (!this.editTeamMember.name?.trim()) return;
    this.savingTeamMemberId = m.id;
    this.teamService.update(m.id, this.editTeamMember).subscribe({
      next: updated => {
        const idx = this.teamMembers.findIndex(x => x.id === m.id);
        if (idx >= 0) this.teamMembers[idx] = updated;
        this.teamMembers = [...this.teamMembers].sort((a, b) => (a.displayOrder ?? 0) - (b.displayOrder ?? 0));
        this.editingTeamMemberId = null;
        this.savingTeamMemberId = null;
        this.cdr.detectChanges();
        this.snack.open('Team member updated', 'OK', { duration: 2000, panelClass: 'snack-success' });
      },
      error: () => { this.savingTeamMemberId = null; this.cdr.detectChanges(); this.snack.open('Failed to update member', 'OK', { duration: 3000, panelClass: 'snack-error' }); }
    });
  }

  deleteTeamMember(m: TeamMember): void {
    this.teamService.remove(m.id).subscribe({
      next: () => {
        this.teamMembers = this.teamMembers.filter(x => x.id !== m.id);
        this.cdr.detectChanges();
        this.snack.open('Team member removed', 'OK', { duration: 2000, panelClass: 'snack-info' });
      },
      error: () => { this.snack.open('Failed to remove member', 'OK', { duration: 3000, panelClass: 'snack-error' }); }
    });
  }

  // ── Commission Config ─────────────────────────────────────────────────────
  commissionConfig: CommissionConfig | null = null;
  commissionDraft: CommissionConfig = {
    userCommissionPercent: 10,
    proCommissionPercent: 10,
    gstPercent: 18,
    minPlatformFee: 10,
    maxCommissionPercent: 20,
  };
  commissionLoading = false;
  commissionSaving = false;
  commissionEditing = false;
  readonly previewBid = 1000;

  get previewUserCommission(): number {
    const c = this.commissionDraft;
    let fee = (this.previewBid * c.userCommissionPercent) / 100;
    fee = Math.max(fee, c.minPlatformFee);
    fee = Math.min(fee, (this.previewBid * c.maxCommissionPercent) / 100);
    return Math.round(fee * 100) / 100;
  }
  get previewGst(): number {
    return Math.round(this.previewUserCommission * this.commissionDraft.gstPercent) / 100;
  }
  get previewUserTotal(): number {
    return this.previewBid + this.previewUserCommission + this.previewGst;
  }
  get previewProDeduction(): number {
    return Math.round((this.previewBid * this.commissionDraft.proCommissionPercent) / 100 * 100) / 100;
  }
  get previewProPayout(): number {
    return this.previewBid - this.previewProDeduction;
  }
  get previewPlatformEarnings(): number {
    return this.previewUserCommission + this.previewProDeduction;
  }

  loadCommissionConfig(): void {
    this.commissionLoading = true;
    this.adminUsersService.getCommissionConfig().subscribe({
      next: (config) => {
        this.commissionConfig = config;
        this.commissionDraft = { ...config };
        this.commissionEditing = false;
        this.commissionLoading = false;
        this.cdr.detectChanges();
      },
      error: () => {
        this.commissionLoading = false;
        this.cdr.detectChanges();
      }
    });
  }

  startEditingCommission(): void {
    if (this.commissionConfig) this.commissionDraft = { ...this.commissionConfig };
    this.commissionEditing = true;
  }

  cancelEditingCommission(): void {
    if (this.commissionConfig) this.commissionDraft = { ...this.commissionConfig };
    this.commissionEditing = false;
  }

  saveCommissionConfig(): void {
    this.commissionSaving = true;
    this.adminUsersService.updateCommissionConfig(this.commissionDraft).subscribe({
      next: () => {
        this.commissionConfig = { ...this.commissionDraft };
        this.commissionEditing = false;
        this.commissionSaving = false;
        this.cdr.detectChanges();
        this.snack.open('Commission settings saved', 'OK', { duration: 2500, panelClass: 'snack-success' });
      },
      error: () => {
        this.commissionSaving = false;
        this.cdr.detectChanges();
        this.snack.open('Failed to save commission settings', 'OK', { duration: 3000, panelClass: 'snack-error' });
      }
    });
  }

  constructor(
    private adminUsersService: AdminUsersService,
    private auth: Auth,
    private cdr: ChangeDetectorRef,
    private router: Router,
    private route: ActivatedRoute,
    private dialog: MatDialog,
    private proUsersService: ProUsersService,
    private snack: MatSnackBar,
    private serviceAreaService: ServiceAreaService,
    private bottomSheet: MatBottomSheet,
    private http: HttpClient,
    private payoutService: PayoutService,
    private settingsService: SettingsService,
    private serviceCategoryService: ServiceCategoryService,
    private teamService: TeamService
  ) {}

  ngOnInit(): void {
    if (this.auth.getUserType() !== 'Admin') {
      this.router.navigate(['/']);
      return;
    }
    this.loadInvitations();
    this.loadServiceAreas();
    this.viewSub = this.route.queryParamMap.pipe(
      map(params => {
        const view = params.get('view') as AdminView | null;
        return view && this.navItems.some(n => n.id === view) ? view : 'dashboard' as AdminView;
      }),
      distinctUntilChanged()
    ).subscribe(view => this.applyView(view));
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

  setDisputeTab(tab: 'open' | 'resolved'): void {
    this.disputeTab = tab;
    if (tab === 'resolved' && this.resolvedDisputes.length === 0) this.loadResolvedDisputes();
  }

  openCompleteConfirm(jobId: number): void {
    this.completeConfirmJobId = jobId;
    this.completeNotes = '';
    this.refundConfirmJobId = null;
  }

  confirmComplete(jobId: number): void {
    if (!this.completeNotes.trim()) return;
    this.resolveDispute(jobId, 'complete', this.completeNotes.trim());
  }

  openRefundConfirm(jobId: number): void {
    this.refundConfirmJobId = jobId;
    this.refundNotes = '';
    this.completeConfirmJobId = null;
  }

  confirmRefund(jobId: number): void {
    if (!this.refundNotes.trim()) return;
    this.resolveDispute(jobId, 'refund', this.refundNotes.trim());
  }

  resolveDispute(jobId: number, resolution: 'complete' | 'refund', notes: string): void {
    this.resolvingDisputeId = jobId;
    this.adminUsersService.resolveDispute(jobId, resolution, notes).subscribe({
      next: (result) => {
        this.disputes = this.disputes.filter(d => d.jobId !== jobId);
        this.resolvingDisputeId = null;
        this.refundConfirmJobId = null;
        this.refundNotes = '';
        this.completeConfirmJobId = null;
        this.completeNotes = '';
        // Reflect the new resolution in the history tab next time it's viewed.
        this.resolvedDisputes = [];
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

  loadResolvedDisputes(): void {
    this.isLoadingResolved = true;
    const from = this.resolvedFrom ? new Date(this.resolvedFrom).toISOString() : undefined;
    let to: string | undefined;
    if (this.resolvedTo) {
      const t = new Date(this.resolvedTo);
      t.setDate(t.getDate() + 1); // make the 'to' day inclusive
      to = t.toISOString();
    }
    this.adminUsersService.getResolvedDisputes(from, to, this.resolvedSearch.trim() || undefined).subscribe({
      next: (rows) => { this.resolvedDisputes = rows ?? []; this.isLoadingResolved = false; this.cdr.markForCheck(); },
      error: () => { this.isLoadingResolved = false; this.cdr.markForCheck(); }
    });
  }

  applyResolvedFilters(): void { this.loadResolvedDisputes(); }
  clearResolvedFilters(): void {
    this.resolvedFrom = '';
    this.resolvedTo = '';
    this.resolvedSearch = '';
    this.loadResolvedDisputes();
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
    this.entityPayments = [];
    this.refundConfirmPaymentId = null;
    this.loadUserDetails(user.id);
    this.loadRelationships('user', user.id);
    this.loadEntityPayments();
  }

  selectPro(pro: Pro): void {
    this.selectedPro = pro;
    this.selectedUser = null;

    this.linkedUsers = [];
    this.linkedPros = [];
    this.addUserId = null;
    this.entityPayments = [];
    this.proPayouts = [];
    this.refundConfirmPaymentId = null;
    this.loadProDetails(pro.id);
    this.loadRelationships('pro', pro.id);
    this.loadEntityPayments();
    this.loadProPayouts(pro.id);
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

  loadPendingGeocodes(): void {
    this.loadPendingGeocodePros();
    this.loadPendingGeocodeUsers();
  }

  loadPendingGeocodePros(): void {
    this.isLoadingPendingPros = true;
    this.adminUsersService.getPendingGeocodePros().subscribe({
      next: (data) => { this.pendingProGeocodes = data; this.isLoadingPendingPros = false; this.cdr.markForCheck(); },
      error: () => { this.isLoadingPendingPros = false; this.cdr.markForCheck(); }
    });
  }

  loadPendingGeocodeUsers(): void {
    this.isLoadingPendingUsers = true;
    this.adminUsersService.getPendingGeocodeUsers().subscribe({
      next: (data) => { this.pendingUserGeocodes = data; this.isLoadingPendingUsers = false; this.cdr.markForCheck(); },
      error: () => { this.isLoadingPendingUsers = false; this.cdr.markForCheck(); }
    });
  }

  runGeocodeBackfillPros(): void {
    this.isBackfillingPros = true;
    this.proBackfillResult = null;
    this.adminUsersService.geocodeBackfillPros().subscribe({
      next: (result) => {
        this.isBackfillingPros = false;
        this.proBackfillResult = result;
        this.loadPendingGeocodePros();
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
        this.loadPendingGeocodeUsers();
        this.cdr.markForCheck();
      },
      error: (err: any) => {
        this.isBackfillingUsers = false;
        this.snack.open(err?.error?.message ?? 'User geocode backfill failed.', 'OK', { duration: 4000, panelClass: 'snack-error' });
        this.cdr.markForCheck();
      }
    });
  }

  // ── State abbreviation expansion ──────────────────────────────────────────

  private readonly STATE_ABBREVIATIONS: Record<string, Record<string, string>> = {
    india: {
      AN: 'Andaman and Nicobar Islands', AP: 'Andhra Pradesh', AR: 'Arunachal Pradesh',
      AS: 'Assam', BR: 'Bihar', CH: 'Chandigarh', CG: 'Chhattisgarh', CT: 'Chhattisgarh',
      DN: 'Dadra and Nagar Haveli and Daman and Diu', DL: 'Delhi', GA: 'Goa', GJ: 'Gujarat',
      HR: 'Haryana', HP: 'Himachal Pradesh', JK: 'Jammu and Kashmir', JH: 'Jharkhand',
      KA: 'Karnataka', KL: 'Kerala', LA: 'Ladakh', LD: 'Lakshadweep', MP: 'Madhya Pradesh',
      MH: 'Maharashtra', MN: 'Manipur', ML: 'Meghalaya', MZ: 'Mizoram', NL: 'Nagaland',
      OD: 'Odisha', OR: 'Odisha', PY: 'Puducherry', PB: 'Punjab', RJ: 'Rajasthan',
      SK: 'Sikkim', TN: 'Tamil Nadu', TS: 'Telangana', TG: 'Telangana', TR: 'Tripura',
      UP: 'Uttar Pradesh', UK: 'Uttarakhand', UT: 'Uttarakhand', WB: 'West Bengal',
    },
    canada: {
      AB: 'Alberta', BC: 'British Columbia', MB: 'Manitoba', NB: 'New Brunswick',
      NL: 'Newfoundland and Labrador', NS: 'Nova Scotia', NT: 'Northwest Territories',
      NU: 'Nunavut', ON: 'Ontario', PE: 'Prince Edward Island', QC: 'Quebec',
      SK: 'Saskatchewan', YT: 'Yukon',
    },
    'united states': {
      AL: 'Alabama', AK: 'Alaska', AZ: 'Arizona', AR: 'Arkansas', CA: 'California',
      CO: 'Colorado', CT: 'Connecticut', DE: 'Delaware', FL: 'Florida', GA: 'Georgia',
      HI: 'Hawaii', ID: 'Idaho', IL: 'Illinois', IN: 'Indiana', IA: 'Iowa', KS: 'Kansas',
      KY: 'Kentucky', LA: 'Louisiana', ME: 'Maine', MD: 'Maryland', MA: 'Massachusetts',
      MI: 'Michigan', MN: 'Minnesota', MS: 'Mississippi', MO: 'Missouri', MT: 'Montana',
      NE: 'Nebraska', NV: 'Nevada', NH: 'New Hampshire', NJ: 'New Jersey', NM: 'New Mexico',
      NY: 'New York', NC: 'North Carolina', ND: 'North Dakota', OH: 'Ohio', OK: 'Oklahoma',
      OR: 'Oregon', PA: 'Pennsylvania', RI: 'Rhode Island', SC: 'South Carolina',
      SD: 'South Dakota', TN: 'Tennessee', TX: 'Texas', UT: 'Utah', VT: 'Vermont',
      VA: 'Virginia', WA: 'Washington', WV: 'West Virginia', WI: 'Wisconsin', WY: 'Wyoming',
      DC: 'District of Columbia',
    },
    australia: {
      ACT: 'Australian Capital Territory', NSW: 'New South Wales', NT: 'Northern Territory',
      QLD: 'Queensland', SA: 'South Australia', TAS: 'Tasmania', VIC: 'Victoria',
      WA: 'Western Australia',
    },
    'united kingdom': {
      ENG: 'England', SCT: 'Scotland', WLS: 'Wales', NIR: 'Northern Ireland',
    },
  };

  private expandStateAbbrev(country: string, state: string): string {
    if (!state?.trim()) return state;
    const map = this.STATE_ABBREVIATIONS[country.trim().toLowerCase()];
    if (!map) return state;
    return map[state.trim().toUpperCase()] ?? state;
  }

  expandNewAreaState(): void {
    if (this.newArea.state && this.newArea.country) {
      this.newArea.state = this.expandStateAbbrev(this.newArea.country, this.newArea.state);
    }
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
    const state = this.expandStateAbbrev(this.newArea.country, this.newArea.state.trim());
    this.serviceAreaService.add({
      country: this.newArea.country.trim(),
      state: state || undefined,
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
        if (this.showMapView) this.loadMapMarkers();
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
        if (this.showMapView) this.loadMapMarkers();
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

  ngOnDestroy(): void {
    this.viewSub?.unsubscribe();
    if (this.leafletMap) { this.leafletMap.remove(); this.leafletMap = null; }
  }

  // ── Service Area Map ───────────────────────────────────────────────────────

  toggleMapView(): void {
    this.showMapView = !this.showMapView;
    if (this.showMapView) {
      this.geocodeCache.clear();
      this.regionBoundsCache.clear();
      this.mapFilterCountry = this.mapCountries.includes('India') ? 'India' : (this.mapCountries[0] ?? '');
      this.mapFilterState = '';
      setTimeout(() => this.initMap(), 150);
    } else {
      if (this.leafletMap) { this.leafletMap.remove(); this.leafletMap = null; }
    }
  }

  onMapCountryChange(val: string): void {
    this.mapFilterCountry = val;
    this.mapFilterState = '';
    this.loadMapMarkers();
  }

  onMapStateChange(val: string): void {
    this.mapFilterState = val;
    this.loadMapMarkers();
  }

  onMapInactiveChange(val: boolean): void {
    this.mapShowInactive = val;
    this.loadMapMarkers();
  }

  private async geocodeArea(area: ServiceArea): Promise<{ lat: number; lng: number; geojson?: any } | null> {
    const pin = area.pinCode ? this.formatPostalCode(area.pinCode) : undefined;
    const key = [pin, area.district, area.state, area.country].filter(Boolean).join('|');
    if (this.geocodeCache.has(key)) return this.geocodeCache.get(key) ?? null;

    // Nominatim public API: max 1 req/s — wait if we fired one recently
    const wait = 1150 - (Date.now() - this.lastGeocodeMs);
    if (wait > 0) await new Promise(r => setTimeout(r, wait));
    this.lastGeocodeMs = Date.now();

    const base: Record<string, string> = { format: 'json', limit: '1', 'accept-language': 'en', polygon_geojson: '1' };

    // PIN codes: use free-text — structured postalcode= is unreliable for Indian PINs.
    // District/state: use structured params to match administrative boundaries precisely.
    const queries: Record<string, string>[] = [];
    if (pin) {
      const q = [pin, area.district, area.state, area.country].filter(Boolean).join(', ');
      queries.push({ ...base, q });
      // Postal codes may not exist in Nominatim (e.g. Canadian codes) — fall back to region level
      if (area.district) {
        const structured: Record<string, string> = { ...base, county: area.district, country: area.country };
        if (area.state) structured['state'] = area.state;
        queries.push(structured, { ...base, q: [area.district, area.state, area.country].filter(Boolean).join(', ') });
      } else if (area.state) {
        queries.push({ ...base, state: area.state, country: area.country });
      } else {
        queries.push({ ...base, country: area.country });
      }
    } else if (area.district) {
      const structured: Record<string, string> = { ...base, county: area.district, country: area.country };
      if (area.state) structured['state'] = area.state;
      const freeText = [area.district, area.state, area.country].filter(Boolean).join(', ');
      queries.push(structured, { ...base, q: freeText }); // fallback to free-text if structured misses
    } else if (area.state) {
      queries.push({ ...base, state: area.state, country: area.country });
    } else {
      queries.push({ ...base, country: area.country });
    }

    for (const qparams of queries) {
      // Rate-limit only on actual network calls (already waited above for the first; subsequent
      // fallback calls need their own wait)
      if (qparams !== queries[0]) {
        const w2 = 1150 - (Date.now() - this.lastGeocodeMs);
        if (w2 > 0) await new Promise(r => setTimeout(r, w2));
        this.lastGeocodeMs = Date.now();
      }
      try {
        const results = await firstValueFrom(
          this.http.get<any[]>('https://nominatim.openstreetmap.org/search', { params: qparams })
        );
        if (results && results.length > 0) {
          const r = results[0];
          const pos = {
            lat: parseFloat(r.lat),
            lng: parseFloat(r.lon),
            geojson: (r.geojson && r.geojson.type !== 'Point') ? r.geojson : undefined,
          };
          this.geocodeCache.set(key, pos);
          return pos;
        }
      } catch {}
    }
    this.geocodeCache.set(key, null);
    return null;
  }

  private async initMap(): Promise<void> {
    const container = document.getElementById('service-area-map');
    if (!container) return;

    const L = await import('leaflet');
    if (this.leafletMap) { this.leafletMap.remove(); this.leafletMap = null; }

    this.leafletMap = L.map(container).setView([20, 78], 5);
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
      maxZoom: 18
    }).addTo(this.leafletMap);

    await this.loadMapMarkers();
  }

  async loadMapMarkers(): Promise<void> {
    if (!this.leafletMap) return;
    const L = await import('leaflet');
    const loadId = ++this.mapLoadId;

    this.mapMarkers.forEach(m => m.remove());
    this.mapMarkers = [];
    this.isGeocodingAreas = true;
    this.cdr.markForCheck();

    const areas = this.filteredMapAreas;
    const latLngs: [number, number][] = [];

    for (const area of areas) {
      if (loadId !== this.mapLoadId) return;
      const pos = await this.geocodeArea(area);
      if (loadId !== this.mapLoadId) return;
      if (!pos) continue;

      latLngs.push([pos.lat, pos.lng]);
      const color = area.isActive ? '#10b981' : '#9ca3af';
      const icon = L.divIcon({
        className: '',
        html: `<div style="width:14px;height:14px;border-radius:50%;background:${color};border:2px solid #fff;box-shadow:0 1px 5px rgba(0,0,0,0.35)"></div>`,
        iconSize: [14, 14],
        iconAnchor: [7, 7],
      });

      const breadcrumb = [area.district, area.state, area.country].filter(Boolean).map(s => this.escHtml(s!)).join(', ');
      const popup = `<div style="font-family:Roboto,sans-serif;min-width:160px;line-height:1.5">
        <p style="margin:0 0 4px;font-size:14px;font-weight:700;color:#1f2937">${this.escHtml(area.district || area.state || area.country)}</p>
        ${area.district && area.state ? `<p style="margin:0 0 2px;font-size:12px;color:#6b7280">${this.escHtml(area.state)}</p>` : ''}
        <p style="margin:0 0 4px;font-size:12px;color:#6b7280">${this.escHtml(area.country)}</p>
        ${area.pinCode ? `<p style="margin:0 0 4px;font-size:12px;color:#9ca3af">PIN: ${this.escHtml(area.pinCode)}</p>` : ''}
        <span style="font-size:12px;font-weight:600;color:${area.isActive ? '#10b981' : '#9ca3af'}">${area.isActive ? '✓ Active' : '✗ Inactive'}</span>
        ${area.isAutoEnrolled ? '<span style="font-size:11px;color:#f57c00;margin-left:6px">· Auto-enrolled</span>' : ''}
      </div>`;

      if (pos.geojson) {
        const fillColor = area.isActive ? '#10b981' : '#9ca3af';
        const poly = L.geoJSON(pos.geojson, {
          style: { color: fillColor, weight: 2, opacity: 0.7, fillColor, fillOpacity: 0.12 }
        }).bindPopup(popup, { maxWidth: 240 }).addTo(this.leafletMap);
        this.mapMarkers.push(poly);
      }

      const marker = L.marker([pos.lat, pos.lng], { icon, title: breadcrumb })
        .bindPopup(popup, { maxWidth: 240 })
        .addTo(this.leafletMap);
      this.mapMarkers.push(marker);
    }

    if (loadId !== this.mapLoadId) return;

    // When a filter is active, zoom to the region's geographic extent so the
    // filter has a clear visual effect even if all markers happen to be there already.
    if (this.mapFilterCountry) {
      const fitted = await this.fitToRegion(loadId);
      if (!fitted && latLngs.length > 0) {
        this.leafletMap.fitBounds(latLngs, { padding: [40, 40], maxZoom: 10 });
      }
    } else if (latLngs.length > 0) {
      this.leafletMap.fitBounds(latLngs, { padding: [40, 40], maxZoom: 10 });
    }

    if (loadId !== this.mapLoadId) return;
    this.isGeocodingAreas = false;
    this.cdr.markForCheck();
  }

  private async fitToRegion(loadId: number): Promise<boolean> {
    const regionKey = [this.mapFilterState, this.mapFilterCountry].filter(Boolean).join(', ');

    if (!this.regionBoundsCache.has(regionKey)) {
      const wait = 1150 - (Date.now() - this.lastGeocodeMs);
      if (wait > 0) await new Promise(r => setTimeout(r, wait));
      if (loadId !== this.mapLoadId) return true;
      this.lastGeocodeMs = Date.now();

      try {
        const results = await firstValueFrom(
          this.http.get<any[]>('https://nominatim.openstreetmap.org/search', {
            params: { q: regionKey, format: 'json', limit: '1', 'accept-language': 'en' }
          })
        );
        if (results?.length > 0 && results[0].boundingbox) {
          const [s, n, w, e] = (results[0].boundingbox as string[]).map(Number);
          this.regionBoundsCache.set(regionKey, [[s, w], [n, e]]);
        } else {
          this.regionBoundsCache.set(regionKey, null);
        }
      } catch {
        this.regionBoundsCache.set(regionKey, null);
      }
    }

    if (loadId !== this.mapLoadId) return true;
    const bounds = this.regionBoundsCache.get(regionKey) ?? null;
    if (bounds && this.leafletMap) {
      this.leafletMap.fitBounds(bounds, { padding: [30, 30] });
      return true;
    }
    return false;
  }

  private formatPostalCode(code: string): string {
    // Canadian postal codes: 6-char alternating letter-digit (e.g. L2G0L0 → L2G 0L0)
    const clean = code.replace(/\s/g, '');
    if (/^[A-Za-z]\d[A-Za-z]\d[A-Za-z]\d$/.test(clean)) {
      return clean.substring(0, 3) + ' ' + clean.substring(3);
    }
    return code;
  }

  private escHtml(s: string): string {
    return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
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
