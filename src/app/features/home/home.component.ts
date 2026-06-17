import { Component, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { KeycloakService } from 'keycloak-angular';

@Component({
  selector: 'app-home',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './home.component.html',
  styleUrls: ['./home.component.css']
})
export class HomeComponent implements OnInit {
  private keycloak = inject(KeycloakService);
  isLoggedIn = false;

  async ngOnInit() {
    this.isLoggedIn = await this.keycloak.isLoggedIn();
  }

  login() {
    this.keycloak.login();
  }
}