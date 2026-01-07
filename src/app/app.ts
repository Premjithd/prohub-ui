import { Component, signal } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { FormsModule } from '@angular/forms';
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
export class App {
  protected readonly title = signal('prohub-ui');
}
