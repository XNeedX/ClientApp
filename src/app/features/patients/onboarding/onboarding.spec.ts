import { HttpErrorResponse } from '@angular/common/http';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { KeycloakService } from 'keycloak-angular';
import { of, throwError } from 'rxjs';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { CreatePatientDto } from '../models/patient.model';
import { PatientService } from '../services/patient.service';
import { OnboardingComponent } from './onboarding';

describe('OnboardingComponent', () => {
  let fixture: ComponentFixture<OnboardingComponent>;
  const existingProfile = {
    id: 'existing-id',
    firstName: 'Demo',
    lastName: 'Patient',
    middleName: null,
    dateOfBirth: '1988-02-02T00:00:00Z',
  };
  const confirmProfile = vi.fn();
  const linkProfile = vi.fn();
  const forceCreateProfile = vi.fn();

  beforeEach(async () => {
    confirmProfile.mockReturnValue(of({
      isSuccess: true,
      data: { isMatchFound: true, existingProfile },
    }));
    linkProfile.mockReturnValue(of({ isSuccess: true }));
    forceCreateProfile.mockReturnValue(of({ isSuccess: true }));
    linkProfile.mockClear();
    forceCreateProfile.mockClear();
    confirmProfile.mockClear();

    await TestBed.configureTestingModule({
      imports: [OnboardingComponent],
      providers: [
        provideRouter([]),
        { provide: KeycloakService, useValue: {
          loadUserProfile: () => Promise.resolve({
            id: 'patient-account', email: 'patient@example.test', emailVerified: true,
          }),
        } },
        { provide: PatientService, useValue: {
          getProfileByAccountId: () => throwError(() => new HttpErrorResponse({ status: 404 })),
          confirmProfile,
          linkProfile,
          forceCreateProfile,
        } },
      ],
    }).compileComponents();

    vi.spyOn(TestBed.inject(Router), 'navigate').mockResolvedValue(true);
    fixture = TestBed.createComponent(OnboardingComponent);
    fixture.detectChanges();
    await vi.waitFor(() => {
      fixture.detectChanges();
      expect((fixture.nativeElement as HTMLElement).querySelector('#patient-firstName')).not.toBeNull();
    });
  });

  async function submitProfile(): Promise<void> {
    const values = { firstName: 'Demo', lastName: 'Patient', phoneNumber: '12025550101', dateOfBirth: '1988-02-02' };
    const page = fixture.nativeElement as HTMLElement;
    for (const [field, value] of Object.entries(values)) {
      const input = page.querySelector<HTMLInputElement>('#patient-' + field);
      if (!input) throw new Error('Profile field unavailable: ' + field);
      input.value = value;
      input.dispatchEvent(new Event('input', { bubbles: true }));
    }
    fixture.detectChanges();
    const confirm = page.querySelector<HTMLButtonElement>('[type="submit"]');
    confirm?.click();
    await fixture.whenStable();
    fixture.detectChanges();
  }

  async function answer(label: string): Promise<void> {
    const page = fixture.nativeElement as HTMLElement;
    const button = Array.from(page.querySelectorAll<HTMLButtonElement>('[role="dialog"] button'))
      .find((element) => element.textContent?.trim().startsWith(label));
    if (!button) throw new Error('Matching profile action unavailable: ' + label);
    button.click();
    await fixture.whenStable();
  }

  it('reads the matching profile returned by the API and links it on Yes', async () => {
    await submitProfile();
    await answer('Yes');

    expect(linkProfile).toHaveBeenCalledExactlyOnceWith('existing-id', 'patient-account');
    expect(forceCreateProfile).not.toHaveBeenCalled();
  });

  it('creates a separate profile on No using the original request', async () => {
    await submitProfile();
    await answer('No');

    const request = confirmProfile.mock.calls[0][0] as CreatePatientDto;
    expect(request).toMatchObject({
      photoPath: null,
      accountId: 'patient-account',
      isEmailVerified: true,
      phoneNumber: '+12025550101',
    });
    expect(forceCreateProfile).toHaveBeenCalledExactlyOnceWith(request);
    expect(linkProfile).not.toHaveBeenCalled();
  });
});
