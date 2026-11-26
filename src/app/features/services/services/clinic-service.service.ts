import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, map } from 'rxjs';
import { environment } from '../../../../environments/environment';
import { ApiResponse } from '../../../core/models/api-response.model';
import { Category, ServiceCatalog } from '../models/service.model';

@Injectable({ providedIn: 'root' })
export class ClinicServiceService {
  private readonly http = inject(HttpClient);
  private readonly apiUrl = environment.gatewayUrl + '/services';

  getServicesByCategory(category: Category): Observable<ServiceCatalog> {
    return this.http.get<ApiResponse<ServiceCatalog>>(
      this.apiUrl + '/Service/by-category/' + category
    ).pipe(
      map((response) => {
        if (!response.isSuccess || !response.data) {
          throw new Error('Could not load the service catalog.');
        }

        const { specializations, services } = response.data;
        return {
          specializations: specializations
            .filter((group) => this.isActive(group.status))
            .map((group) => ({
              ...group,
              services: group.services.filter((service) => this.isActive(service.status)),
            }))
            .filter((group) => group.services.length > 0),
          services: services.filter((service) => this.isActive(service.status)),
        };
      }),
    );
  }

  private isActive(status: string | number): boolean {
    return status === 0 || status === 'Active';
  }
}
