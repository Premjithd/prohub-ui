import { Component, OnInit, OnDestroy, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { TranslateModule } from '@ngx-translate/core';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { BusinessService, BusinessSummary, BusinessMember, CreateBusinessRequest } from '../../core/services/business.service';
import { AddressService, AddressPrediction } from '../../core/services/address.service';
import { Subject, of } from 'rxjs';
import { switchMap, catchError, takeUntil } from 'rxjs/operators';

@Component({
  selector: 'app-my-businesses',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule, TranslateModule, MatSnackBarModule, MatIconModule, MatProgressSpinnerModule],
  templateUrl: './my-businesses.html',
  styleUrl: './my-businesses.scss'
})
export class MyBusinessesComponent implements OnInit, OnDestroy {
  businesses: BusinessSummary[] = [];
  loading = true;
  error = '';

  // Selected business detail
  selectedBiz: any = null;
  bizDetail: any = null;
  bizDetailLoading = false;
  members: BusinessMember[] = [];
  membersLoading = false;

  // Create business panel
  showCreatePanel = false;
  createLoading = false;
  createError = '';
  newBizName = '';
  newBizHouse = '';
  newBizStreet1 = '';
  newBizStreet2 = '';
  newBizCity = '';
  newBizDistrict = '';
  newBizState = '';
  newBizCountry = '';
  newBizZip = '';
  newBizLat: number | null = null;
  newBizLng: number | null = null;
  migrateSoloServices = false;

  // Add member panel
  showAddMemberPanel = false;
  addMemberEmail = '';
  addMemberRole = 'Member';
  addMemberLoading = false;
  addMemberError = '';

  // Address autocomplete
  addressPredictions: AddressPrediction[] = [];
  showAddressList = false;
  addressLoading = false;
  private addressSearch$ = new Subject<string>();
  private destroy$ = new Subject<void>();

  constructor(
    private bizService: BusinessService,
    private addressService: AddressService,
    private snackBar: MatSnackBar,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit(): void {
    this.loadBusinesses();

    this.addressSearch$.pipe(
      switchMap(input => {
        this.addressLoading = true;
        return this.addressService.getAddressPredictions(input).pipe(
          catchError(() => of([] as AddressPrediction[]))
        );
      }),
      takeUntil(this.destroy$)
    ).subscribe(predictions => {
      this.addressPredictions = predictions;
      this.showAddressList = predictions.length > 0;
      this.addressLoading = false;
      this.cdr.markForCheck();
    });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  loadBusinesses(): void {
    this.loading = true;
    this.bizService.getMyBusinesses().subscribe({
      next: data => { this.businesses = data; this.loading = false; this.cdr.markForCheck(); },
      error: () => { this.error = 'Could not load businesses.'; this.loading = false; this.cdr.markForCheck(); }
    });
  }

  selectBusiness(biz: BusinessSummary): void {
    this.selectedBiz = biz;
    this.showAddMemberPanel = false;
    this.membersLoading = true;
    this.bizDetailLoading = true;
    this.bizDetail = null;
    this.bizService.getMembers(biz.id).subscribe({
      next: data => { this.members = data; this.membersLoading = false; this.cdr.markForCheck(); },
      error: () => { this.membersLoading = false; this.cdr.markForCheck(); }
    });
    this.bizService.getBusiness(biz.id).subscribe({
      next: detail => { this.bizDetail = detail; this.bizDetailLoading = false; this.cdr.markForCheck(); },
      error: () => { this.bizDetailLoading = false; this.cdr.markForCheck(); }
    });
  }

  clearSelection(): void {
    this.selectedBiz = null;
    this.bizDetail = null;
    this.members = [];
  }

  isOwner(): boolean {
    return this.selectedBiz?.role === 'Owner';
  }

  onCreateBusiness(form: any): void {
    if (!form.valid) return;
    this.createLoading = true;
    this.createError = '';
    const req: CreateBusinessRequest = {
      businessName: this.newBizName,
      houseNameNumber: this.newBizHouse,
      street1: this.newBizStreet1,
      street2: this.newBizStreet2,
      city: this.newBizCity,
      district: this.newBizDistrict,
      state: this.newBizState,
      country: this.newBizCountry,
      zipPostalCode: this.newBizZip,
      latitude: this.newBizLat,
      longitude: this.newBizLng,
      migrateSoloServices: this.migrateSoloServices,
    };
    this.bizService.createBusiness(req).subscribe({
      next: () => {
        this.showCreatePanel = false;
        this.createLoading = false;
        this.resetCreateForm();
        this.cdr.markForCheck();
        this.loadBusinesses();
        this.snackBar.open('Business created!', 'OK', { duration: 3000, panelClass: 'snack-success' });
      },
      error: err => {
        this.createError = err.error?.message || 'Could not create business.';
        this.createLoading = false;
        this.cdr.markForCheck();
      }
    });
  }

  private resetCreateForm(): void {
    this.newBizName = '';
    this.newBizHouse = '';
    this.newBizStreet1 = '';
    this.newBizStreet2 = '';
    this.newBizCity = '';
    this.newBizDistrict = '';
    this.newBizState = '';
    this.newBizCountry = '';
    this.newBizZip = '';
    this.newBizLat = null;
    this.newBizLng = null;
    this.migrateSoloServices = false;
  }

  onAddMember(form: any): void {
    if (!form.valid || !this.selectedBiz) return;
    this.addMemberLoading = true;
    this.addMemberError = '';
    this.bizService.addMember(this.selectedBiz.id, this.addMemberEmail, this.addMemberRole).subscribe({
      next: () => {
        this.addMemberEmail = '';
        this.addMemberRole = 'Member';
        this.addMemberLoading = false;
        this.showAddMemberPanel = false;
        this.cdr.markForCheck();
        this.selectBusiness(this.selectedBiz);
        this.snackBar.open('Member added!', 'OK', { duration: 3000, panelClass: 'snack-success' });
      },
      error: err => {
        this.addMemberError = err.error?.message || 'Could not add member.';
        this.addMemberLoading = false;
        this.cdr.markForCheck();
      }
    });
  }

  removeMember(membershipId: number): void {
    if (!this.selectedBiz) return;
    this.bizService.removeMember(this.selectedBiz.id, membershipId).subscribe({
      next: () => {
        this.members = this.members.filter(m => m.id !== membershipId);
        this.cdr.markForCheck();
        this.snackBar.open('Member removed.', 'OK', { duration: 2500, panelClass: 'snack-info' });
      },
      error: err => {
        this.snackBar.open(err.error?.message || 'Could not remove member.', 'OK', { duration: 3000, panelClass: 'snack-error' });
      }
    });
  }

  migrateServices(): void {
    if (!this.selectedBiz) return;
    this.bizService.migrateServices(this.selectedBiz.id).subscribe({
      next: res => {
        this.snackBar.open(`${res.migrated} service(s) migrated to this business.`, 'OK', { duration: 3500, panelClass: 'snack-success' });
      },
      error: () => {
        this.snackBar.open('Could not migrate services.', 'OK', { duration: 3000, panelClass: 'snack-error' });
      }
    });
  }

  // ── Address autocomplete ───────────────────────────────────────────────

  onAddressInput(event: any): void {
    const input = event.target.value;
    if (input && input.length >= 3) {
      this.addressSearch$.next(input);
    } else {
      this.showAddressList = false;
      this.addressPredictions = [];
    }
  }

  onAddressSelected(prediction: AddressPrediction): void {
    this.showAddressList = false;
    const d = prediction.details;
    if (!d) return;
    this.newBizHouse   = d.houseNameNumber;
    this.newBizStreet1 = d.street1;
    this.newBizStreet2 = d.street2;
    this.newBizCity    = d.city;
    this.newBizState   = d.state;
    this.newBizCountry = d.country;
    this.newBizZip     = d.zipPostalCode;
    this.newBizLat     = d.latitude ?? null;
    this.newBizLng     = d.longitude ?? null;
    this.newBizDistrict = d.district || '';
  }

  hideAddressList(): void {
    setTimeout(() => { this.showAddressList = false; }, 200);
  }
}
