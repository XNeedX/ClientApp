import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { ApiResponse } from '../../core/models/api-response.model';

@Injectable({
  providedIn: 'root'
})
export class OfficeService {
  private http = inject(HttpClient);

  private baseUrl = `${environment.gatewayUrl}/offices/Offices`; 

  getOffices(): Observable<ApiResponse<any[]>> {
    return this.http.get<ApiResponse<any[]>>(this.baseUrl);
  }
}