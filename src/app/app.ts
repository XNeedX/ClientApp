import { Component, inject } from '@angular/core';
import { RouterOutlet } from '@angular/router'; 
import { NavbarComponent } from './core/layout/navbar/navbar.component';
import { AppointmentModalComponent } from './features/patients/appointment-modal/appointment-modal';
import { AppointmentModalService } from './features/patients/services/appointment-modal.service';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet, NavbarComponent, AppointmentModalComponent], 
  templateUrl: './app.html',
  styleUrls: ['./app.css']
})
export class App {
  title = 'client-app';
  public modalService = inject(AppointmentModalService);
}