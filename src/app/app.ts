import { Component, OnInit, signal, Inject, PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { RouterOutlet, Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { IdleTimeoutService } from './core/services/idle-timeout.service';
import { LanguageService } from './core/services/language.service';
import { MaintenanceService } from './core/services/maintenance.service';
import { Auth } from './core/services/auth';
// import { HttpClientModule } from '@angular/common/http';

// import { HttpClientModule, HTTP_INTERCEPTORS } from '@angular/common/http';
// import { provideHttpClient, withInterceptorsFromDi } from '@angular/common/http';
// import { AuthInterceptor } from '../app/core/services/auth.interceptor';


@Component({
  selector: 'app-root',
  imports: [RouterOutlet, FormsModule],
  templateUrl: './app.html',
  styleUrl: './app.scss'
})
export class App implements OnInit {
  protected readonly title = signal('prohub-ui');

  constructor(
    private idleTimeoutService: IdleTimeoutService,
    private languageService: LanguageService,
    private maintenance: MaintenanceService,
    private auth: Auth,
    private router: Router,
    @Inject(PLATFORM_ID) private platformId: object
  ) {}

  ngOnInit(): void {
    this.idleTimeoutService.startIdleTimer();
    this.languageService.init();
    this.checkMaintenance();
  }

  /** On load, send non-admins to the maintenance page if the API is in maintenance. */
  private checkMaintenance(): void {
    if (!isPlatformBrowser(this.platformId)) return;
    if (this.auth.getUserType() === 'Admin') return; // admins bypass

    this.maintenance.getStatus().subscribe({
      next: (status) => {
        if (status.enabled && !this.router.url.startsWith('/maintenance')) {
          this.router.navigate(['/maintenance']);
        }
      },
      error: () => {}
    });
  }
}
