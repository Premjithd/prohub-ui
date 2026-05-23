import { Routes } from '@angular/router';
import { MainLayout } from './layout/main-layout/main-layout';
import { AuthGuard } from './core/guards/auth.guard';
import { AdminGuard } from './core/guards/admin.guard';
import { ProGuard } from './core/guards/pro.guard';

export const routes: Routes = [
  {
    path: 'accept-admin-invite',
    loadComponent: () => import('./features/accept-admin-invite/accept-admin-invite')
      .then(m => m.AcceptAdminInviteComponent)
  },
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
        path: 'my-pros',
        loadComponent: () => import('./features/my-pros/my-pros')
          .then(m => m.MyProsComponent),
        canActivate: [AuthGuard]
      },
      {
        path: 'pending-jobs/:jobId',
        loadComponent: () => import('./features/pending-jobs/pending-job-details.js')
          .then(m => m.PendingJobDetailsComponent)
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
        path: 'edit-service/:id',
        loadChildren: () => import('./features/edit-service/edit-service-module')
          .then(m => m.EditServiceModule)
      },
      {
        path: 'edit-job/:id',
        loadChildren: () => import('./features/edit-job/edit-job-module')
          .then(m => m.EditJobModule)
      },
      {
        path: 'available-jobs',
        loadComponent: () => import('./features/available-jobs/available-jobs')
          .then(m => m.AvailableJobsComponent)
      },
      {
        path: 'my-jobs-pro',
        loadComponent: () => import('./features/my-jobs-pro/my-jobs-pro')
          .then(m => m.MyJobsProComponent)
      },
      {
        path: 'my-clients',
        loadComponent: () => import('./features/my-clients/my-clients')
          .then(m => m.MyClientsComponent),
        canActivate: [ProGuard]
      },
      {
        path: 'my-jobs-pro/:jobId',
        loadComponent: () => import('./features/my-jobs-pro/my-job-pro-details')
          .then(m => m.MyJobProDetailsComponent)
      },
      {
        path: 'job-details',
        loadComponent: () => import('./features/job-details/job-details')
          .then(m => m.JobDetailsComponent)
      },
      {
        path: 'admin-users',
        loadComponent: () => import('./features/admin-users/admin-users')
          .then(m => m.AdminUsersComponent),
        canActivate: [AdminGuard]
      },
      {
        path: 'admin-materials',
        loadComponent: () => import('./features/admin-materials/admin-materials')
          .then(m => m.AdminMaterialsComponent),
        canActivate: [AdminGuard]
      },
      {
        path: 'messages',
        loadComponent: () => import('./features/messages/messages')
          .then(m => m.MessagesComponent),
        canActivate: [AuthGuard]
      },
      {
        path: 'notifications',
        loadComponent: () => import('./features/notifications/notifications')
          .then(m => m.NotificationsComponent),
        canActivate: [AuthGuard]
      },
      {
        path: 'find-a-pro',
        loadComponent: () => import('./features/find-a-pro/find-a-pro')
          .then(m => m.FindAProComponent)
      },
      {
        path: 'jobs',
        redirectTo: 'pending-jobs',
        pathMatch: 'full'
      }
    ]
  }
];
