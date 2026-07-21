import { inject, Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { environment } from '../../../../environments/environment';
import { CreateAppointmentCommand, Doctor, Office, Status, TimeSlotUi } from '../models/appointment.model';
import { ClinicService, Specialization } from '../../services/models/service.model';

@Injectable({ providedIn: 'root' })
export class AppointmentService {
  private http = inject(HttpClient);
  private apiUrl = `${environment.gatewayUrl ?? 'http://localhost:5137'}/appointments`; 

  getSpecializations(): Observable<Specialization[]> {
    return this.http.get<any>(`${this.apiUrl}/Specializations`).pipe(
      map(res => {
        const specs = res.data || res;
        return Array.isArray(specs) ? specs.filter(s => s.status === 0 || s.status === 'Active') : [];
      })
    );
  }

  getDoctors(): Observable<Doctor[]> {
    return this.http.get<any>(`${this.apiUrl}/Doctors`).pipe(
      map(res => {
        const doctors = res.data || res;
        return Array.isArray(doctors) ? doctors.filter(d => d.status === Status.Active) : [];
      })
    );
  }

  getServices(): Observable<ClinicService[]> {
    return this.http.get<any>(`${this.apiUrl}/Services`).pipe(
      map(res => {
        const services = res.data || res;
        return Array.isArray(services) ? services.filter(s => s.status === 0 || s.status === 'Active') : [];
      })
    );
  }

  getOffices(): Observable<Office[]> {
    return this.http.get<any>(`${this.apiUrl}/Offices`).pipe(
      map(res => {
        const offices = res.data || res;
        return Array.isArray(offices) ? offices.filter(o => o.status === Status.Active) : [];
      })
    );
  }

  getTimeSlots(doctorId: string, serviceId: string, date: string): Observable<TimeSlotUi[]> {
    let params = new HttpParams()
      .set('doctorId', doctorId)
      .set('serviceId', serviceId)
      .set('date', date);

    return this.http.get<any>(`${this.apiUrl}/Schedule/available-time-slots`, { params }).pipe(
      map(res => res.data || res)
    );
  }

  createAppointment(patientId: string, command: CreateAppointmentCommand): Observable<any> {
    return this.http.post(`${this.apiUrl}/Appointments/${patientId}`, command);
  }
}