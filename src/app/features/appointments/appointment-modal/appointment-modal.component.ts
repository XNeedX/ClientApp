import { HttpErrorResponse } from '@angular/common/http';
import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  EventEmitter,
  Input,
  OnInit,
  Output,
  computed,
  inject,
  signal,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { AbstractControl, FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { Subject, catchError, map, of, switchMap } from 'rxjs';

import { appointmentUtcTime, clinicToday } from '../../../core/models/clinic-date';
import { BookingCatalogs } from '../models/appointment.model';
import { AppointmentService } from '../services/appointment.service';

type BookingField = 'specialization' | 'doctor' | 'service' | 'office';
interface SlotQuery { doctorId: string; serviceId: string; date: string }

@Component({
  selector: 'app-appointment-modal',
  standalone: true,
  imports: [ReactiveFormsModule, RouterLink],
  templateUrl: './appointment-modal.component.html',
  styleUrl: './appointment-modal.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AppointmentModalComponent implements OnInit {
  @Input() preselectedDoctorId?: string;
  @Output() close = new EventEmitter<void>();

  private readonly appointmentService = inject(AppointmentService);
  private readonly destroyRef = inject(DestroyRef);
  private readonly slotQuery = new Subject<SlotQuery | null>();

  protected readonly appointmentForm = inject(FormBuilder).nonNullable.group({
    specialization: ['', Validators.required],
    doctor: ['', Validators.required],
    service: ['', Validators.required],
    office: ['', Validators.required],
    date: [{ value: '', disabled: true }, [Validators.required, (control: AbstractControl<string>) =>
      control.value && control.value < clinicToday() ? { pastDate: true } : null]],
    timeSlot: [{ value: '', disabled: true }, Validators.required],
  });

  protected readonly today = clinicToday();
  protected readonly catalogs = signal<BookingCatalogs | null>(null);
  protected readonly catalogError = signal(false);
  protected readonly timeSlots = signal<string[]>([]);
  protected readonly loadingSlots = signal(false);
  protected readonly slotError = signal(false);
  protected readonly bookingError = signal<string | null>(null);
  protected readonly needsProfile = signal(false);
  protected readonly saving = signal(false);
  protected readonly created = signal(false);
  protected readonly showConfirmExitDialog = signal(false);

  private readonly selection = signal({ specialization: '', doctor: '', service: '', office: '' });

  protected readonly filteredDoctors = computed(() => {
    const { specialization, office } = this.selection();
    return this.catalogs()?.doctors.filter((doctor) =>
      (!specialization || doctor.specializationId === specialization) &&
      (!office || doctor.officeId === office),
    ) ?? [];
  });

  protected readonly filteredServices = computed(() => {
    const { specialization } = this.selection();
    return this.catalogs()?.services.filter((service) =>
      !specialization || service.specializationId === specialization,
    ) ?? [];
  });

  ngOnInit(): void {
    const controls = this.appointmentForm.controls;
    const catalogFields: BookingField[] = ['specialization', 'doctor', 'service', 'office'];
    for (const field of catalogFields) {
      controls[field].valueChanges.pipe(takeUntilDestroyed(this.destroyRef))
        .subscribe(() => this.syncSelection(field));
    }

    controls.date.valueChanges.pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(() => this.refreshSlots());

    this.slotQuery.pipe(
      switchMap((query) => query === null
        ? of({ slots: [], error: false })
        : this.appointmentService.getTimeSlots(query.doctorId, query.serviceId, query.date).pipe(
            map((slots) => ({
              slots: slots.filter((time) => /^\d{2}:\d{2}$/.test(time) &&
                Date.parse(appointmentUtcTime(query.date, time)) > Date.now()),
              error: false,
            })),
            catchError(() => of({ slots: [], error: true })),
          )),
      takeUntilDestroyed(this.destroyRef),
    ).subscribe(({ slots, error }) => {
      this.loadingSlots.set(false);
      this.slotError.set(error);
      this.timeSlots.set(slots);
      if (slots.length) controls.timeSlot.enable({ emitEvent: false });
    });

    this.loadCatalogs();
  }

  protected loadCatalogs(): void {
    this.catalogError.set(false);
    this.appointmentService.getCatalogs().pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: (catalogs) => {
        this.catalogs.set(catalogs);
        if (catalogs.doctors.some((doctor) => doctor.id === this.preselectedDoctorId)) {
          this.appointmentForm.controls.doctor.setValue(this.preselectedDoctorId ?? '');
        }
      },
      error: () => this.catalogError.set(true),
    });
  }

  protected refreshSlots(): void {
    const controls = this.appointmentForm.controls;
    const { date, doctor, service } = this.appointmentForm.getRawValue();

    controls.timeSlot.reset({ value: '', disabled: true }, { emitEvent: false });
    this.timeSlots.set([]);
    this.slotError.set(false);
    const ready = controls.date.enabled && controls.date.valid && Boolean(doctor && service);
    this.loadingSlots.set(ready);
    this.slotQuery.next(ready ? { date, doctorId: doctor, serviceId: service } : null);
  }

  protected canSubmit(): boolean {
    const value = this.appointmentForm.getRawValue();
    return this.appointmentForm.valid && !this.saving() &&
      this.appointmentForm.controls.timeSlot.enabled && this.timeSlots().includes(value.timeSlot);
  }

  protected onSubmit(): void {
    if (!this.canSubmit()) return;

    const { service, doctor, office, date, timeSlot } = this.appointmentForm.getRawValue();
    this.saving.set(true);
    this.bookingError.set(null);
    this.needsProfile.set(false);

    this.appointmentService.createAppointment({
      serviceId: service,
      doctorId: doctor,
      officeId: office,
      date: date + 'T00:00:00Z',
      timeSlot: appointmentUtcTime(date, timeSlot),
    }).pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: () => {
        this.saving.set(false);
        this.created.set(true);
      },
      error: (error: unknown) => {
        this.saving.set(false);
        const apiError = error instanceof HttpErrorResponse ? error : null;
        const message: unknown = apiError?.error?.message;
        this.needsProfile.set(apiError?.status === 404 && typeof message === 'string' && /patient/i.test(message));
        this.bookingError.set(this.needsProfile()
          ? 'A patient profile is required to book a visit.'
          : typeof message === 'string' && message.trim()
            ? message
            : 'Could not book this appointment. Please try again.');
        if (apiError?.status === 409) this.refreshSlots();
      },
    });
  }

  protected onCloseClick(): void {
    if (this.saving()) return;
    if (this.created()) this.close.emit();
    else this.showConfirmExitDialog.set(true);
  }

  protected confirmExit(): void {
    this.showConfirmExitDialog.set(false);
    this.close.emit();
  }

  protected cancelExit(): void {
    this.showConfirmExitDialog.set(false);
  }

  private syncSelection(field: BookingField): void {
    const catalogs = this.catalogs();
    if (!catalogs) return;

    const value = this.appointmentForm.getRawValue();
    const doctor = catalogs.doctors.find((entry) => entry.id === value.doctor);
    const service = catalogs.services.find((entry) => entry.id === value.service);

    if (field === 'doctor' && doctor) {
      value.specialization = doctor.specializationId;
      value.office = doctor.officeId;
    } else if (field === 'service' && service) {
      value.specialization = service.specializationId;
    }

    if (doctor && (doctor.specializationId !== value.specialization || (value.office && doctor.officeId !== value.office))) {
      value.doctor = '';
    }
    if (service && service.specializationId !== value.specialization) value.service = '';

    const { specialization, office } = value;
    this.appointmentForm.patchValue(
      { specialization, office, doctor: value.doctor, service: value.service },
      { emitEvent: false },
    );
    this.selection.set({ specialization, office, doctor: value.doctor, service: value.service });
    this.bookingError.set(null);

    const date = this.appointmentForm.controls.date;
    if (value.doctor && value.service && office) {
      date.enable({ emitEvent: false });
    } else {
      date.reset({ value: '', disabled: true }, { emitEvent: false });
    }
    this.refreshSlots();
  }
}
