# prohub-ui

Angular 20 frontend for the yProHub professional services marketplace.

## Technology Stack

- Angular 20.2.x (standalone components)
- Angular Material Design
- TypeScript 5.9 (strict mode)
- SCSS with CSS custom properties
- JWT + Azure MSAL authentication
- Karma/Jasmine unit tests

## Setup

```bash
npm install
npm start           # Dev server at http://localhost:4200
npm run build       # Production build
npm test            # Run unit tests
```

API URL is configured in `src/environments/environment.ts` (default: `http://localhost:5001/api`).

## Project Structure

```
src/app/
├── auth/           # Login, registration (user + two-step pro), verification flows
├── core/           # Singleton services, guards, interceptors, shared models
├── features/       # Lazy-loaded feature modules:
│   ├── home/       # Landing page
│   ├── profile/    # User and pro profile pages (role section, address autofill)
│   ├── post-job/   # Job posting flow
│   ├── messages/   # Messaging between users and pros
│   ├── payments/   # Razorpay/UPI payment pages
│   ├── services/   # Service category browse (hero redesign)
│   ├── notifications/ # User notification list
│   └── admin/      # Admin dashboard (categories, service areas, users, payments/disputes)
├── layout/         # Main layout, navbar, footer, bottom nav (mobile), sidebar
└── services/       # Job, material, payment services
```

## Features

- **Auth**: JWT + Azure MSAL; token stored in localStorage; HTTP interceptor attaches token to all requests; logout calls `POST /api/auth/logout` to revoke token server-side
- **Two-step pro registration**: account creation step then profile completion step
- **Profile**: redesigned role section; address autofill via Nominatim proxy
- **Find a Pro**: filtered by service area (Country → State → District → PIN) and category
- **Job flow**: post job → pro bids → user accepts → in-progress → completion sign-off
- **Payments**: Razorpay integration with UPI pre-fill
- **Notifications**: bell icon in navbar; notification list page
- **Admin dashboard**: category CRUD, service area management, user management, payments tab with refund and dispute resolution, settings toggle
- **Mobile layout**: bottom navigation bar (role-aware, mobile-only); `--bottom-nav-height` CSS variable (60px mobile / 0px desktop)

## Design Conventions

- CSS custom properties: `var(--color-primary)`, `var(--text-h1)`, etc. — defined in `src/styles.scss`
- Snackbar panels: `.snack-info`, `.snack-success`, `.snack-error` — pass via `panelClass`
- Component style budget: `anyComponentStyle.maximumError` set to 30kB in `angular.json`
- Routing: all authenticated routes wrapped in `MainLayout`; `accept-admin-invite` is public
