# ProHubUI - Professional Services Marketplace Frontend

## Overview
ProHubUI is the frontend application for a professional services marketplace, built with Angular 19. It provides a modern, responsive interface for connecting service professionals with users.

## Features
- User and Professional registration/authentication
- Email and phone verification
- Service browsing and management
- Profile management
- Responsive design with Material UI
- Lazy-loaded modules for optimal performance

## Technology Stack
- Angular 19 (v20.2.2)
- Angular Material
- TypeScript
- SCSS
- RxJS

## Prerequisites
- Node.js (v20 or higher)
- npm (v11 or higher)
- Angular CLI (v20.2.2)

## Installation

1. Install dependencies:
```bash
npm install
```

2. Start the development server:
```bash
ng serve
```

3. Open your browser and navigate to `http://localhost:4200`

## Project Structure
```
src/
├── app/
│   ├── auth/                  # Authentication features
│   │   ├── login/
│   │   ├── register/
│   │   └── verify/
│   ├── core/                  # Core functionality
│   │   ├── models/
│   │   └── services/
│   ├── features/             # Main application features
│   │   ├── about/
│   │   ├── contact/
│   │   ├── home/
│   │   ├── profile/
│   │   └── services/
│   ├── layout/              # Layout components
│   │   ├── footer/
│   │   ├── main-layout/
│   │   ├── navbar/
│   │   └── sidebar/
│   └── shared/              # Shared components and utilities
│       └── components/
├── assets/
├── environments/
└── styles/
```

## Available Scripts
- `ng serve`: Start development server
- `ng build`: Build the application
- `ng test`: Run unit tests with Karma
- `ng generate`: Generate Angular artifacts

## API Integration
The application connects to the ProHubAPI backend. Configure the API URL in:
- Development: `src/environments/environment.ts`
- Production: `src/environments/environment.prod.ts`

## Features Documentation

### Authentication
- Login with email/password
- Separate registration flows for users and professionals
- Email and phone number verification
- JWT token-based authentication
- Protected routes with auth guards

### Layout
- Responsive navbar with dynamic menu items
- Collapsible sidebar for mobile devices
- Sticky footer
- Material Design components and theming

### Core Services
- ApiService: Base HTTP service for API communication
- AuthService: Handles authentication and token management
- VerificationService: Manages email/phone verification
- UserService: User profile management
- ProService: Professional profile management

### Shared Components
- Button: Customized Material button component
- Modal: Reusable dialog component
- Loader: Loading spinner component

## Development Guidelines

### Code Style
- Follow Angular style guide
- Use TypeScript strict mode
- Implement proper error handling
- Write comprehensive documentation
- Use meaningful variable and function names

### Component Structure
- Separate template, styles, and logic
- Use standalone components where possible
- Implement proper change detection
- Follow single responsibility principle

### State Management
- Services for state management
- RxJS for reactive programming
- Local storage for persistent data

### Error Handling
- Implement proper error handling in services
- Display user-friendly error messages
- Log errors appropriately

## Building for Production

```bash
ng build --configuration production
```

This will create production-ready files in the `dist/prohub-ui` directory.

## Environment Configuration

Configure the following environment variables in `src/environments/environment.ts`:

```typescript
export const environment = {
  production: false,
  apiUrl: 'http://localhost:5001/api'
};
```

For production, update `environment.prod.ts`:

```typescript
export const environment = {
  production: true,
  apiUrl: 'https://api.prohub.com/api'
};
```

## Future Enhancements
- Real-time chat between users and professionals
- Advanced search and filtering
- Rating and review system
- Payment integration
- Service scheduling

## Additional Resources
- [Angular Documentation](https://angular.dev)
- [Angular Material](https://material.angular.io)
- [RxJS Documentation](https://rxjs.dev)

## Support
For support, please create an issue in the repository.
