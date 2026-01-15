import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { EditJobComponent } from './edit-job';

const routes: Routes = [
  { path: '', component: EditJobComponent }
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule]
})
export class EditJobRoutingModule { }
