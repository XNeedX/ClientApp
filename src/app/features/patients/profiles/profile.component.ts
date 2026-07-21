import { Component, OnInit, inject, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { KeycloakService } from 'keycloak-angular';
import { PatientService } from '../services/patient.service'; 
import { environment } from '../../../../environments/environment'; 

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

  profileData: any = null; 
  isLoading = true;
  
  activeTab: 'personal' | 'appointments' = 'personal';

  async ngOnInit() {
    const isLoggedIn = await this.keycloak.isLoggedIn();
    if (isLoggedIn) {
      const userProfile = await this.keycloak.loadUserProfile();
      const accountId = userProfile.id;

      if (accountId) {
        this.patientService.getProfileByAccountId(accountId).subscribe({
          next: (response) => {
            this.profileData = response.data;
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
    } else {
      this.isLoading = false;
      this.cdr.detectChanges(); 
    }
  }

  switchTab(tab: 'personal' | 'appointments') {
    this.activeTab = tab;
    this.cdr.detectChanges(); 
  }

  getPhotoUrl(photoId: string | null): string {
    if (!photoId) {
      return 'assets/images/default-avatar.png'; 
    }
    return `${environment.gatewayUrl}/files/${photoId}`; 
  }
}