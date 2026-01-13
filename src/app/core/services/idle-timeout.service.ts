import { Injectable, NgZone, PLATFORM_ID, Inject } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { Router } from '@angular/router';
import { Auth } from './auth';

@Injectable({
  providedIn: 'root'
})
export class IdleTimeoutService {
  private idleTimer: any;
  private readonly IDLE_TIME_LIMIT = 30 * 60 * 1000; // 30 minutes in milliseconds
  private isInitialized = false;

  constructor(
    private auth: Auth,
    private router: Router,
    private ngZone: NgZone,
    @Inject(PLATFORM_ID) private platformId: Object
  ) {}

  startIdleTimer(): void {
    // Skip in server-side rendering
    if (!isPlatformBrowser(this.platformId)) {
      return;
    }

    if (this.isInitialized) {
      return;
    }

    this.isInitialized = true;

    // Run outside Angular zone to avoid triggering change detection on every activity
    this.ngZone.runOutsideAngular(() => {
      // Listen to user activity events
      document.addEventListener('mousemove', () => this.resetIdleTimer());
      document.addEventListener('keypress', () => this.resetIdleTimer());
      document.addEventListener('click', () => this.resetIdleTimer());
      document.addEventListener('scroll', () => this.resetIdleTimer());
      document.addEventListener('touchstart', () => this.resetIdleTimer());
    });

    // Start the initial timer
    this.resetIdleTimer();
  }

  resetIdleTimer(): void {
    // Clear the existing timer
    if (this.idleTimer) {
      clearTimeout(this.idleTimer);
    }

    // Only reset timer if user is authenticated
    if (this.auth.isAuthenticated()) {
      // Set a new timer
      this.idleTimer = setTimeout(() => {
        this.ngZone.run(() => {
          this.logout();
        });
      }, this.IDLE_TIME_LIMIT);
    }
  }

  private logout(): void {
    console.log('User idle for 30 minutes, logging out...');
    this.auth.logout();
    this.router.navigate(['/auth/login']);
    // alert('Your session has expired due to inactivity. Please log in again.');
  }

  stopIdleTimer(): void {
    if (this.idleTimer) {
      clearTimeout(this.idleTimer);
    }
    this.isInitialized = false;
  }
}
