import { Component, afterNextRender, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ClinicService } from '../services/clinic.service';
import { ViewCategoryDataDto } from '../models/service.model';

@Component({
  selector: 'app-service-list',
  standalone: true,
  imports: [CommonModule], // CommonModule нужен для пайпов, например json
  templateUrl: './service-list.html',
  styleUrls: ['./service-list.css']
})
export class ServiceListComponent {
  private clinicService = inject(ClinicService);

  // Используем сигналы для хранения состояния
  public categoryData = signal<ViewCategoryDataDto | null>(null);
  public isLoading = signal<boolean>(true);
  public errorMessage = signal<string | null>(null);

  constructor() {
    // afterNextRender гарантирует, что запрос уйдет ТОЛЬКО из браузера.
    // Сервер (SSR) проигнорирует этот блок, и Keycloak отработает корректно.
    afterNextRender(() => {
      this.loadServices();
    });
  }

  private loadServices(): void {
    this.isLoading.set(true);
    this.errorMessage.set(null);

    this.clinicService.getServicesByCategory('Consultations').subscribe({
      next: (response) => {
        // response.data берется из вашей модели ApiResponse
        this.categoryData.set(response.data ?? null);
        this.isLoading.set(false);
      },
      error: (err) => {
        console.error('Ошибка при получении сервисов:', err);
        this.errorMessage.set('Не удалось загрузить список услуг. Пожалуйста, попробуйте позже.');
        this.isLoading.set(false);
      }
    });
  }
}