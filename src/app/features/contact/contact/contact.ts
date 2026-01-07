import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-contact',
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './contact.html',
  styleUrl: './contact.scss'
})
export class ContactComponent implements OnInit {
  contactForm!: FormGroup;
  isSubmitted = false;
  isSubmitting = false;
  submitSuccess = false;
  submitError = false;

  constructor(private formBuilder: FormBuilder) {}

  ngOnInit(): void {
    this.initializeForm();
  }

  initializeForm(): void {
    this.contactForm = this.formBuilder.group({
      name: ['', [Validators.required]],
      email: ['', [Validators.required, Validators.email]],
      phone: [''],
      subject: ['', [Validators.required]],
      message: ['', [Validators.required]],
      terms: [false, [Validators.requiredTrue]]
    });
  }

  onSubmit(): void {
    this.isSubmitted = true;
    this.submitSuccess = false;
    this.submitError = false;

    if (!this.contactForm.valid) {
      return;
    }

    this.isSubmitting = true;
    const formData = this.contactForm.value;

    // Simulate API call - in production, this would call an actual backend endpoint
    setTimeout(() => {
      console.log('Contact form submitted:', formData);
      this.isSubmitting = false;
      this.submitSuccess = true;
      this.contactForm.reset();
      this.isSubmitted = false;

      // Hide success message after 5 seconds
      setTimeout(() => {
        this.submitSuccess = false;
      }, 5000);
    }, 1500);
  }
}
