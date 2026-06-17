import { Component } from '@angular/core';
import { RouterOutlet } from '@angular/router'; 
import { NavbarComponent } from './core/layout/navbar/navbar.component';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet, NavbarComponent], 
  templateUrl: './app.html',
  styleUrls: ['./app.css']
})
export class App {
  title = 'client-app';
}