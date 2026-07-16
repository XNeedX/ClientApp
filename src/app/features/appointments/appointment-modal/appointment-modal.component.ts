import { Component, EventEmitter, inject, OnInit, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { AppointmentService } from '../services/appointment.service';
import { KeycloakService } from 'keycloak-angular';
import { Doctor, Office, TimeSlotUi } from '../models/appointment.model';
import { ClinicService, Specialization } from '../../services/models/service.model';

@Component({
  selector: 'app-appointment-modal',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './appointment-modal.component.html',
  styleUrls: ['./appointment-modal.component.css']
})
export class AppointmentModalComponent implements OnInit {
  @Output() close = new EventEmitter<void>();
  
  private fb = inject(FormBuilder);
  private appointmentService = inject(AppointmentService);
  private keycloak = inject(KeycloakService);

  appointmentForm!: FormGroup;
  showConfirmExitDialog = false;

  specializations: Specialization[] = [];
  doctors: Doctor[] = [];
  services: ClinicService[] = [];
  offices: Office[] = [];
  timeSlots: TimeSlotUi[] = [];

  filteredDoctors: Doctor[] = [];
  filteredServices: ClinicService[] = [];
  filteredOffices: Office[] = [];

  ngOnInit() {
    this.initForm();
    this.loadInitialData();
    this.setupFieldDependencies();
  }

  initForm() {
    this.appointmentForm = this.fb.group({
      specialization: ['', Validators.required],
      doctor: ['', Validators.required],
      service: ['', Validators.required],
      office: ['', Validators.required],
      date: [{ value: '', disabled: true }, Validators.required],
      timeSlot: [{ value: '', disabled: true }, Validators.required]
    });
  }

  loadInitialData() {
    this.appointmentService.getSpecializations().subscribe(data => this.specializations = data);
    this.appointmentService.getDoctors().subscribe(data => {
      this.doctors = data;
      this.filteredDoctors = data;
    });
    this.appointmentService.getServices().subscribe(data => {
      this.services = data;
      this.filteredServices = data;
    });
    this.appointmentService.getOffices().subscribe(data => {
      this.offices = data;
      this.filteredOffices = data;
    });
  }

  setupFieldDependencies() {
    this.appointmentForm.get('specialization')?.valueChanges.subscribe(specName => {
      if (specName) {
        this.filteredDoctors = this.doctors.filter(d => d.specialization === specName);
        this.filteredServices = this.services.filter(s => s.specialization?.name === specName);
        this.checkDateAvailability();
      }
    });

    this.appointmentForm.get('doctor')?.valueChanges.subscribe(doctorId => {
      if (doctorId) {
        const doctor = this.doctors.find(d => d.id === doctorId);
        if (doctor) {
          this.appointmentForm.patchValue({ specialization: doctor.specialization }, { emitEvent: false });
          this.loadTimeSlots();
        }
      }
    });

    this.appointmentForm.get('service')?.valueChanges.subscribe(() => this.checkDateAvailability());
    this.appointmentForm.get('date')?.valueChanges.subscribe(() => this.loadTimeSlots());
  }

  checkDateAvailability() {
    const spec = this.appointmentForm.get('specialization')?.value;
    const service = this.appointmentForm.get('service')?.value;
    
    if (spec && service) {
      this.appointmentForm.get('date')?.enable();
      this.appointmentForm.get('timeSlot')?.enable();
    } else {
      this.appointmentForm.get('date')?.disable();
      this.appointmentForm.get('timeSlot')?.disable();
      this.timeSlots = [];
    }
  }

  loadTimeSlots() {
    const doctorId = this.appointmentForm.get('doctor')?.value;
    const serviceId = this.appointmentForm.get('service')?.value; 
    const date = this.appointmentForm.get('date')?.value;
    
    if (doctorId && serviceId && date) {
      this.appointmentService.getTimeSlots(doctorId, serviceId, date).subscribe(slots => {
        this.timeSlots = slots ? slots.filter((s: any) => s.isAvailable) : [];
      });
    }
  }

  getDoctorFullName(doctor: Doctor): string {
    return `${doctor.lastName} ${doctor.firstName} ${doctor.middleName || ''}`.trim();
  }

  onCloseClick() {
    this.showConfirmExitDialog = true;
  }

  confirmExit() {
    this.showConfirmExitDialog = false;
    this.close.emit();
  }

  cancelExit() {
    this.showConfirmExitDialog = false;
  }

  async onSubmit() {
    const isLoggedIn = await this.keycloak.isLoggedIn();
    if (!isLoggedIn) {
      alert('Sign in to make an appointment');
      await this.keycloak.login();
      return;
    }

    if (this.appointmentForm.valid) {
      const formValue = this.appointmentForm.getRawValue();
      
      const userProfile = await this.keycloak.loadUserProfile();
      const patientId = userProfile.id; 

      if (!patientId) {
        console.error('Patient ID not found in Keycloak profile.');
        return;
      }

      const command = {
        serviceId: formValue.service,
        doctorId: formValue.doctor,
        officeId: formValue.office,
        date: new Date(formValue.date).toISOString(),
        timeSlot: formValue.timeSlot
      };

      this.appointmentService.createAppointment(patientId, command).subscribe({
        next: () => {
          alert('Appointment has been created');
          this.close.emit();
        },
        error: (err) => {
          console.error('Error creating appointment:', err);
          alert('An error occurred while creating the appointment.');
        }
      });
    }
  }
}