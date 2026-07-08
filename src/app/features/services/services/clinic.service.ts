import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../../environments/environment';
import { ApiResponse } from '../../../core/models/api-response.model';
import { ViewCategoryDataDto } from '../models/service.model';

@Injectable({
  providedIn: 'root'
})
export class ClinicService {
  private http = inject(HttpClient);

  private baseUrl = `${environment.gatewayUrl}/services/Service`; 

  getServicesByCategory(category: string): Observable<ApiResponse<ViewCategoryDataDto>> {
    return this.http.get<ApiResponse<ViewCategoryDataDto>>(`${this.baseUrl}/by-category/${category}`);
  }
}