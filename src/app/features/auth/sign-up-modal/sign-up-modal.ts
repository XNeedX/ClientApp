import { Component, EventEmitter, Output, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators, AbstractControl, ValidationErrors } from '@angular/forms';
import { HttpClient } from '@angular/common/http'; // Или ваш PatientService
import { environment } from '../../../../environments/environment';
import { ApiResponse } from '../../../core/models/api-response.model';

@Component({
  selector: 'app-sign-up-modal',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './sign-up-modal.html',
  styleUrls: ['./sign-up-modal.css']
})
export class SignUpModalComponent {
  @Output() close = new EventEmitter<void>();
  @Output() switchToSignIn = new EventEmitter<void>();

  signUpForm: FormGroup;
  passwordVisible = false;
  confirmPasswordVisible = false;
  isSubmitting = false;
  serverError: string | null = null; 

  private fb = inject(FormBuilder);
  private http = inject(HttpClient); 

  constructor() {
    this.signUpForm = this.fb.group({
      email: ['', [Validators.required, Validators.email]],
      password: ['', [Validators.required, Validators.minLength(6), Validators.maxLength(15)]],
      confirmPassword: ['', [Validators.required]]
    }, { validators: this.passwordMatchValidator });
  }

  get f() { return this.signUpForm.controls; }

  passwordMatchValidator(group: AbstractControl): ValidationErrors | null {
    const password = group.get('password')?.value;
    const confirmPassword = group.get('confirmPassword')?.value;
    if (password && confirmPassword && password !== confirmPassword) {
      group.get('confirmPassword')?.setErrors({ passwordMismatch: true });
      return { passwordMismatch: true };
    }
    return null;
  }

  toggleVisibility(field: 'password' | 'confirm') {
    if (field === 'password') this.passwordVisible = !this.passwordVisible;
    if (field === 'confirm') this.confirmPasswordVisible = !this.confirmPasswordVisible;
  }

  onClose() {
    this.close.emit();
  }

  onSignInClick() {
    this.switchToSignIn.emit();
  }

  onSubmit() {
    if (this.signUpForm.invalid) return;

    this.isSubmitting = true;
    this.serverError = null;

    const signupData = {
      email: this.signUpForm.value.email,
      password: this.signUpForm.value.password
    };

    this.http.post<ApiResponse>(`${environment.gatewayUrl}/auth/signup`, signupData)
      .subscribe({
        next: (response) => {
          this.isSubmitting = false;
          
          if (response.isSuccess) {
            alert('Please check your email to confirm signing up.');
            this.onClose();
          } else {
            this.handleServerErrors(response.errors);
          }
        },
        error: (err) => {
          this.isSubmitting = false;
          
          if (err.error && err.error.errors) {
            this.handleServerErrors(err.error.errors);
          } else {
            this.serverError = 'An unexpected error occurred. Please try again later.';
          }
        }
      });
  }

  private handleServerErrors(errors: string[]) {
    const emailExistsError = errors.find(e => e.toLowerCase().includes('email') || e.toLowerCase().includes('exists'));

    if (emailExistsError) {
      this.serverError = 'Someone already uses this email';
      this.f['email'].setErrors({ notUnique: true }); 
    } else {
      this.serverError = errors.join(', ');
    }
  }
}