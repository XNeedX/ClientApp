import { Component, EventEmitter, inject, OnInit, Output, Input } from '@angular/core';
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

  @Input() preselectedDoctorId?: string;
  
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

      if (this.preselectedDoctorId) {
        this.appointmentForm.patchValue({ doctor: this.preselectedDoctorId });
      }
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

  private isMatch(fieldValue: any, spec: Specialization | undefined): boolean {
    if (!fieldValue || !spec) return false;
    
    const targetId = String(spec.id).toLowerCase().trim();
    const targetName = String(spec.name).toLowerCase().trim();
    
    if (typeof fieldValue === 'object') {
       const id = String(fieldValue.id || '').toLowerCase().trim();
       const name = String(fieldValue.name || '').toLowerCase().trim();
       return id === targetId || name === targetName;
    }

    const val = String(fieldValue).toLowerCase().trim();
    return val === targetId || val === targetName || val.includes(targetName) || targetName.includes(val);
  }

 setupFieldDependencies() {
    this.appointmentForm.get('specialization')?.valueChanges.subscribe(specId => {
      if (!specId) return;

      const spec = this.specializations.find(s => s.id === specId);
      if (!spec) return;

      this.filteredDoctors = [...this.doctors];
      this.filteredServices = [...this.services];

      const currentDoctor = this.appointmentForm.get('doctor')?.value;
      if (currentDoctor && !this.filteredDoctors.some(d => d.id === currentDoctor)) {
        this.appointmentForm.get('doctor')?.setValue('', { emitEvent: false });
      }

      const currentService = this.appointmentForm.get('service')?.value;
      if (currentService && !this.filteredServices.some(s => s.id === currentService)) {
        this.appointmentForm.get('service')?.setValue('', { emitEvent: false });
      }

      this.checkDateAvailability();
      this.loadTimeSlots();
    });

    this.appointmentForm.get('doctor')?.valueChanges.subscribe(doctorId => {
      if (!doctorId) return;

      const doctor = this.doctors.find(d => d.id === doctorId);
      if (doctor) {
        const spec = this.specializations.find(s => this.isMatch(doctor.specialization, s));
        
        if (spec && this.appointmentForm.get('specialization')?.value !== spec.id) {
          this.appointmentForm.get('specialization')?.setValue(spec.id, { emitEvent: false });
          
          this.filteredServices = this.services.filter(s => 
            this.isMatch(s.specializationId, spec) || this.isMatch(s.specialization, spec)
          );
        }
        
        this.checkDateAvailability();
        this.loadTimeSlots();
      }
    });

    this.appointmentForm.get('service')?.valueChanges.subscribe(serviceId => {
      if (!serviceId) return;

      const service = this.services.find(s => s.id === serviceId);
      if (service) {
        const spec = this.specializations.find(s => 
          this.isMatch(service.specializationId, s) || this.isMatch(service.specialization, s)
        );

        if (spec && this.appointmentForm.get('specialization')?.value !== spec.id) {
          this.appointmentForm.get('specialization')?.setValue(spec.id, { emitEvent: false });
          
          this.filteredDoctors = this.doctors.filter(d => this.isMatch(d.specialization, spec));
        }
      }
      
      this.checkDateAvailability();
      this.loadTimeSlots(); 
    });

    this.appointmentForm.get('date')?.valueChanges.subscribe(() => {
      this.loadTimeSlots();
    });
  }

  checkDateAvailability() {
    const spec = this.appointmentForm.get('specialization')?.value;
    const service = this.appointmentForm.get('service')?.value;
    
    if (spec && service) {
      if (this.appointmentForm.get('date')?.disabled) {
         this.appointmentForm.get('date')?.enable();
      }
      if (this.appointmentForm.get('timeSlot')?.disabled) {
         this.appointmentForm.get('timeSlot')?.enable();
      }
    } else {
      if (this.appointmentForm.get('date')?.enabled) {
         this.appointmentForm.get('date')?.disable();
         this.appointmentForm.get('date')?.setValue('');
      }
      if (this.appointmentForm.get('timeSlot')?.enabled) {
         this.appointmentForm.get('timeSlot')?.disable();
         this.timeSlots = [];
         this.appointmentForm.get('timeSlot')?.setValue('');
      }
    }
  }

  loadTimeSlots() {
    const doctorId = this.appointmentForm.get('doctor')?.value as string;
    const serviceId = this.appointmentForm.get('service')?.value as string; 
    const date = this.appointmentForm.get('date')?.value as string;
    
    if (doctorId && serviceId && date) {
      this.appointmentService.getTimeSlots(doctorId, serviceId, date).subscribe(slots => {
        if (slots && Array.isArray(slots)) {
          const rawSlots = slots as any[];
          
          this.timeSlots = rawSlots.map((item: any) => {
            if (typeof item === 'string') {
              return {
                time: item,
                fullDateTime: item,
                isAvailable: true
              };
            }
            return {
              time: item.time || '',
              fullDateTime: item.fullDateTime || item.time || '',
              isAvailable: item.isAvailable !== undefined ? item.isAvailable : true
            };
          });
        } else {
          this.timeSlots = [];
        }
      });
    }
  }

  getDoctorFullName(doctor: Doctor): string {
    return `${doctor.lastName} ${doctor.firstName} ${doctor.middleName || ''}`.trim();
  }

  onCloseClick() { this.showConfirmExitDialog = true; }
  confirmExit() { this.showConfirmExitDialog = false; this.close.emit(); }
  cancelExit() { this.showConfirmExitDialog = false; }

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
        console.error('Patient ID not found');
        return;
      }

      const dateStr = formValue.date as string;
      const timeStr = formValue.timeSlot as string; 

      const combinedTimeSlot = new Date(`${dateStr}T${timeStr}:00`).toISOString();

      const command = {
        serviceId: formValue.service as string,
        doctorId: formValue.doctor as string,
        officeId: formValue.office as string,
        date: new Date(dateStr).toISOString(), 
        timeSlot: combinedTimeSlot 
      };

      this.appointmentService.createAppointment(patientId, command).subscribe({
        next: () => {
          alert('Appointment has been created');
          this.close.emit();
        },
        error: (err) => {
          console.error('Error creating appointment:', err);
          alert('An error occurred.');
        }
      });
    }
  }
}