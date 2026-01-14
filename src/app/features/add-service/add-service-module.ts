import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormsModule } from '@angular/forms';
import { AddServiceComponent } from './add-service';
import { AddServiceRoutingModule } from './add-service-routing-module';

@NgModule({
  imports: [
    CommonModule,
    ReactiveFormsModule,
    FormsModule,
    AddServiceRoutingModule,
    AddServiceComponent
  ]
})
export class AddServiceModule { }
