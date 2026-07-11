import { Component, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router'; 
import { KeycloakService } from 'keycloak-angular';
import { AppointmentModalService } from '../../../features/patients/services/appointment-modal.service';

@Component({
  selector: 'app-navbar',
  standalone: true,
  imports: [CommonModule, RouterModule], 
  templateUrl: './navbar.component.html',
  styleUrls: ['./navbar.component.css']
})
export class NavbarComponent implements OnInit {
  private keycloak = inject(KeycloakService);
  private modalService = inject(AppointmentModalService);
  isLoggedIn = false;
  userName = '';

  async ngOnInit() {
    this.isLoggedIn = await this.keycloak.isLoggedIn();
    
if (this.isLoggedIn) {
      try {
        this.userName = this.keycloak.getUsername() || 'Patient';
      } catch (error) {
        console.error('Ошибка при получении данных пользователя', error);
      }
    }
  }

  makeAppointment() {
    this.modalService.open();
  }

  login() {
    this.keycloak.login();
  }

  logout() {
    this.keycloak.logout(window.location.origin);
  }
}