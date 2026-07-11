import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../../environments/environment';
import { ApiResponse} from '../../../core/models/api-response.model';
import { PagedResult } from '../../../core/models/paged-result.model';
import { DoctorCardDto, DoctorFilterDto } from '../models/doctor.model';

@Injectable({
  providedIn: 'root'
})
export class DoctorService {
  private http = inject(HttpClient);

  private baseUrl = `${environment.gatewayUrl}/profiles/doctors`;

  getDoctors(filter: DoctorFilterDto): Observable<ApiResponse<PagedResult<DoctorCardDto>>> {
    let params = new HttpParams()
      .set('Page', filter.page.toString())
      .set('PageSize', filter.pageSize.toString());

    if (filter.searchName) {
      params = params.set('SearchName', filter.searchName);
    }
    if (filter.specialization) {
      params = params.set('Specialization', filter.specialization);
    }
    if (filter.officeAddress) {
      params = params.set('OfficeAddress', filter.officeAddress);
    }

    return this.http.get<ApiResponse<PagedResult<DoctorCardDto>>>(this.baseUrl, { params });
  }

  getDoctorsWithIds(): Observable<ApiResponse<any>> {
    return this.http.get<ApiResponse<any>>(`${this.baseUrl}/doctors`);
  }
}