import { Component, ViewChild, ElementRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { Auth } from '../../core/services/auth';
import { AddressService, AddressPrediction, AddressDetails } from '../../core/services/address.service';

@Component({
  selector: 'app-register-user',
  imports: [CommonModule, FormsModule],
  templateUrl: './register.html',
  styleUrl: './register.scss'
})
export class RegisterUserComponent {
  @ViewChild('addressInput') addressInput: ElementRef | undefined;

  addressPredictions: AddressPrediction[] = [];
  showAddressList = false;
  addressLoading = false;

  constructor(private auth: Auth, private router: Router, private addressService: AddressService) {}

  onAddressInput(event: any, form: any): void {
    const input = event.target.value;
    if (input && input.length >= 3) {
      this.addressLoading = true;
      this.addressService.getAddressPredictions(input).subscribe({
        next: (predictions) => {
          this.addressPredictions = predictions;
          this.showAddressList = predictions.length > 0;
          this.addressLoading = false;
        },
        error: () => {
          this.addressLoading = false;
          this.addressPredictions = [];
        }
      });
    } else {
      this.showAddressList = false;
      this.addressPredictions = [];
    }
  }

  onAddressSelected(prediction: AddressPrediction, form: any): void {
    this.addressLoading = true;
    this.showAddressList = false;

    this.addressService.getAddressDetails(prediction.placeId).subscribe({
      next: (details: AddressDetails) => {
        // Update form fields with parsed address details
        form.value.houseNameNumber = details.houseNameNumber;
        form.value.street1 = details.street1;
        form.value.street2 = details.street2;
        form.value.city = details.city;
        form.value.state = details.state;
        form.value.country = details.country;
        form.value.zipPostalCode = details.zipPostalCode;

        // Update the input field
        if (this.addressInput) {
          this.addressInput.nativeElement.value = prediction.description;
        }

        this.addressLoading = false;
      },
      error: (error) => {
        console.error('Error fetching address details:', error);
        this.addressLoading = false;
      }
    });
  }

  hideAddressList(): void {
    setTimeout(() => {
      this.showAddressList = false;
    }, 200);
  }

  onSubmit(form: any): void {
    if (form.valid) {
      this.auth.registerUser(form.value).subscribe({
        next: (response) => {
          console.log('User registration successful:', response);
          alert('User registered successfully!');
          this.router.navigate(['/']);
        },
        error: (error) => {
          console.error('User registration failed:', error);
          alert('Registration failed. Please try again.');
        }
      });
    }
  }
}
