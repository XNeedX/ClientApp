import { Component, inject, OnInit } from '@angular/core';
import { CommonModule, Location } from '@angular/common';
import { RouterModule } from '@angular/router'; 
import { KeycloakService } from 'keycloak-angular';
import { AppointmentModalComponent } from '../../../features/appointments/appointment-modal/appointment-modal.component';

@Component({
  selector: 'app-navbar',
  standalone: true,
  imports: [CommonModule, RouterModule, AppointmentModalComponent], 
  templateUrl: './navbar.component.html',
  styleUrls: ['./navbar.component.css']
})
export class NavbarComponent implements OnInit {
  private keycloak = inject(KeycloakService);
  private location = inject(Location);
  isLoggedIn = false;
  
  isAppointmentModalOpen = false;

  async ngOnInit() {
    this.isLoggedIn = await this.keycloak.isLoggedIn();
    if (this.isLoggedIn && this.location.path() === '/doctors?book=1') {
      this.location.replaceState('/doctors');
      this.isAppointmentModalOpen = true;
    }
  }

  openBooking(): void {
    if (!this.isLoggedIn) {
      void this.keycloak.login({ redirectUri: window.location.origin + '/doctors?book=1' });
      return;
    }
    this.isAppointmentModalOpen = true;
  }

  login() {
    this.keycloak.login();
  }

  logout() {
    this.keycloak.logout(window.location.origin);
  }
}
