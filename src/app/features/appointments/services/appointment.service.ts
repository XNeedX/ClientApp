import { inject, Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { EMPTY, Observable, expand, forkJoin, map, of, reduce, switchMap } from 'rxjs';

import { environment } from '../../../../environments/environment';
import { ApiResponse } from '../../../core/models/api-response.model';
import { DoctorCardDto } from '../../doctors/models/doctor.model';
import { DoctorService } from '../../doctors/services/doctor.service';
import {
  AppointmentHistoryItem,
  AppointmentResult,
  BookingCatalogs,
  BookingSpecialization,
  CreateAppointmentCommand,
  Office,
} from '../models/appointment.model';

type CatalogStatus = number | string;
interface PublishedSpecialization extends BookingSpecialization { status: CatalogStatus }
interface PublishedSpecializationPage { items: PublishedSpecialization[]; totalCount: number }
interface ScheduledOffice extends Office { status: CatalogStatus }
interface PublishedService { id: string; name: string; status: CatalogStatus }
interface SpecializationDetails extends PublishedSpecialization { services: PublishedService[] }

const PAGE_SIZE = 100;

function active(status: CatalogStatus): boolean {
  return status === 0 || status === 'Active';
}

function dataOrThrow<T>(response: ApiResponse<T>): T {
  if (response.isSuccess && response.data != null) return response.data;
  throw new Error(response.message || 'The clinic service could not complete the request.');
}

function normalize(value: string): string {
  return value.trim().toLowerCase();
}

@Injectable({ providedIn: 'root' })
export class AppointmentService {
  private readonly http = inject(HttpClient);
  private readonly doctors = inject(DoctorService);
  private readonly apiUrl = environment.gatewayUrl + '/appointments';
  private readonly specializationUrl = environment.gatewayUrl + '/services/Specialization';

  getCatalogs(): Observable<BookingCatalogs> {
    return forkJoin({
      doctors: this.loadDoctors(),
      specializations: this.loadSpecializations(),
      offices: this.http.get<ApiResponse<ScheduledOffice[]>>(this.apiUrl + '/Offices')
        .pipe(map((response) => dataOrThrow(response).filter((office) => active(office.status)))),
      scheduled: this.http.get<ApiResponse<PublishedService[]>>(this.apiUrl + '/Services')
        .pipe(map((response) => dataOrThrow(response).filter((service) => active(service.status)))),
    }).pipe(switchMap(({ doctors, specializations, offices, scheduled }) =>
      this.loadServicesForSpecializations(specializations).pipe(map((details) => {
        const availableServiceIds = new Set(scheduled.map((service) => service.id));
        const officeIds = new Map(offices.map((office) => [normalize(office.address), office.id]));
        const specializationIds = new Map(
          specializations.map((specialization) => [normalize(specialization.name), specialization.id]),
        );

        return {
          offices,
          specializations,
          services: details.flatMap((specialization) => specialization.services
            .filter((service) => active(service.status) && availableServiceIds.has(service.id))
            .map(({ id, name }) => ({ id, name, specializationId: specialization.id }))),
          doctors: doctors.flatMap((doctor) => {
            const specializationId = specializationIds.get(normalize(doctor.specialization));
            const officeId = officeIds.get(normalize(doctor.officeAddress));
            return specializationId && officeId
              ? [{ id: doctor.id, fullName: doctor.fullName, specializationId, officeId }]
              : [];
          }),
        };
      })),
    ));
  }

  getServicesForSpecialization(name: string): Observable<PublishedService[]> {
    return this.loadSpecializations().pipe(switchMap((specializations) =>
      this.loadServicesForSpecializations(specializations.filter((spec) => normalize(spec.name) === normalize(name))),
    ), map((details) => details.flatMap((detail) => detail.services.filter((service) => active(service.status)))));
  }

  getTimeSlots(doctorId: string, serviceId: string, date: string): Observable<string[]> {
    return this.http.get<ApiResponse<string[]>>(this.apiUrl + '/Schedule/available-time-slots', {
      params: { doctorId, serviceId, date },
    }).pipe(map(dataOrThrow));
  }

  createAppointment(command: CreateAppointmentCommand): Observable<void> {
    return this.http.post<ApiResponse<unknown>>(this.apiUrl + '/Appointments/me', command).pipe(
      map((response) => {
        if (!response.isSuccess) throw new Error(response.message || 'Could not create the appointment.');
      }),
    );
  }

  getHistory(): Observable<AppointmentHistoryItem[]> {
    return this.http.get<ApiResponse<AppointmentHistoryItem[]>>(this.apiUrl + '/Schedule/me/history')
      .pipe(map(dataOrThrow));
  }

  getResult(appointmentId: string): Observable<AppointmentResult> {
    return this.http.get<ApiResponse<AppointmentResult>>(
      this.apiUrl + '/appointments/' + encodeURIComponent(appointmentId) + '/my-result',
    ).pipe(map(dataOrThrow));
  }

  private loadDoctors(): Observable<DoctorCardDto[]> {
    const getPage = (page: number) => this.doctors.getDoctors({ page, pageSize: PAGE_SIZE }).pipe(map(dataOrThrow));
    return getPage(1).pipe(
      expand((page, index) => (index + 1) * PAGE_SIZE < page.totalCount ? getPage(index + 2) : EMPTY),
      reduce((doctors, page) => [...doctors, ...page.data], [] as DoctorCardDto[]),
    );
  }

  private loadSpecializations(): Observable<PublishedSpecialization[]> {
    const getPage = (page: number) => this.http.get<ApiResponse<PublishedSpecializationPage>>(
      this.specializationUrl, { params: { Page: page, PageSize: PAGE_SIZE } },
    ).pipe(map(dataOrThrow));
    return getPage(1).pipe(
      expand((page, index) => (index + 1) * PAGE_SIZE < page.totalCount ? getPage(index + 2) : EMPTY),
      reduce((items, page) => [...items, ...page.items.filter((item) => active(item.status))], [] as PublishedSpecialization[]),
    );
  }

  private loadServicesForSpecializations(specializations: BookingSpecialization[]): Observable<SpecializationDetails[]> {
    return specializations.length
      ? forkJoin(specializations.map(({ id }) =>
          this.http.get<ApiResponse<SpecializationDetails>>(this.specializationUrl + '/' + id).pipe(map(dataOrThrow))))
      : of([]);
  }
}
