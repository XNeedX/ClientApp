import { Component, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { PatientService } from '../services/patient.service';
import { Router } from '@angular/router';
import { HttpErrorResponse } from '@angular/common/http';
import { KeycloakService } from 'keycloak-angular';

@Component({
  selector: 'app-onboarding',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './onboarding.html',
  styleUrls: ['./onboarding.css']
})
export class OnboardingComponent implements OnInit {
  private fb = inject(FormBuilder);
  private patientService = inject(PatientService);
  private router = inject(Router);
  private keycloak = inject(KeycloakService);

  profileForm!: FormGroup;
  selectedFile: File | null = null;
  
  showMatchModal = false;
  matchedProfile: any = null;
  
  private pendingProfileData: any = null;
  private accountId: string = '';
  private email: string = '';

  async ngOnInit() {
    this.initForm();
    
    const isLoggedIn = await this.keycloak.isLoggedIn();
    if (isLoggedIn) {
      const userProfile = await this.keycloak.loadUserProfile();
      this.accountId = userProfile.id || '';
      this.email = userProfile.email || '';
    }
  }

  initForm() {
    this.profileForm = this.fb.group({
      photo: [null],
      firstName: ['', Validators.required],
      lastName: ['', Validators.required],
      middleName: [''],
      phoneNumber: ['', [Validators.required, Validators.pattern('^[0-9]+$')]],
      dateOfBirth: ['', Validators.required]
    });
  }

  onFileSelected(event: any) {
    const file = event.target.files[0];
    if (file) {
      this.selectedFile = file;
    }
  }

  isInvalidAndTouched(controlName: string): boolean {
    const control = this.profileForm.get(controlName);
    return !!(control?.invalid && (control?.touched || control?.dirty));
  }

onSubmit() {
    if (this.profileForm.invalid) {
      this.profileForm.markAllAsTouched();
      return;
    }

    if (this.selectedFile) {
      this.patientService.uploadPhoto(this.selectedFile).subscribe({
        next: (response) => {
          const fileIdGuid = response.data || ''; 
          this.submitProfileData(fileIdGuid);
        },
        error: () => {
          alert('Error uploading photo. Please try again.');
        }
      });
    } else {
      this.submitProfileData(''); 
    }
  }

  private submitProfileData(fileIdGuid: string) {
    this.pendingProfileData = {
      ...this.profileForm.value,
      accountId: this.accountId,
      email: this.email,
      phoneNumber: '+' + this.profileForm.value.phoneNumber,
      dateOfBirth: new Date(this.profileForm.value.dateOfBirth).toISOString(),
      photo: fileIdGuid 
    };


    this.patientService.confirmProfile(this.pendingProfileData).subscribe({
      next: (response: any) => {
        if (response.data && response.data.isMatchFound && response.data.profile) {
          this.matchedProfile = response.data.profile;
          this.showMatchModal = true;
        } else {
          alert('Profile successfully created!');
          this.router.navigate(['/']);
        }
      },
      error: (err: HttpErrorResponse) => {
        if (err.status === 409 && err.error?.data?.profile) {
          this.matchedProfile = err.error.data.profile;
          this.showMatchModal = true;
        } else {
          alert('An error occurred during profile creation.');
        }
      }
    });
  }

  confirmMatch() {
    if (!this.matchedProfile?.id || !this.accountId) return;

    this.patientService.linkProfile(this.matchedProfile.id, this.accountId).subscribe({
      next: () => {
        this.showMatchModal = false;
        alert('Profile successfully linked!');
        this.router.navigate(['/']);
      },
      error: (err: HttpErrorResponse) => alert('Error linking profile.')
    });
  }

  rejectMatch() {
    this.patientService.forceCreateProfile(this.pendingProfileData).subscribe({
      next: () => {
        this.showMatchModal = false;
        alert('New profile successfully created!');
        this.router.navigate(['/']);
      },
      error: (err: HttpErrorResponse) => alert('Error creating new profile.')
    });
  }
}