import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { RouterModule, Router } from '@angular/router';

interface ServiceCategory {
  id: string;
  name: string;
  icon: string;
}

@Component({
  selector: 'app-post-job',
  standalone: true,
  imports: [CommonModule, FormsModule, ReactiveFormsModule, RouterModule],
  templateUrl: './post-job.html',
  styleUrls: ['./post-job.scss']
})
export class PostJobComponent implements OnInit {
  jobForm!: FormGroup;
  submitted = false;
  successMessage = '';
  errorMessage = '';
  currentStep = 1;

  serviceCategories: ServiceCategory[] = [
    { id: 'plumbing', name: 'Plumbing', icon: '🔧' },
    { id: 'electrical', name: 'Electrical', icon: '⚡' },
    { id: 'cleaning', name: 'Cleaning', icon: '🧹' },
    { id: 'painting', name: 'Painting', icon: '🎨' },
    { id: 'carpentry', name: 'Carpentry', icon: '🪵' },
    { id: 'hvac', name: 'HVAC', icon: '❄️' },
    { id: 'landscaping', name: 'Landscaping', icon: '🌱' },
    { id: 'tutoring', name: 'Tutoring', icon: '📚' },
    { id: 'it-support', name: 'IT Support', icon: '💻' },
    { id: 'writing', name: 'Writing', icon: '✍️' },
    { id: 'graphic-design', name: 'Graphic Design', icon: '🎭' },
    { id: 'photography', name: 'Photography', icon: '📷' }
  ];

  budgetRanges = [
    { value: 'under-100', label: 'Under $100', icon: '$' },
    { value: '100-250', label: '$100 - $250', icon: '$$' },
    { value: '250-500', label: '$250 - $500', icon: '$$$' },
    { value: '500-1000', label: '$500 - $1,000', icon: '$$$$' },
    { value: 'over-1000', label: 'Over $1,000', icon: '$$$$$' }
  ];

  timelineOptions = [
    { value: 'asap', label: 'ASAP (within 24 hours)', icon: '⚡', description: 'Urgent' },
    { value: '1-week', label: 'Within 1 week', icon: '📅', description: 'Soon' },
    { value: '1-month', label: 'Within 1 month', icon: '📆', description: 'Flexible' },
    { value: 'flexible', label: 'No specific deadline', icon: '🔄', description: 'Very flexible' }
  ];

  locationTypes = [
    { value: 'local', label: 'Local (In-person)', description: 'Work will be done at my location' },
    { value: 'remote', label: 'Remote', description: 'Work can be done remotely' },
    { value: 'both', label: 'Both (Local & Remote)', description: 'Either location works' }
  ];

  constructor(private fb: FormBuilder, private router: Router) {}

  ngOnInit(): void {
    this.initializeForm();
  }

  initializeForm(): void {
    this.jobForm = this.fb.group({
      // Step 1
      title: ['', [Validators.required, Validators.minLength(10)]],
      category: ['', Validators.required],
      description: ['', [Validators.required, Validators.minLength(50)]],

      // Step 2
      location: ['', Validators.required],
      budget: ['', Validators.required],
      timeline: ['', Validators.required],

      // Step 3
      attachments: [''],
      agreeToTerms: [false, Validators.required]
    });
  }

  get f() {
    return this.jobForm.controls;
  }

  isStepValid(step: number): boolean {
    if (step === 1) {
      return this.f['title'].valid && this.f['category'].valid && this.f['description'].valid;
    } else if (step === 2) {
      return this.f['location'].valid && this.f['budget'].valid && this.f['timeline'].valid;
    } else if (step === 3) {
      return this.f['agreeToTerms'].valid;
    }
    return false;
  }

  nextStep(): void {
    if (this.isStepValid(this.currentStep)) {
      this.currentStep++;
    }
  }

  previousStep(): void {
    if (this.currentStep > 1) {
      this.currentStep--;
    }
  }

  selectCategory(categoryId: string): void {
    this.jobForm.patchValue({ category: categoryId });
  }

  selectBudget(budgetValue: string): void {
    this.jobForm.patchValue({ budget: budgetValue });
  }

  selectTimeline(timelineValue: string): void {
    this.jobForm.patchValue({ timeline: timelineValue });
  }

  onSubmit(): void {
    this.submitted = true;
    this.errorMessage = '';
    this.successMessage = '';

    if (this.jobForm.invalid) {
      this.errorMessage = 'Please fill in all required fields correctly.';
      return;
    }

    // Simulate API call
    console.log('Job Posted:', this.jobForm.value);
    
    this.successMessage = 'Your job has been posted successfully! Professionals will start bidding on your job.';
    
    // Reset form after 2 seconds and redirect
    setTimeout(() => {
      this.jobForm.reset();
      this.submitted = false;
      this.currentStep = 1;
      this.router.navigate(['/jobs']);
    }, 2000);
  }

  dismissMessage(type: 'success' | 'error'): void {
    if (type === 'success') {
      this.successMessage = '';
    } else {
      this.errorMessage = '';
    }
  }

  getCategoryName(categoryId: string): string {
    const category = this.serviceCategories.find(c => c.id === categoryId);
    return category ? category.name : '';
  }

  getBudgetLabel(budgetValue: string): string {
    const budget = this.budgetRanges.find(b => b.value === budgetValue);
    return budget ? budget.label : '';
  }

  getTimelineLabel(timelineValue: string): string {
    const timeline = this.timelineOptions.find(t => t.value === timelineValue);
    return timeline ? timeline.label : '';
  }
}
