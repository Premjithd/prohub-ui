import { Component } from '@angular/core';
import { Router } from '@angular/router';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-home',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './home.html',
  styleUrl: './home.scss'
})
export class HomeComponent {
  constructor(private router: Router) {}

  navigateTo(path: string) {
    // Use Angular router to navigate within the SPA
    this.router.navigate([path]);
  }
}
