import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { KeycloakService } from 'keycloak-angular';
import { PatientService } from '../services/patient.service'; // Убедитесь в правильности пути
import { environment } from '../../../../environments/environment'; // Убедитесь в правильности пути

@Component({
  selector: 'app-profile',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './profile.component.html',
  styleUrls: ['./profile.component.css']
})
export class ProfileComponent implements OnInit {
  private keycloak = inject(KeycloakService);
  private patientService = inject(PatientService);

  // Переменные для хранения данных
  profileData: any = null; // Сюда ляжет ваш PatientProfileDto
  isLoading = true;
  
  // Управление вкладками (AC-3: по умолчанию открыта personal)
  activeTab: 'personal' | 'appointments' = 'personal';

  async ngOnInit() {
    const isLoggedIn = await this.keycloak.isLoggedIn();
    if (isLoggedIn) {
      const userProfile = await this.keycloak.loadUserProfile();
      const accountId = userProfile.id;

      if (accountId) {
        // Вызываем метод из вашего сервиса
        this.patientService.getProfileByAccountId(accountId).subscribe({
          next: (response) => {
            this.profileData = response.data;
            this.isLoading = false;
          },
          error: (err) => {
            console.error('Error fetching profile:', err);
            this.isLoading = false;
          }
        });
      }
    } else {
      this.isLoading = false;
    }
  }

  // Метод для переключения вкладок (AC-2)
  switchTab(tab: 'personal' | 'appointments') {
    this.activeTab = tab;
  }

  // Вспомогательный метод для получения фото. 
  // Если у вас есть эндпоинт GET /files/{id}, он склеит правильный URL
  getPhotoUrl(photoId: string | null): string {
    if (!photoId) {
      return 'assets/images/default-avatar.png'; // Поместите стандартную картинку в assets
    }
    // Замените '/files/' на маршрут вашего контроллера файлов, если он другой
    return `${environment.gatewayUrl}/files/${photoId}`; 
  }
}