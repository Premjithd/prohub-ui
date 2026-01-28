import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { PostJobComponent } from './post-job';
import { AuthGuard } from '../../core/guards/auth.guard';

const routes: Routes = [
  { path: '', component: PostJobComponent, canActivate: [AuthGuard] }
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule]
})
export class PostJobRoutingModule { }
