import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { environment } from '../../../../environments/environment';
import { ClinicService, Category } from '../models/service.model';

export interface ServiceApiResponse {
  data: {
    specializations: any[];
    services: ClinicService[];
  };
  isSuccess: boolean;
  message: string | null;
  errors: any[];
}

@Injectable({
  providedIn: 'root'
})
export class ClinicServiceService {
  private http = inject(HttpClient);
  
  private apiUrl = `${environment.gatewayUrl ?? 'http://localhost:5137'}/services`; 

  getServicesByCategory(category: Category): Observable<ClinicService[]> {
    return this.http.get<ServiceApiResponse>(`${this.apiUrl}/Service/by-category/${category}`).pipe(
      map(response => {
        if (response.isSuccess && response.data && Array.isArray(response.data.services)) {
          return response.data.services.filter(
            service => service.status === 0 || service.status === 'Active'
          );
        }
        
        return [];
      })
    );
  }
}