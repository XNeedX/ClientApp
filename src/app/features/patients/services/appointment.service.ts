import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, of } from 'rxjs';
import { catchError, map } from 'rxjs/operators';
import { environment } from '../../../../environments/environment';
import { ApiResponse } from '../../../core/models/api-response.model';

export interface CreateAppointmentDto {
  doctorId: string;
  serviceId: string;
  officeId: string;
  date: string;       // ISO string
  timeSlot: string;   // ISO string
}

@Injectable({
  providedIn: 'root'
})
export class AppointmentService {
  private http = inject(HttpClient);
  private baseUrl = `${environment.gatewayUrl}/appointments/Appointments`;

  createAppointment(dto: CreateAppointmentDto): Observable<ApiResponse<any>> {
    return this.http.post<ApiResponse<any>>(this.baseUrl, dto);
  }

  // Attempts to get free slots from the backend. If it fails, falls back to a generated list of default slots.
  getFreeSlots(doctorId: string, date: string): Observable<string[]> {
    const params = new HttpParams()
      .set('doctorId', doctorId)
      .set('date', date);

    return this.http.get<ApiResponse<string[]>>(`${this.baseUrl}/free-slots`, { params }).pipe(
      map(response => {
        if (response && response.isSuccess && response.data) {
          return response.data;
        }
        return this.getDefaultSlots();
      }),
      catchError(() => {
        // Fallback to default slots if backend endpoint doesn't exist yet or fails
        return of(this.getDefaultSlots());
      })
    );
  }

  private getDefaultSlots(): string[] {
    const slots: string[] = [];
    for (let hour = 9; hour < 18; hour++) {
      for (let min = 0; min < 60; min += 10) {
        const hStr = hour < 10 ? `0${hour}` : `${hour}`;
        const mStr = min < 10 ? `0${min}` : `${min}`;
        slots.push(`${hStr}:${mStr}`);
      }
    }
    return slots;
  }
}
