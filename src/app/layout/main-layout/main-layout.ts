import { Component, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatSidenav } from '@angular/material/sidenav';
import { RouterModule, Router } from '@angular/router';
import { MatSidenavModule } from '@angular/material/sidenav';
import { MatIconModule } from '@angular/material/icon';
import { NavbarComponent } from '../navbar/navbar';
import { SidebarComponent } from '../sidebar/sidebar';
import { FooterComponent } from '../footer/footer';
import { BottomNavComponent } from '../bottom-nav/bottom-nav';
import { Auth } from '../../core/services/auth';

@Component({
  selector: 'app-main-layout',
  standalone: true,
  imports: [
    CommonModule,
    RouterModule,
    MatSidenavModule,
    MatIconModule,
    NavbarComponent,
    SidebarComponent,
    FooterComponent,
    BottomNavComponent
  ],
  templateUrl: './main-layout.html',
  styleUrl: './main-layout.scss'
})
export class MainLayout {
  @ViewChild('sidenav') sidenav!: MatSidenav;

  constructor(public auth: Auth, private router: Router) {}

  exitImpersonation(): void {
    this.auth.exitImpersonation();
    this.router.navigate(['/admin-users']);
  }
}
