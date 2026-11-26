import { HttpErrorResponse } from '@angular/common/http';
import { DatePipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, DestroyRef, OnInit, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { KeycloakService } from 'keycloak-angular';
import { firstValueFrom } from 'rxjs';

import { documentImageUrl } from '../../../core/models/document-image';
import { AppointmentHistoryItem, AppointmentResult } from '../../appointments/models/appointment.model';
import { AppointmentService } from '../../appointments/services/appointment.service';
import { PatientProfileDto } from '../models/patient.model';
import { PatientService } from '../services/patient.service';

type LoadingStatus = 'loading' | 'ready' | 'missing' | 'error';

@Component({
  selector: 'app-profile',
  standalone: true,
  imports: [DatePipe, RouterLink],
  templateUrl: './profile.component.html',
  styleUrl: './profile.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ProfileComponent implements OnInit {
  private readonly keycloak = inject(KeycloakService);
  private readonly patients = inject(PatientService);
  private readonly appointments = inject(AppointmentService);
  private readonly route = inject(ActivatedRoute);
  private readonly destroyRef = inject(DestroyRef);

  protected readonly state = signal<LoadingStatus>('loading');
  protected readonly profile = signal<PatientProfileDto | null>(null);
  protected readonly activeTab = signal<'personal' | 'appointments'>('personal');
  protected readonly visits = signal<AppointmentHistoryItem[]>([]);
  protected readonly historyStatus = signal<LoadingStatus>('missing');
  protected readonly openResultId = signal<string | null>(null);
  protected readonly result = signal<AppointmentResult | null>(null);
  protected readonly resultStatus = signal<LoadingStatus>('missing');

  ngOnInit(): void {
    void this.loadProfile();
    this.route.queryParamMap.pipe(takeUntilDestroyed(this.destroyRef)).subscribe((params) => {
      if (params.get('tab') === 'appointments') this.switchTab('appointments');
    });
  }

  protected async loadProfile(): Promise<void> {
    this.state.set('loading');
    try {
      const { id } = await this.keycloak.loadUserProfile();
      if (!id) throw new Error('Patient account is unavailable.');
      const response = await firstValueFrom(this.patients.getProfileByAccountId(id));
      if (!response.isSuccess || !response.data) throw new Error('Patient profile is unavailable.');
      this.profile.set(response.data);
      this.state.set('ready');
    } catch (error: unknown) {
      this.state.set(error instanceof HttpErrorResponse && error.status === 404 ? 'missing' : 'error');
    }
  }

  protected switchTab(tab: 'personal' | 'appointments'): void {
    this.activeTab.set(tab);
    if (tab === 'appointments') this.loadHistory();
  }

  protected loadHistory(): void {
    if (this.historyStatus() === 'loading') return;
    this.historyStatus.set('loading');
    this.appointments.getHistory().pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: (items) => {
        this.visits.set(items);
        this.historyStatus.set('ready');
      },
      error: () => this.historyStatus.set('error'),
    });
  }

  protected showResult(visit: AppointmentHistoryItem): void {
    if (!visit.resultId) return;
    this.openResultId.set(visit.appointmentId);
    this.result.set(null);
    this.resultStatus.set('loading');

    this.appointments.getResult(visit.appointmentId).pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: (result) => {
        if (this.openResultId() !== visit.appointmentId) return;
        this.result.set(result);
        this.resultStatus.set('ready');
      },
      error: () => {
        if (this.openResultId() === visit.appointmentId) this.resultStatus.set('error');
      },
    });
  }

  protected getPhotoUrl(photoId?: string | null): string | null {
    return documentImageUrl(photoId);
  }
}
