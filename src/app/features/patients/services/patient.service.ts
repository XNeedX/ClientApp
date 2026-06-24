import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../../environments/environment';
import { ApiResponse } from '../../../core/models/api-response.model';
import { CreatePatientDto, PatientProfileDto, PatientMatchResultDto } from '../models/patient.model';

@Injectable({
  providedIn: 'root' 
})
export class PatientService {
  private http = inject(HttpClient);

  private baseUrl = `${environment.gatewayUrl}/profiles/patients`;

  getProfileByAccountId(accountId: string): Observable<ApiResponse<PatientProfileDto>> {
    return this.http.get<ApiResponse<PatientProfileDto>>(`${this.baseUrl}/account/${accountId}`);
  }

  confirmProfile(data: CreatePatientDto): Observable<ApiResponse<PatientMatchResultDto>> {
    return this.http.post<ApiResponse<PatientMatchResultDto>>(`${this.baseUrl}/confirm`, data);
  }

  linkProfile(profileId: string, accountId: string): Observable<ApiResponse<void>> {
    return this.http.post<ApiResponse<void>>(`${this.baseUrl}/${profileId}/link`, `"${accountId}"`, {
      headers: { 'Content-Type': 'application/json' }
    });
  }

  forceCreateProfile(data: CreatePatientDto): Observable<ApiResponse<PatientMatchResultDto>> {
    return this.http.post<ApiResponse<PatientMatchResultDto>>(`${this.baseUrl}/force-create`, data);
  }
}