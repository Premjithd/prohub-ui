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
  @ViewChild('bizAddressInput') bizAddressInput: ElementRef | undefined;
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

  // ── Step 1: Business Setup (optional) ─────────────────────────────────
  bizName = '';
  bizPhoneDialCode = '+91';
  bizPhoneNumber = '';
  bizHouseNameNumber = '';
  bizStreet1 = '';
  bizStreet2 = '';
  bizCity = '';
  bizDistrict = '';
  bizState = '';
  bizCountry = '';
  bizZipPostalCode = '';
  bizLatitude: number | null = null;
  bizLongitude: number | null = null;
  bizPhoneInvalid = false;
  step1Loading = false;
  step1Error = '';

  // Address autocomplete (Step 1 — business address)
  bizAddressPredictions: AddressPrediction[] = [];
  showBizAddressList = false;
  bizAddressLoading = false;
  bizZipLookupLoading = false;

  // ── Step 2: Create Login ──────────────────────────────────────────────
  proName = '';
  email = '';
  proPhoneDialCode = '+91';
  proPhoneNumber = '';
  password = '';
  proPhoneInvalid = false;

  // Solo Pro location (shown when Step 1 was skipped)
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

  // Address autocomplete (Step 2 — solo Pro location)
  proAddressPredictions: AddressPrediction[] = [];
  showProAddressList = false;
  proAddressLoading = false;

  step2Loading = false;
  step2Error = '';
  step2ShowLoginLink = false;

  // ── Shared state ──────────────────────────────────────────────────────
  currentStep: 1 | 2 = 1;
  draftProId: number | null = null;
  savedBusinessId: number | null = null;

  private bizAddressSearch$ = new Subject<string>();
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
    if (this.auth.isAuthenticated()
        && this.auth.getUserType() === 'Pro'
        && !this.auth.isProfileComplete()) {
      const proId = parseInt(this.auth.getUserId() ?? '0', 10);
      if (proId > 0) {
        this.draftProId = proId;
        this.currentStep = 2;
      }
    }

    this.bizAddressSearch$.pipe(
      switchMap(input => {
        this.bizAddressLoading = true;
        this.cdr.detectChanges();
        return this.addressService.getAddressPredictions(input).pipe(
          catchError(() => of([] as AddressPrediction[]))
        );
      }),
      takeUntil(this.destroy$)
    ).subscribe(predictions => {
      this.bizAddressPredictions = predictions;
      this.showBizAddressList = predictions.length > 0;
      this.bizAddressLoading = false;
      this.cdr.detectChanges();
    });

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

  get isSoloPro(): boolean {
    return this.savedBusinessId === null && this.currentStep === 2;
  }

  // ── Step 1 ────────────────────────────────────────────────────────────

  skipBusiness(): void {
    this.savedBusinessId = null;
    this.currentStep = 2;
  }

  onStep1Save(form: any): void {
    if (!form.valid) return;
    if (!isValidPhoneNumber(this.bizPhoneDialCode + this.bizPhoneNumber)) {
      this.bizPhoneInvalid = true;
      return;
    }
    this.step1Loading = true;
    this.step1Error = '';
    this.bizService.preRegisterBusiness({
      businessName: this.bizName,
      phone: this.bizPhoneDialCode + this.bizPhoneNumber,
      houseNameNumber: this.bizHouseNameNumber,
      street1: this.bizStreet1,
      street2: this.bizStreet2,
      city: this.bizCity,
      district: this.bizDistrict,
      state: this.bizState,
      country: this.bizCountry,
      zipPostalCode: this.bizZipPostalCode,
      latitude: this.bizLatitude,
      longitude: this.bizLongitude,
    }).subscribe({
      next: res => {
        this.savedBusinessId = res.businessId;
        this.step1Loading = false;
        this.currentStep = 2;
        this.cdr.detectChanges();
      },
      error: err => {
        this.step1Error = err.error?.message || 'Could not save business. Please try again.';
        this.step1Loading = false;
        this.cdr.detectChanges();
      }
    });
  }

  onBizPhoneBlur(): void {
    if (!this.bizPhoneNumber) { this.bizPhoneInvalid = false; return; }
    this.bizPhoneInvalid = !isValidPhoneNumber(this.bizPhoneDialCode + this.bizPhoneNumber);
    this.cdr.detectChanges();
  }
  onBizPhoneChange(): void { this.bizPhoneInvalid = false; }
  onBizDialCodeChange(): void { if (this.bizPhoneNumber) this.onBizPhoneBlur(); }

  onBizAddressInput(event: any): void {
    const v = event.target.value;
    if (v?.length >= 3) this.bizAddressSearch$.next(v);
    else { this.showBizAddressList = false; this.bizAddressPredictions = []; this.cdr.detectChanges(); }
  }

  onBizAddressSelected(p: AddressPrediction): void {
    this.showBizAddressList = false;
    const d = p.details;
    if (!d) return;
    this.bizHouseNameNumber = d.houseNameNumber;
    this.bizStreet1        = d.street1;
    this.bizStreet2        = d.street2;
    this.bizCity           = d.city;
    this.bizState          = d.state;
    this.bizCountry        = d.country;
    this.bizZipPostalCode  = d.zipPostalCode;
    this.bizLatitude       = d.latitude ?? null;
    this.bizLongitude      = d.longitude ?? null;
    this.bizDistrict       = d.district || '';
    if (this.bizAddressInput) this.bizAddressInput.nativeElement.value = p.description;
    this.cdr.detectChanges();
  }

  hideBizAddressList(): void { setTimeout(() => { this.showBizAddressList = false; }, 200); }

  onBizZipBlur(): void {
    const code = this.bizZipPostalCode?.trim();
    if (!code || code.length < 3) return;
    this.bizZipLookupLoading = true;
    this.cdr.detectChanges();
    this.addressService.lookupByPostcode(code).subscribe({
      next: d => {
        if (d) {
          if (d.city)      this.bizCity      = d.city;
          if (d.state)     this.bizState     = d.state;
          if (d.country)   this.bizCountry   = d.country;
          if (d.district)  this.bizDistrict  = d.district;
          if (d.latitude)  this.bizLatitude  = d.latitude ?? null;
          if (d.longitude) this.bizLongitude = d.longitude ?? null;
        }
        this.bizZipLookupLoading = false;
        this.cdr.detectChanges();
      },
      error: () => { this.bizZipLookupLoading = false; this.cdr.detectChanges(); }
    });
  }

  // ── Step 2 ────────────────────────────────────────────────────────────

  goBack(): void { this.currentStep = 1; }

  onProPhoneBlur(): void {
    if (!this.proPhoneNumber) { this.proPhoneInvalid = false; return; }
    this.proPhoneInvalid = !isValidPhoneNumber(this.proPhoneDialCode + this.proPhoneNumber);
    this.cdr.detectChanges();
  }
  onProPhoneChange(): void { this.proPhoneInvalid = false; }
  onProDialCodeChange(): void { if (this.proPhoneNumber) this.onProPhoneBlur(); }

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
    if (!form.valid) return;
    this.proPhoneInvalid = !isValidPhoneNumber(this.proPhoneDialCode + this.proPhoneNumber);
    if (this.proPhoneInvalid) return;

    this.step2Loading = true;
    this.step2Error = '';
    this.step2ShowLoginLink = false;

    if (this.draftProId !== null) {
      this.completeStep2();
      return;
    }

    this.auth.registerProStep1({
      Name: this.proName,
      Email: this.email,
      Password: this.password,
      PhoneNumber: this.proPhoneDialCode + this.proPhoneNumber,
      BusinessName: this.bizName || this.proName,
    }).subscribe({
      next: res => {
        this.draftProId = res.proId;
        this.completeStep2();
      },
      error: err => {
        this.step2Error = err.error?.message || 'Could not create account. Please try again.';
        this.step2ShowLoginLink = err.status === 400;
        this.step2Loading = false;
        this.cdr.detectChanges();
      }
    });
  }

  private completeStep2(): void {
    // Use business address if it exists; otherwise use pro location fields
    const usesBizAddress = this.savedBusinessId !== null;
    this.auth.registerProStep2(this.draftProId!, {
      HouseNameNumber: usesBizAddress ? this.bizHouseNameNumber : this.proHouseNameNumber,
      Street1:        usesBizAddress ? this.bizStreet1         : this.proStreet1,
      Street2:        usesBizAddress ? this.bizStreet2         : this.proStreet2,
      City:           usesBizAddress ? this.bizCity            : this.proCity,
      District:       usesBizAddress ? this.bizDistrict        : this.proDistrict,
      State:          usesBizAddress ? this.bizState           : this.proState,
      Country:        usesBizAddress ? this.bizCountry         : this.proCountry,
      ZipPostalCode:  usesBizAddress ? this.bizZipPostalCode   : this.proZipPostalCode,
      Latitude:       usesBizAddress ? this.bizLatitude        : this.proLatitude,
      Longitude:      usesBizAddress ? this.bizLongitude       : this.proLongitude,
      BusinessId:     this.savedBusinessId,
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
