import { Component } from '@angular/core';
import { Router } from '@angular/router';
import { CommonModule } from '@angular/common';
import { TranslateModule } from '@ngx-translate/core';

@Component({
  selector: 'app-register-choice',
  standalone: true,
  imports: [CommonModule, TranslateModule],
  templateUrl: './register-choice.html',
  styleUrl: './register-choice.scss'
})
export class RegisterChoiceComponent {
  constructor(private router: Router) {}

  navigateTo(path: string): void {
    this.router.navigate([path]);
  }
}
