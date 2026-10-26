import { Component, OnInit, OnDestroy, ViewChild, ElementRef, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { TranslateModule } from '@ngx-translate/core';
import { Subject, of } from 'rxjs';
import { switchMap, catchError, takeUntil } from 'rxjs/operators';
import { isValidPhoneNumber } from 'libphonenumber-js/min';
import { Auth } from '../../core/services/auth';
import { AddressService, AddressPrediction } from '../../core/services/address.service';
import { BusinessService } from '../../core/services/business.service';

@Component({
  selector: 'app-register-pro',
  standalone: true,
  imports: [CommonModule, RouterModule, FormsModule, TranslateModule],
  templateUrl: './register-pro.html',
  styleUrls: ['./register-pro.scss']
})
export class RegisterProComponent implements OnInit, OnDestroy {
  @ViewChild('proAddressInput') proAddressInput: ElementRef | undefined;

  readonly countryCodes = [
    { code: '+91',  label: 'IN (+91)'     }, { code: '+1',   label: 'US/CA (+1)'   },
    { code: '+44',  label: 'UK (+44)'     }, { code: '+61',  label: 'AU (+61)'     },
    { code: '+64',  label: 'NZ (+64)'     }, { code: '+65',  label: 'SG (+65)'     },
    { code: '+60',  label: 'MY (+60)'     }, { code: '+971', label: 'UAE (+971)'   },
    { code: '+966', label: 'SA (+966)'    }, { code: '+974', label: 'QA (+974)'    },
    { code: '+965', label: 'KW (+965)'    }, { code: '+968', label: 'OM (+968)'    },
    { code: '+973', label: 'BH (+973)'    }, { code: '+880', label: 'BD (+880)'    },
    { code: '+94',  label: 'LK (+94)'     }, { code: '+92',  label: 'PK (+92)'     },
    { code: '+49',  label: 'DE (+49)'     }, { code: '+33',  label: 'FR (+33)'     },
    { code: '+39',  label: 'IT (+39)'     }, { code: '+34',  label: 'ES (+34)'     },
    { code: '+31',  label: 'NL (+31)'     }, { code: '+86',  label: 'CN (+86)'     },
    { code: '+81',  label: 'JP (+81)'     }, { code: '+82',  label: 'KR (+82)'     },
    { code: '+66',  label: 'TH (+66)'     }, { code: '+62',  label: 'ID (+62)'     },
    { code: '+63',  label: 'PH (+63)'     }, { code: '+27',  label: 'ZA (+27)'     },
    { code: '+55',  label: 'BR (+55)'     }, { code: '+52',  label: 'MX (+52)'     },
  ];

  // ── Step 1: Create Login (account) ────────────────────────────────────
  proName = '';
  email = '';
  proPhoneDialCode = '+91';
  proPhoneNumber = '';
  password = '';
  proPhoneInvalid = false;
  step1Loading = false;
  step1Error = '';
  step1ShowLoginLink = false;

  // ── Step 2: Service location (required) ───────────────────────────────
  proHouseNameNumber = '';
  proStreet1 = '';
  proStreet2 = '';
  proCity = '';
  proDistrict = '';
  proState = '';
  proCountry = '';
  proZipPostalCode = '';
  proLatitude: number | null = null;
  proLongitude: number | null = null;
  proZipLookupLoading = false;

  // Address autocomplete (service location)
  proAddressPredictions: AddressPrediction[] = [];
  showProAddressList = false;
  proAddressLoading = false;

  // ── Step 2: Business (optional) ───────────────────────────────────────
  addBusiness = false;
  bizName = '';
  bizPhoneDialCode = '+91';
  bizPhoneNumber = '';
  bizPhoneInvalid = false;
  savedBusinessId: number | null = null;

  step2Loading = false;
  step2Error = '';
  step2ShowLoginLink = false;

  // ── Shared state ──────────────────────────────────────────────────────
  currentStep: 1 | 2 = 1;
  draftProId: number | null = null;

  private proAddressSearch$ = new Subject<string>();
  private destroy$ = new Subject<void>();

  constructor(
    private auth: Auth,
    private router: Router,
    private addressService: AddressService,
    private bizService: BusinessService,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit(): void {
    // Resume incomplete registration: account created but no location yet.
    if (this.auth.isAuthenticated()
        && this.auth.getUserType() === 'Pro'
        && !this.auth.isProfileComplete()) {
      const proId = parseInt(this.auth.getUserId() ?? '0', 10);
      if (proId > 0) {
        this.draftProId = proId;
        this.currentStep = 2;
      }
    }

    this.proAddressSearch$.pipe(
      switchMap(input => {
        this.proAddressLoading = true;
        this.cdr.detectChanges();
        return this.addressService.getAddressPredictions(input).pipe(
          catchError(() => of([] as AddressPrediction[]))
        );
      }),
      takeUntil(this.destroy$)
    ).subscribe(predictions => {
      this.proAddressPredictions = predictions;
      this.showProAddressList = predictions.length > 0;
      this.proAddressLoading = false;
      this.cdr.detectChanges();
    });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  // ── Step 1: account ───────────────────────────────────────────────────

  onEmailChange(): void {
    if (this.step1Error || this.step1ShowLoginLink) {
      this.step1Error = '';
      this.step1ShowLoginLink = false;
    }
  }

  onProPhoneBlur(): void {
    if (!this.proPhoneNumber) { this.proPhoneInvalid = false; return; }
    this.proPhoneInvalid = !isValidPhoneNumber(this.proPhoneDialCode + this.proPhoneNumber);
    this.cdr.detectChanges();
  }
  onProPhoneChange(): void { this.proPhoneInvalid = false; }
  onProDialCodeChange(): void { if (this.proPhoneNumber) this.onProPhoneBlur(); }

  onStep1Next(form: any): void {
    if (!form.valid) return;
    this.proPhoneInvalid = !isValidPhoneNumber(this.proPhoneDialCode + this.proPhoneNumber);
    if (this.proPhoneInvalid) return;

    // Already have a draft (resumed or came back) — just advance.
    if (this.draftProId !== null) {
      this.currentStep = 2;
      return;
    }

    this.step1Loading = true;
    this.step1Error = '';
    this.step1ShowLoginLink = false;
    this.auth.registerProStep1({
      Name: this.proName,
      Email: this.email,
      Password: this.password,
      PhoneNumber: this.proPhoneDialCode + this.proPhoneNumber,
      BusinessName: this.proName,
    }).subscribe({
      next: res => {
        this.draftProId = res.proId;
        this.currentStep = 2;
        this.step1Loading = false;
        this.cdr.detectChanges();
      },
      error: err => {
        this.step1Error = err.error?.message || 'Could not create account. Please try again.';
        this.step1ShowLoginLink = err.status === 400;
        this.step1Loading = false;
        this.cdr.detectChanges();
      }
    });
  }

  // ── Step 2: location + optional business ──────────────────────────────

  goBack(): void { this.currentStep = 1; }

  // Native checkbox toggles don't fire reliably under zoneless change
  // detection, so drive the toggle explicitly from (click).
  toggleBusiness(): void {
    this.addBusiness = !this.addBusiness;
    if (!this.addBusiness) this.bizPhoneInvalid = false;
    this.cdr.detectChanges();
  }

  onBizPhoneBlur(): void {
    if (!this.bizPhoneNumber) { this.bizPhoneInvalid = false; return; }
    this.bizPhoneInvalid = !isValidPhoneNumber(this.bizPhoneDialCode + this.bizPhoneNumber);
    this.cdr.detectChanges();
  }
  onBizPhoneChange(): void { this.bizPhoneInvalid = false; }
  onBizDialCodeChange(): void { if (this.bizPhoneNumber) this.onBizPhoneBlur(); }

  onProAddressInput(event: any): void {
    const v = event.target.value;
    if (v?.length >= 3) this.proAddressSearch$.next(v);
    else { this.showProAddressList = false; this.proAddressPredictions = []; this.cdr.detectChanges(); }
  }

  onProAddressSelected(p: AddressPrediction): void {
    this.showProAddressList = false;
    const d = p.details;
    if (!d) return;
    this.proHouseNameNumber = d.houseNameNumber;
    this.proStreet1        = d.street1;
    this.proStreet2        = d.street2;
    this.proCity           = d.city;
    this.proState          = d.state;
    this.proCountry        = d.country;
    this.proZipPostalCode  = d.zipPostalCode;
    this.proLatitude       = d.latitude ?? null;
    this.proLongitude      = d.longitude ?? null;
    this.proDistrict       = d.district || '';
    if (this.proAddressInput) this.proAddressInput.nativeElement.value = p.description;
    this.cdr.detectChanges();
  }

  hideProAddressList(): void { setTimeout(() => { this.showProAddressList = false; }, 200); }

  onProZipBlur(): void {
    const code = this.proZipPostalCode?.trim();
    if (!code || code.length < 3) return;
    this.proZipLookupLoading = true;
    this.cdr.detectChanges();
    this.addressService.lookupByPostcode(code).subscribe({
      next: d => {
        if (d) {
          if (d.city)      this.proCity      = d.city;
          if (d.state)     this.proState     = d.state;
          if (d.country)   this.proCountry   = d.country;
          if (d.district)  this.proDistrict  = d.district;
          if (d.latitude)  this.proLatitude  = d.latitude ?? null;
          if (d.longitude) this.proLongitude = d.longitude ?? null;
        }
        this.proZipLookupLoading = false;
        this.cdr.detectChanges();
      },
      error: () => { this.proZipLookupLoading = false; this.cdr.detectChanges(); }
    });
  }

  onStep2Submit(form: any): void {
    if (!form.valid || this.draftProId === null) return;

    if (this.addBusiness) {
      this.bizPhoneInvalid = !isValidPhoneNumber(this.bizPhoneDialCode + this.bizPhoneNumber);
      if (this.bizPhoneInvalid) return;
    }

    this.step2Loading = true;
    this.step2Error = '';

    if (!this.addBusiness) {
      this.completeStep2(null);
      return;
    }

    // Optional business uses the service-location address as its address.
    this.bizService.preRegisterBusiness({
      businessId: this.savedBusinessId,
      businessName: this.bizName,
      phone: this.bizPhoneDialCode + this.bizPhoneNumber,
      houseNameNumber: this.proHouseNameNumber,
      street1: this.proStreet1,
      street2: this.proStreet2,
      city: this.proCity,
      district: this.proDistrict,
      state: this.proState,
      country: this.proCountry,
      zipPostalCode: this.proZipPostalCode,
      latitude: this.proLatitude,
      longitude: this.proLongitude,
    }).subscribe({
      next: res => {
        this.savedBusinessId = res.businessId;
        this.completeStep2(res.businessId);
      },
      error: err => {
        this.step2Error = err.error?.message || 'Could not save business. Please try again.';
        this.step2Loading = false;
        this.cdr.detectChanges();
      }
    });
  }

  private completeStep2(businessId: number | null): void {
    this.auth.registerProStep2(this.draftProId!, {
      HouseNameNumber: this.proHouseNameNumber,
      Street1:        this.proStreet1,
      Street2:        this.proStreet2,
      City:           this.proCity,
      District:       this.proDistrict,
      State:          this.proState,
      Country:        this.proCountry,
      ZipPostalCode:  this.proZipPostalCode,
      Latitude:       this.proLatitude,
      Longitude:      this.proLongitude,
      BusinessId:     businessId,
    }).subscribe({
      next: () => {
        this.step2Loading = false;
        this.router.navigate(['/']);
        this.cdr.detectChanges();
      },
      error: err => {
        this.step2Error = err.error?.message || 'Could not complete registration. Please try again.';
        this.step2Loading = false;
        this.cdr.detectChanges();
      }
    });
  }
}
