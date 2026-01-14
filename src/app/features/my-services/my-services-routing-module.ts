import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { MyServicesComponent } from './my-services';

const routes: Routes = [
  { path: '', component: MyServicesComponent }
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule]
})
export class MyServicesRoutingModule { }
