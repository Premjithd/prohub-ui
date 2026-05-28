import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { ServicesComponent } from './services/services';

const routes: Routes = [
  { path: '', component: ServicesComponent },
  {
    path: ':id',
    loadComponent: () => import('./service-detail/service-detail').then(m => m.ServiceDetailComponent)
  }
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule]
})
export class ServicesRoutingModule { }
