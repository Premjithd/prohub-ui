import { Routes } from '@angular/router';
import { MainLayout } from './layout/main-layout/main-layout';

export const routes: Routes = [
  {
    path: '',
    component: MainLayout,
    children: [
      {
        path: '',
        loadChildren: () => import('./features/home/home-module')
          .then(m => m.HomeModule)
      },
      {
        path: 'auth',
        loadChildren: () => import('./auth/auth-module')
          .then(m => m.AuthModule)
      },
      {
        path: 'about',
        loadChildren: () => import('./features/about/about-module')
          .then(m => m.AboutModule)
      },
      {
        path: 'services',
        loadChildren: () => import('./features/services/services-module')
          .then(m => m.ServicesModule)
      },
      {
        path: 'contact',
        loadChildren: () => import('./features/contact/contact-module')
          .then(m => m.ContactModule)
      },
      {
        path: 'profile',
        loadChildren: () => import('./features/profile/profile-module')
          .then(m => m.ProfileModule)
      },
      {
        path: 'faq',
        loadChildren: () => import('./features/faq/faq-module')
          .then(m => m.FAQModule)
      },
      {
        path: 'post-job',
        loadChildren: () => import('./features/post-job/post-job-module')
          .then(m => m.PostJobModule)
      },
      {
        path: 'pending-jobs',
        loadChildren: () => import('./features/pending-jobs/pending-jobs-module')
          .then(m => m.PendingJobsModule)
      },
      {
        path: 'my-services',
        loadChildren: () => import('./features/my-services/my-services-module')
          .then(m => m.MyServicesModule)
      },
      {
        path: 'add-service',
        loadChildren: () => import('./features/add-service/add-service-module')
          .then(m => m.AddServiceModule)
      },
      {
        path: 'jobs',
        redirectTo: 'pending-jobs',
        pathMatch: 'full'
      }
    ]
  }
];
