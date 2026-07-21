import { Component, OnInit, inject, ChangeDetectorRef } from '@angular/core';
import { CommonModule, Location } from '@angular/common';
import { ActivatedRoute } from '@angular/router';
import { DoctorService } from '../services/doctor.service'; 
import { AppointmentModalComponent } from '../../../features/appointments/appointment-modal/appointment-modal.component';
import { environment } from '../../../../environments/environment'; 
import { DoctorDetailsDto } from '../models/doctor.model';

@Component({
  selector: 'app-doctor-details',
  standalone: true,
  imports: [CommonModule, AppointmentModalComponent],
  templateUrl: './doctor-details.html',
  styleUrls: ['./doctor-details.css']
})
export class DoctorDetailsComponent implements OnInit {
  private route = inject(ActivatedRoute);
  private location = inject(Location); 
  private doctorService = inject(DoctorService);
  private cdr = inject(ChangeDetectorRef);

  doctor: DoctorDetailsDto | null = null;
  isLoading = true;
  isAppointmentModalOpen = false;

  ngOnInit() {
    this.route.paramMap.subscribe(params => {
      const doctorId = params.get('id');
      if (doctorId && doctorId !== 'undefined') {
        this.loadDoctorDetails(doctorId);
      } else {
        this.isLoading = false;
        this.cdr.detectChanges(); 
      }
    });
  }

  loadDoctorDetails(id: string) {
    this.isLoading = true;
    
    this.doctorService.getDoctorById(id).subscribe({
      next: (response: any) => {
        this.doctor = response.data || response;
        this.isLoading = false;
        this.cdr.detectChanges();
      },
      error: (err) => {
        console.error('Error loading doctor details:', err);
        alert('Could not load doctor details.');
        this.isLoading = false;
        this.cdr.detectChanges();
      }
    });
  }

  getPhotoUrl(photoPath?: string): string {
    if (!photoPath) {
      return 'assets/images/default-doctor.png';
    }
    return `${environment.gatewayUrl}/files/${photoPath}`;
  }

  onImageError(event: Event) {
    const target = event.target as HTMLImageElement;
    target.src = 'assets/images/default-doctor.png'; 
  }

  getExperience(startYear: number): number {
    if (!startYear) return 0;
    const currentYear = new Date().getFullYear();
    return currentYear - startYear + 1;
  }

  goBack() {
    this.location.back();
  }

  openAppointmentModal() {
    this.isAppointmentModalOpen = true;
  }
}