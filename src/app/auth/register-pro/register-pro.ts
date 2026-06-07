import { Component, OnInit, OnDestroy, ViewChild, ElementRef, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { Subject, of } from 'rxjs';
import { switchMap, catchError, takeUntil } from 'rxjs/operators';
import { Auth } from '../../core/services/auth';
import { AddressService, AddressPrediction } from '../../core/services/address.service';

@Component({
  selector: 'app-register-pro',
  standalone: true,
  imports: [CommonModule, RouterModule, FormsModule],
  templateUrl: './register-pro.html',
  styleUrls: ['./register-pro.scss']
})
export class RegisterProComponent implements OnInit, OnDestroy {
  @ViewChild('addressInput') addressInput: ElementRef | undefined;

  // Step 1 fields
  businessName = '';
  name = '';
  email = '';
  phoneNumber = '';
  password = '';

  // Step 2 fields
  houseNameNumber = '';
  street1 = '';
  street2 = '';
  city = '';
  state = '';
  country = '';
  zipPostalCode = '';
  district = '';
  latitude: number | null = null;
  longitude: number | null = null;

  // Step state
  currentStep: 1 | 2 = 1;
  draftProId: number | null = null;
  step1Loading = false;
  step2Loading = false;
  step1Error = '';
  step2Error = '';
  step1ShowLoginLink = false;

  // Address autocomplete
  addressPredictions: AddressPrediction[] = [];
  showAddressList = false;
  addressLoading = false;

  private addressSearch$ = new Subject<string>();
  private destroy$ = new Subject<void>();

  constructor(
    private auth: Auth,
    private router: Router,
    private addressService: AddressService,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit(): void {
    if (this.auth.isAuthenticated()
        && this.auth.getUserType() === 'Pro'
        && !this.auth.isProfileComplete()) {
      const proId = parseInt(this.auth.getUserId() ?? '0', 10);
      if (proId > 0) {
        this.draftProId = proId;
        this.currentStep = 2;
      }
    }

    this.addressSearch$.pipe(
      switchMap(input => {
        this.addressLoading = true;
        this.cdr.detectChanges();
        return this.addressService.getAddressPredictions(input).pipe(
          catchError(() => of([] as AddressPrediction[]))
        );
      }),
      takeUntil(this.destroy$)
    ).subscribe(predictions => {
      this.addressPredictions = predictions;
      this.showAddressList = predictions.length > 0;
      this.addressLoading = false;
      this.cdr.detectChanges();
    });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  onStep1Next(form: any): void {
    if (!form.valid) return;
    if (this.draftProId !== null) {
      this.currentStep = 2;
      return;
    }
    this.step1Loading = true;
    this.step1Error = '';
    this.step1ShowLoginLink = false;
    this.auth.registerProStep1({
      Name: this.name,
      Email: this.email,
      Password: this.password,
      PhoneNumber: this.phoneNumber,
      BusinessName: this.businessName,
    }).subscribe({
      next: res => {
        this.draftProId = res.proId;
        this.currentStep = 2;
        this.step1Loading = false;
        this.cdr.detectChanges();
      },
      error: err => {
        this.step1Error = err.error?.message || 'Could not save. Please try again.';
        this.step1ShowLoginLink = err.status === 400;
        this.step1Loading = false;
        this.cdr.detectChanges();
      }
    });
  }

  goBack(): void {
    this.currentStep = 1;
  }

  onStep2Submit(form: any): void {
    if (!form.valid || this.draftProId === null) return;
    this.step2Loading = true;
    this.step2Error = '';
    this.auth.registerProStep2(this.draftProId, {
      HouseNameNumber: this.houseNameNumber,
      Street1: this.street1,
      Street2: this.street2,
      City: this.city,
      District: this.district,
      State: this.state,
      Country: this.country,
      ZipPostalCode: this.zipPostalCode,
      Latitude: this.latitude,
      Longitude: this.longitude,
    }).subscribe({
      next: () => {
        this.step2Loading = false;
        this.cdr.detectChanges();
        this.router.navigate(['/']);
      },
      error: err => {
        this.step2Error = err.error?.message || 'Could not complete registration. Please try again.';
        this.step2Loading = false;
        this.cdr.detectChanges();
      }
    });
  }

  onAddressInput(event: any): void {
    const input = event.target.value;
    if (input && input.length >= 3) {
      this.addressSearch$.next(input);
    } else {
      this.showAddressList = false;
      this.addressPredictions = [];
      this.addressLoading = false;
      this.cdr.detectChanges();
    }
  }

  onAddressSelected(prediction: AddressPrediction): void {
    this.showAddressList = false;
    const d = prediction.details;
    if (!d) return;

    this.houseNameNumber = d.houseNameNumber;
    this.street1        = d.street1;
    this.street2        = d.street2;
    this.city           = d.city;
    this.state          = d.state;
    this.country        = d.country;
    this.zipPostalCode  = d.zipPostalCode;
    this.latitude       = d.latitude ?? null;
    this.longitude      = d.longitude ?? null;
    this.district       = d.district || '';

    if (this.addressInput) {
      this.addressInput.nativeElement.value = prediction.description;
    }
    this.cdr.detectChanges();
  }

  hideAddressList(): void {
    setTimeout(() => { this.showAddressList = false; }, 200);
  }
}
