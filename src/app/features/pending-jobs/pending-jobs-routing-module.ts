import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { PendingJobsComponent } from './pending-jobs';

const routes: Routes = [
  { path: '', component: PendingJobsComponent }
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule]
})
export class PendingJobsRoutingModule { }
