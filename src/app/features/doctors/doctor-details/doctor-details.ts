import { Component, OnInit, inject, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { DoctorService } from '../services/doctor.service'; 
import { AppointmentModalComponent } from '../../../features/appointments/appointment-modal/appointment-modal.component';
import { documentImageUrl } from '../../../core/models/document-image';
import { AppointmentService } from '../../appointments/services/appointment.service';
import { DoctorDetailsDto } from '../models/doctor.model';

@Component({
  selector: 'app-doctor-details',
  standalone: true,
  imports: [CommonModule, AppointmentModalComponent, RouterLink],
  templateUrl: './doctor-details.html',
  styleUrls: ['./doctor-details.css']
})
export class DoctorDetailsComponent implements OnInit {
  private route = inject(ActivatedRoute);
  private doctorService = inject(DoctorService);
  private cdr = inject(ChangeDetectorRef);
  private appointments = inject(AppointmentService);

  doctor: DoctorDetailsDto | null = null;
  isLoading = true;
  isLoadingServices = false;
  doctorServicesFailed = false;
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
      next: (response) => {
        const details = response.data;
        this.doctor = details && response.isSuccess ? { ...details, id } : null;
        this.doctorServicesFailed = false;
        if (this.doctor) {
          this.isLoadingServices = true;
          this.appointments.getServicesForSpecialization(this.doctor.specialization).subscribe({
            next: (services) => {
              if (this.doctor?.id !== id) return;
              this.doctor = { ...this.doctor, services };
              this.isLoadingServices = false;
              this.cdr.markForCheck();
            },
            error: () => {
              if (this.doctor?.id !== id) return;
              this.doctorServicesFailed = true;
              this.isLoadingServices = false;
              this.cdr.markForCheck();
            },
          });
        }
        this.isLoading = false;
        this.cdr.detectChanges();
      },
      error: (err) => {
        console.error('Error loading doctor details:', err);
        this.doctor = null;
        this.isLoading = false;
        this.cdr.detectChanges();
      }
    });
  }

  getPhotoUrl(photoPath?: string): string {
    return documentImageUrl(photoPath) ?? 'assets/images/default-doctor.png';
  }

  onImageError(event: Event): void {
    const target = event.target as HTMLImageElement;
    if (!target.src.endsWith('/default-doctor.png')) {
      target.src = 'assets/images/default-doctor.png';
    }
  }

  getExperience(startYear: number): number {
    if (!startYear) return 0;
    const currentYear = new Date().getFullYear();
    return currentYear - startYear + 1;
  }

  openAppointmentModal() {
    this.isAppointmentModalOpen = true;
  }
}