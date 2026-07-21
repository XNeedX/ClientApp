import { Component, OnInit, inject, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { KeycloakService } from 'keycloak-angular';
import { PatientService } from '../services/patient.service'; 
import { environment } from '../../../../environments/environment'; 
import { PatientProfileDto } from '../models/patient.model';

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
  private cdr = inject(ChangeDetectorRef); 

  profileData: PatientProfileDto | null = null; 
  isLoading = true;
  
  activeTab: 'personal' | 'appointments' = 'personal';

  async ngOnInit() {
    try {
      const isLoggedIn = await this.keycloak.isLoggedIn();
      
      if (isLoggedIn) {
        const userProfile = await this.keycloak.loadUserProfile();
        const accountId = userProfile.id;

        if (accountId) {
          this.patientService.getProfileByAccountId(accountId).subscribe({
            next: (response) => {
              this.profileData = response.data ?? null;
              this.isLoading = false;
              this.cdr.detectChanges(); 
            },
            error: (err) => {
              console.error('Error fetching profile:', err);
              this.isLoading = false;
              this.cdr.detectChanges(); 
            }
          });
          
        }
      }
      
      this.isLoading = false;
      this.cdr.detectChanges(); 
      
    } catch (error) {
      console.error('Keycloak authentication error:', error);
      this.isLoading = false;
      this.cdr.detectChanges(); 
    }
  }

  switchTab(tab: 'personal' | 'appointments') {
    this.activeTab = tab;
    this.cdr.detectChanges(); 
  }

  getPhotoUrl(photoId?: string | null): string {
    if (!photoId) {
      return 'assets/images/default-avatar.png'; 
    }
    return `${environment.gatewayUrl}/files/${photoId}`; 
  }

  onImageError(event: Event) {
    const target = event.target as HTMLImageElement;
    const fallbackImage = 'assets/images/default-avatar.png';

    if (target.src.includes('default-avatar.png')) {
      return;
    }
    
    target.src = fallbackImage;
  }
}