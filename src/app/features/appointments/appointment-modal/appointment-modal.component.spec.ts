import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { of } from 'rxjs';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { AppointmentService } from '../services/appointment.service';
import { AppointmentModalComponent } from './appointment-modal.component';

describe('AppointmentModalComponent', () => {
  let fixture: ComponentFixture<AppointmentModalComponent>;
  const createAppointment = vi.fn(() => of(undefined));

  beforeEach(async () => {
    createAppointment.mockClear();
    await TestBed.configureTestingModule({
      imports: [AppointmentModalComponent],
      providers: [
        provideRouter([]),
        {
          provide: AppointmentService,
          useValue: {
            getCatalogs: () => of({
              specializations: [{ id: 'skin', name: 'Dermatology' }, { id: 'heart', name: 'Cardiology' }],
              offices: [{ id: 'garden', address: 'Garden office' }],
              doctors: [{ id: 'maya', fullName: 'Maya Bennett', specializationId: 'skin', officeId: 'garden' }],
              services: [
                { id: 'dermoscopy', name: 'Dermoscopy', specializationId: 'skin' },
                { id: 'ecg', name: 'ECG', specializationId: 'heart' },
              ],
            }),
            getTimeSlots: () => of(['11:20']),
            createAppointment,
          },
        },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(AppointmentModalComponent);
    fixture.componentRef.setInput('preselectedDoctorId', 'maya');
    fixture.detectChanges();
  });

  function control<T extends HTMLInputElement | HTMLSelectElement>(id: string): T {
    return (fixture.nativeElement as HTMLElement).querySelector<T>(id)!;
  }

  function choose(id: string, value: string, event = 'change'): void {
    const input = control(id);
    input.value = value;
    input.dispatchEvent(new Event(event, { bubbles: true }));
    fixture.detectChanges();
  }

  it('shows the selected doctor services and submits the selected clinic time in UTC', () => {
    expect(control('#booking-specialization').value).toBe('skin');
    expect(control('#booking-office').value).toBe('garden');
    const service = control<HTMLSelectElement>('#booking-service');
    expect(Array.from(service.options, (option) => option.value)).toEqual(['', 'dermoscopy']);

    const time = control<HTMLSelectElement>('#booking-timeSlot');
    expect(time.disabled).toBe(true);
    choose('#booking-service', 'dermoscopy');
    const date = String(new Date().getFullYear() + 1) + '-01-15';
    choose('#booking-date', date, 'input');
    expect(time.disabled).toBe(false);
    choose('#booking-timeSlot', '11:20');

    const confirm = (fixture.nativeElement as HTMLElement).querySelector<HTMLButtonElement>('[type="submit"]');
    confirm?.click();
    fixture.detectChanges();

    expect(createAppointment).toHaveBeenCalledExactlyOnceWith({
      doctorId: 'maya',
      serviceId: 'dermoscopy',
      officeId: 'garden',
      date: date + 'T00:00:00Z',
      timeSlot: date + 'T08:20:00.000Z',
    });
    expect((fixture.nativeElement as HTMLElement).textContent).toContain('Appointment booked');
  });
});
