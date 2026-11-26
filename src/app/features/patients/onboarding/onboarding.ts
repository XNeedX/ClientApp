import { HttpErrorResponse } from '@angular/common/http';
import { DatePipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, OnInit, inject, signal } from '@angular/core';
import { AbstractControl, FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { KeycloakService } from 'keycloak-angular';
import { firstValueFrom } from 'rxjs';

import { ApiResponse } from '../../../core/models/api-response.model';
import { CreatePatientDto, ExistingProfileDto } from '../models/patient.model';
import { PatientService } from '../services/patient.service';

@Component({
  selector: 'app-onboarding',
  standalone: true,
  imports: [DatePipe, ReactiveFormsModule, RouterLink],
  templateUrl: './onboarding.html',
  styleUrl: './onboarding.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class OnboardingComponent implements OnInit {
  private readonly patientService = inject(PatientService);
  private readonly router = inject(Router);
  private readonly keycloak = inject(KeycloakService);

  protected readonly maxBirthDate = new Date().toISOString().slice(0, 10);
  protected readonly profileForm = inject(FormBuilder).nonNullable.group({
    firstName: ['', [Validators.required, Validators.pattern(/\S/)]],
    lastName: ['', [Validators.required, Validators.pattern(/\S/)]],
    middleName: [''],
    phoneNumber: ['', [Validators.required, Validators.pattern(/^[1-9]\d{1,14}$/)]],
    dateOfBirth: ['', [Validators.required, (control: AbstractControl<string>) =>
      control.value > this.maxBirthDate ? { futureDate: true } : null]],
  });

  protected readonly state = signal<'loading' | 'ready' | 'existing' | 'error'>('loading');
  protected readonly isSaving = signal(false);
  protected readonly matchedProfile = signal<ExistingProfileDto | null>(null);
  protected readonly saveError = signal<string | null>(null);
  protected readonly photoError = signal<string | null>(null);

  private identity: Pick<CreatePatientDto, 'accountId' | 'email' | 'isEmailVerified'> | null = null;
  private pendingProfile: CreatePatientDto | null = null;
  private selectedFile: File | null = null;
  private uploadedPhoto: { file: File; id: string } | null = null;

  ngOnInit(): void {
    void this.load();
  }

  protected async load(): Promise<void> {
    this.state.set('loading');
    try {
      const { id, email, emailVerified } = await this.keycloak.loadUserProfile();
      if (!id || !email) throw new Error('Patient account is unavailable.');
      this.identity = { accountId: id, email, isEmailVerified: emailVerified === true };
      const response = await firstValueFrom(this.patientService.getProfileByAccountId(id));
      this.ensureSuccess(response);
      this.state.set('existing');
    } catch (error: unknown) {
      this.state.set(error instanceof HttpErrorResponse && error.status === 404 && this.identity ? 'ready' : 'error');
    }
  }

  protected onFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0] ?? null;
    if (file && !file.type.startsWith('image/')) {
      this.selectedFile = null;
      input.value = '';
      this.photoError.set('Choose an image file.');
      return;
    }
    this.selectedFile = file;
    this.photoError.set(null);
  }

  protected isInvalidAndTouched(controlName: string): boolean {
    const control = this.profileForm.get(controlName);
    return Boolean(control?.invalid && (control.touched || control.dirty));
  }

  protected async onSubmit(): Promise<void> {
    if (this.profileForm.invalid || this.isSaving() || !this.identity || this.state() !== 'ready' || this.photoError()) {
      this.profileForm.markAllAsTouched();
      return;
    }

    const identity = this.identity;
    await this.save(async () => {
      const values = this.profileForm.getRawValue();
      const photoPath = await this.uploadSelectedPhoto();
      const request: CreatePatientDto = {
        ...identity,
        photoPath,
        firstName: values.firstName.trim(),
        lastName: values.lastName.trim(),
        middleName: values.middleName.trim() || null,
        phoneNumber: '+' + values.phoneNumber,
        dateOfBirth: values.dateOfBirth + 'T00:00:00Z',
      };

      const response = await firstValueFrom(this.patientService.confirmProfile(request));
      this.ensureSuccess(response);
      if (response.data?.isMatchFound) {
        if (!response.data.existingProfile) throw new Error('Could not read the matching profile.');
        this.pendingProfile = request;
        this.matchedProfile.set(response.data.existingProfile);
        return;
      }
      await this.showProfile();
    });
  }

  protected async confirmMatch(): Promise<void> {
    const profile = this.matchedProfile();
    const identity = this.identity;
    if (!profile || !identity || this.isSaving()) return;

    await this.save(async () => {
      this.ensureSuccess(await firstValueFrom(this.patientService.linkProfile(profile.id, identity.accountId)));
      await this.showProfile();
    });
  }

  protected async rejectMatch(): Promise<void> {
    const profile = this.pendingProfile;
    if (!profile || this.isSaving()) return;

    await this.save(async () => {
      this.ensureSuccess(await firstValueFrom(this.patientService.forceCreateProfile(profile)));
      await this.showProfile();
    });
  }

  private async uploadSelectedPhoto(): Promise<string | null> {
    if (!this.selectedFile) return null;
    if (this.uploadedPhoto?.file === this.selectedFile) return this.uploadedPhoto.id;

    const file = this.selectedFile;
    const response = await firstValueFrom(this.patientService.uploadPhoto(file));
    this.ensureSuccess(response);
    if (!response.data) throw new Error('Could not upload the photo.');
    this.uploadedPhoto = { file, id: response.data };
    return response.data;
  }

  private async showProfile(): Promise<void> {
    this.matchedProfile.set(null);
    this.state.set('existing');
    await this.router.navigate(['/profile']);
  }

  private async save(action: () => Promise<void>): Promise<void> {
    this.isSaving.set(true);
    this.saveError.set(null);
    try {
      await action();
    } catch (error: unknown) {
      const message: unknown = error instanceof HttpErrorResponse
        ? error.error?.errors?.[0] ?? error.error?.message
        : error instanceof Error ? error.message : null;
      this.saveError.set(typeof message === 'string' && message.trim() ? message : 'Could not save the profile.');
    } finally {
      this.isSaving.set(false);
    }
  }

  private ensureSuccess(response: ApiResponse<unknown>): void {
    if (!response.isSuccess) throw new Error(response.errors?.[0] || response.message || 'Could not save the profile.');
  }
}
