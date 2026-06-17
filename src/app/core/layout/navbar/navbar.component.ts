import { Component, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router'; 
import { KeycloakService } from 'keycloak-angular';

@Component({
  selector: 'app-navbar',
  standalone: true,
  imports: [CommonModule, RouterModule], 
  templateUrl: './navbar.component.html',
  styleUrls: ['./navbar.component.css']
})
export class NavbarComponent implements OnInit {
  private keycloak = inject(KeycloakService);
  isLoggedIn = false;
  userName = '';

  async ngOnInit() {
    this.isLoggedIn = await this.keycloak.isLoggedIn();
    
    if (this.isLoggedIn) {
      this.userName = this.keycloak.getUsername() || 'Пациент';
    }
  }

  login() {
    this.keycloak.login();
  }

  logout() {
    this.keycloak.logout(window.location.origin);
  }
}