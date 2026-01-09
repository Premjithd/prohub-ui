import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { LoginComponent } from './login/login';
import { RegisterUserComponent } from './register/register';
import { RegisterProComponent } from './register-pro/register-pro';
import { RegisterChoiceComponent } from './register-choice/register-choice';
import { VerifyComponent } from './verify/verify';

const routes: Routes = [
  { path: 'login', component: LoginComponent },
  { path: 'register', component: RegisterChoiceComponent },
  { path: 'register/user', component: RegisterUserComponent },
  { path: 'register/pro', component: RegisterProComponent },
  { path: 'verify', component: VerifyComponent }
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule]
})
export class AuthRoutingModule { }
