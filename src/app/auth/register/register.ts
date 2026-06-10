import { Component, OnInit, OnDestroy, ViewChild, ElementRef, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import { TranslateModule } from '@ngx-translate/core';
import { Subject, of } from 'rxjs';
import { switchMap, catchError, takeUntil } from 'rxjs/operators';
import { isValidPhoneNumber } from 'libphonenumber-js/min';
import { Auth } from '../../core/services/auth';
import { AddressService, AddressPrediction } from '../../core/services/address.service';

@Component({
  selector: 'app-register-user',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule, TranslateModule],
  templateUrl: './register.html',
  styleUrl: './register.scss'
})
export class RegisterUserComponent implements OnInit, OnDestroy {
  @ViewChild('addressInput') addressInput: ElementRef | undefined;

  readonly countryCodes = [
    { code: '+1',   label: 'US/CA (+1)'   }, { code: '+44',  label: 'UK (+44)'    },
    { code: '+91',  label: 'IN (+91)'     }, { code: '+61',  label: 'AU (+61)'    },
    { code: '+64',  label: 'NZ (+64)'     }, { code: '+65',  label: 'SG (+65)'    },
    { code: '+60',  label: 'MY (+60)'     }, { code: '+971', label: 'UAE (+971)'  },
    { code: '+966', label: 'SA (+966)'    }, { code: '+974', label: 'QA (+974)'   },
    { code: '+965', label: 'KW (+965)'    }, { code: '+968', label: 'OM (+968)'   },
    { code: '+973', label: 'BH (+973)'    }, { code: '+49',  label: 'DE (+49)'    },
    { code: '+33',  label: 'FR (+33)'     }, { code: '+39',  label: 'IT (+39)'    },
    { code: '+34',  label: 'ES (+34)'     }, { code: '+31',  label: 'NL (+31)'    },
    { code: '+46',  label: 'SE (+46)'     }, { code: '+47',  label: 'NO (+47)'    },
    { code: '+45',  label: 'DK (+45)'     }, { code: '+41',  label: 'CH (+41)'    },
    { code: '+43',  label: 'AT (+43)'     }, { code: '+32',  label: 'BE (+32)'    },
    { code: '+86',  label: 'CN (+86)'     }, { code: '+81',  label: 'JP (+81)'    },
    { code: '+82',  label: 'KR (+82)'     }, { code: '+66',  label: 'TH (+66)'    },
    { code: '+62',  label: 'ID (+62)'     }, { code: '+63',  label: 'PH (+63)'    },
    { code: '+84',  label: 'VN (+84)'     }, { code: '+880', label: 'BD (+880)'   },
    { code: '+94',  label: 'LK (+94)'     }, { code: '+92',  label: 'PK (+92)'    },
    { code: '+27',  label: 'ZA (+27)'     }, { code: '+234', label: 'NG (+234)'   },
    { code: '+254', label: 'KE (+254)'    }, { code: '+20',  label: 'EG (+20)'    },
    { code: '+55',  label: 'BR (+55)'     }, { code: '+52',  label: 'MX (+52)'    },
    { code: '+54',  label: 'AR (+54)'     }, { code: '+57',  label: 'CO (+57)'    },
  ];

  // Step 1 fields
  firstName = '';
  lastName = '';
  email = '';
  phoneDialCode = '+91';
  phoneNumber = '';
  password = '';

  // Step 2 fields
  houseNameNumber = '';
  street1 = '';
  street2 = '';
  city = '';
  district = '';
  state = '';
  country = '';
  zipPostalCode = '';
  latitude: number | null = null;
  longitude: number | null = null;

  // Step state
  currentStep: 1 | 2 = 1;
  draftUserId: number | null = null;
  step1Loading = false;
  step2Loading = false;
  step1Error = '';
  step2Error = '';
  step1ShowLoginLink = false;

  phoneInvalid = false;

  // Address autocomplete
  addressPredictions: AddressPrediction[] = [];
  showAddressList = false;
  addressLoading = false;
  zipLookupLoading = false;

  private addressSearch$ = new Subject<string>();
  private destroy$ = new Subject<void>();

  constructor(
    private auth: Auth,
    private router: Router,
    private addressService: AddressService,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit(): void {
    // Resume incomplete registration: user completed step 1 but not step 2 (address)
    if (this.auth.isAuthenticated()
        && this.auth.getUserType() === 'User'
        && !this.auth.isProfileComplete()) {
      const userId = parseInt(this.auth.getUserId() ?? '0', 10);
      if (userId > 0) {
        this.draftUserId = userId;
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

  onEmailChange(): void {
    if (this.step1Error || this.step1ShowLoginLink) {
      this.step1Error = '';
      this.step1ShowLoginLink = false;
    }
  }

  onPhoneBlur(): void {
    if (!this.phoneNumber) return;
    this.phoneInvalid = !isValidPhoneNumber(this.phoneDialCode + this.phoneNumber);
    this.cdr.detectChanges();
  }

  onPhoneChange(): void {
    this.phoneInvalid = false;
  }

  onDialCodeChange(): void {
    if (this.phoneNumber) {
      this.phoneInvalid = !isValidPhoneNumber(this.phoneDialCode + this.phoneNumber);
      this.cdr.detectChanges();
    }
  }

  onStep1Next(form: any): void {
    if (!form.valid) return;
    this.phoneInvalid = !isValidPhoneNumber(this.phoneDialCode + this.phoneNumber);
    if (this.phoneInvalid) return;
    this.step1Loading = true;
    this.step1Error = '';
    this.step1ShowLoginLink = false;
    this.auth.registerUserStep1({
      FirstName: this.firstName,
      LastName: this.lastName,
      Email: this.email,
      Password: this.password,
      PhoneNumber: this.phoneDialCode + this.phoneNumber,
    }).subscribe({
      next: res => {
        this.draftUserId = res.userId;
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
    if (!form.valid || this.draftUserId === null) return;
    this.step2Loading = true;
    this.step2Error = '';
    this.auth.registerUserStep2(this.draftUserId, {
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

  onZipBlur(): void {
    const code = this.zipPostalCode?.trim();
    if (!code || code.length < 3) return;
    this.zipLookupLoading = true;
    this.cdr.detectChanges();
    this.addressService.lookupByPostcode(code).subscribe({
      next: details => {
        if (details) {
          if (details.city)      this.city      = details.city;
          if (details.state)     this.state     = details.state;
          if (details.country)   this.country   = details.country;
          if (details.district)  this.district  = details.district;
          if (details.latitude)  this.latitude  = details.latitude ?? null;
          if (details.longitude) this.longitude = details.longitude ?? null;
        }
        this.zipLookupLoading = false;
        this.cdr.detectChanges();
      },
      error: () => { this.zipLookupLoading = false; this.cdr.detectChanges(); }
    });
  }
}
