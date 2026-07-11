import { Component, OnInit, inject, signal, computed, effect } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { KeycloakService } from 'keycloak-angular';
import { DoctorService } from '../../doctors/services/doctor.service';
import { ClinicService } from '../../services/services/clinic.service';
import { OfficeService } from '../../doctors/services/office.service';
import { AppointmentService } from '../services/appointment.service';
import { AppointmentModalService } from '../services/appointment-modal.service';
import { ViewSpecializationDto, ViewSpecializationServiceDto } from '../../services/models/service.model';
import { forkJoin, of } from 'rxjs';
import { catchError } from 'rxjs/operators';

@Component({
  selector: 'app-appointment-modal',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './appointment-modal.html',
  styleUrls: ['./appointment-modal.css']
})
export class AppointmentModalComponent implements OnInit {
  private fb = inject(FormBuilder);
  private keycloak = inject(KeycloakService);
  private doctorService = inject(DoctorService);
  private clinicService = inject(ClinicService);
  private officeService = inject(OfficeService);
  private appointmentService = inject(AppointmentService);
  private modalService = inject(AppointmentModalService);

  // States
  isLoggedIn = false;
  showConfirmExitDialog = false;
  minDate = '';

  // Master Data (Full lists)
  allDoctors = signal<any[]>([]);
  allSpecializations = signal<ViewSpecializationDto[]>([]);
  allServices = signal<ViewSpecializationServiceDto[]>([]);
  allOffices = signal<any[]>([]);

  // Filtered lists for dropdowns
  filteredSpecializations = signal<ViewSpecializationDto[]>([]);
  filteredDoctors = signal<any[]>([]);
  filteredServices = signal<ViewSpecializationServiceDto[]>([]);
  filteredOffices = signal<any[]>([]);

  // Autocomplete search terms
  specializationSearch = signal<string>('');
  doctorSearch = signal<string>('');
  serviceSearch = signal<string>('');
  officeSearch = signal<string>('');

  // Dropdown visibility flags
  showSpecializationDropdown = signal<boolean>(false);
  showDoctorDropdown = signal<boolean>(false);
  showServiceDropdown = signal<boolean>(false);
  showOfficeDropdown = signal<boolean>(false);

  // Error messages
  specializationError = signal<string | null>(null);
  doctorError = signal<string | null>(null);
  serviceError = signal<string | null>(null);
  officeError = signal<string | null>(null);
  dateError = signal<string | null>(null);
  timeSlotError = signal<string | null>(null);

  // Free time slots list
  freeSlots = signal<string[]>([]);
  selectedSlot = signal<string | null>(null);

  appointmentForm!: FormGroup;

  // Track if fields are disabled/enabled
  isDateTimeEnabled = computed(() => {
    const spec = this.appointmentForm?.get('specialization')?.value;
    const serv = this.appointmentForm?.get('service')?.value;
    return !!spec && !!serv;
  });

  async ngOnInit() {
    this.isLoggedIn = await this.keycloak.isLoggedIn();

    const today = new Date();
    const yyyy = today.getFullYear();
    const mm = String(today.getMonth() + 1).padStart(2, '0');
    const dd = String(today.getDate()).padStart(2, '0');
    this.minDate = `${yyyy}-${mm}-${dd}`;

    this.appointmentForm = this.fb.group({
      specialization: ['', Validators.required],
      doctor: ['', Validators.required],
      service: ['', Validators.required],
      office: ['', Validators.required],
      date: ['', Validators.required],
      timeSlot: ['', Validators.required]
    });

    // Disable date and timeSlot initially
    this.appointmentForm.get('date')?.disable();
    this.appointmentForm.get('timeSlot')?.disable();

    this.loadData();
    this.setupFormValueChanges();
  }

  // Close the main modal trigger
  onCloseClick() {
    if (this.appointmentForm.dirty || this.hasAnyValue()) {
      this.showConfirmExitDialog = true;
    } else {
      this.modalService.close();
    }
  }

  hasAnyValue(): boolean {
    const vals = this.appointmentForm.value;
    return !!(vals.specialization || vals.doctor || vals.service || vals.office || vals.date || vals.timeSlot);
  }

  confirmExit(yes: boolean) {
    this.showConfirmExitDialog = false;
    if (yes) {
      this.modalService.close();
    }
  }

  // Load all master lists
  private loadData() {
    // 1. Load specializations & services for all 3 categories (Consultations, Diagnostics, Analyses)
    forkJoin({
      consultations: this.clinicService.getServicesByCategory('Consultations').pipe(catchError(() => of(null))),
      diagnostics: this.clinicService.getServicesByCategory('Diagnostics').pipe(catchError(() => of(null))),
      analyses: this.clinicService.getServicesByCategory('Analyses').pipe(catchError(() => of(null)))
    }).subscribe({
      next: (res) => {
        const specMap = new Map<string, ViewSpecializationDto>();
        const allServicesList: ViewSpecializationServiceDto[] = [];

        const categories = [res.consultations, res.diagnostics, res.analyses];
        categories.forEach((categoryRes) => {
          const catData = categoryRes?.isSuccess !== undefined ? categoryRes.data : categoryRes;
          if (catData) {
            const dataAny = catData as any;
            const activeSpecs = (dataAny.specializations || []).filter(
              (s: any) => s.status === 'Active' || s.status === 0
            );
            activeSpecs.forEach((s: any) => {
              if (!specMap.has(s.name)) {
                specMap.set(s.name, { ...s, services: [...s.services] });
              } else {
                const existing = specMap.get(s.name)!;
                s.services.forEach((serv: any) => {
                  if (!existing.services.some(x => x.id === serv.id)) {
                    existing.services.push(serv);
                  }
                });
              }
            });

            const activeServices = (dataAny.services || []).filter(
              (s: any) => s.status === 'Active' || s.status === 0
            );
            activeServices.forEach((s: any) => {
              if (!allServicesList.some(x => x.id === s.id)) {
                allServicesList.push(s);
              }
            });
          }
        });

        const combinedSpecs = Array.from(specMap.values());
        this.allSpecializations.set(combinedSpecs);
        this.filteredSpecializations.set(combinedSpecs);

        this.allServices.set(allServicesList);
        this.filteredServices.set(allServicesList);
      },
      error: (err) => {
        console.error('Error loading clinic categories:', err);
      }
    });

    // 2. Load offices
    this.officeService.getOffices().subscribe({
      next: (res) => {
        const offData = res?.isSuccess !== undefined ? res.data : res;
        if (offData) {
          // Filter active offices (AC-13)
          const offDataAny = offData as any;
          const activeOffices = (Array.isArray(offDataAny) ? offDataAny : (offDataAny.items || offDataAny.data || [])).filter(
            (o: any) => o.status === 'Active' || o.status === 0 || o.status === '1' || o.status === 1
          );
          this.allOffices.set(activeOffices);
          this.filteredOffices.set(activeOffices);
        }
      }
    });

    // 3. Load doctors (with IDs)
    this.doctorService.getDoctorsWithIds().subscribe({
      next: (res) => {
        const docData = res?.isSuccess !== undefined ? res.data : res;
        if (docData) {
          const docDataAny = docData as any;
          const docs = Array.isArray(docDataAny) ? docDataAny : (docDataAny.items || docDataAny.data || []);
          // Filter only doctors at work (AC-12)
          const atWorkDocs = docs.filter(
            (d: any) => d.status === 'At work' || d.status === 'Active' || d.status === 0 || d.status === '0' || d.status === 1 || d.status === '1'
          );
          this.allDoctors.set(atWorkDocs);
          this.filteredDoctors.set(atWorkDocs);
        }
      }
    });
  }

  private setupFormValueChanges() {
    // Watch specialization and service to toggle date/timeslot controls (AC-11)
    effect(() => {
      const enabled = this.isDateTimeEnabled();
      if (enabled) {
        this.appointmentForm.get('date')?.enable();
        this.appointmentForm.get('timeSlot')?.enable();
      } else {
        this.appointmentForm.get('date')?.disable();
        this.appointmentForm.get('timeSlot')?.disable();
        this.appointmentForm.get('date')?.setValue('');
        this.appointmentForm.get('timeSlot')?.setValue('');
        this.freeSlots.set([]);
        this.selectedSlot.set(null);
      }
    });

    // Load slots when any of the relevant fields change
    this.appointmentForm.get('date')?.valueChanges.subscribe(() => {
      this.loadFreeSlots();
    });
    this.appointmentForm.get('doctor')?.valueChanges.subscribe(() => {
      this.loadFreeSlots();
    });
    this.appointmentForm.get('specialization')?.valueChanges.subscribe(() => {
      this.loadFreeSlots();
    });
    this.appointmentForm.get('service')?.valueChanges.subscribe(() => {
      this.loadFreeSlots();
    });
  }

  // --- Autocomplete search and display filtering ---
  
  onSpecializationInput(event: Event) {
    const val = (event.target as HTMLInputElement).value;
    this.specializationSearch.set(val);
    this.showSpecializationDropdown.set(true);

    // Filter list
    const filtered = this.getAvailableSpecializations().filter(s =>
      s.name.toLowerCase().includes(val.toLowerCase())
    );
    this.filteredSpecializations.set(filtered);
  }

  selectSpecialization(spec: ViewSpecializationDto) {
    this.appointmentForm.get('specialization')?.setValue(spec.name);
    this.specializationSearch.set(spec.name);
    this.showSpecializationDropdown.set(false);
    this.specializationError.set(null);

    // Apply cascading logic
    this.applyCascadingFromSpecialization(spec.name);
  }

  onSpecializationBlur() {
    setTimeout(() => {
      this.showSpecializationDropdown.set(false);
      const val = this.appointmentForm.get('specialization')?.value;
      if (!val) {
        this.specializationError.set('Please, choose the specialization');
      } else {
        const exists = this.allSpecializations().some(s => s.name.toLowerCase() === val.toLowerCase());
        if (!exists) {
          this.specializationError.set('Invalid specialization name');
        } else {
          this.specializationError.set(null);
        }
      }
    }, 200);
  }

  onDoctorInput(event: Event) {
    const val = (event.target as HTMLInputElement).value;
    this.doctorSearch.set(val);
    this.showDoctorDropdown.set(true);

    const filtered = this.getAvailableDoctors().filter(d =>
      d.fullName.toLowerCase().includes(val.toLowerCase())
    );
    this.filteredDoctors.set(filtered);
  }

  selectDoctor(doc: any) {
    this.appointmentForm.get('doctor')?.setValue(doc.fullName);
    this.doctorSearch.set(doc.fullName);
    this.showDoctorDropdown.set(false);
    this.doctorError.set(null);

    // Fill doctor's specialization (F-1)
    this.appointmentForm.get('specialization')?.setValue(doc.specialization);
    this.specializationSearch.set(doc.specialization);
    this.specializationError.set(null);

    // Fill doctor's office address (F-4)
    const matchedOffice = this.allOffices().find(o => o.address === doc.officeAddress);
    if (matchedOffice) {
      this.appointmentForm.get('office')?.setValue(matchedOffice.name);
      this.officeSearch.set(matchedOffice.name);
      this.officeError.set(null);
    }

    this.applyCascadingFromDoctor(doc);
  }

  onDoctorBlur() {
    setTimeout(() => {
      this.showDoctorDropdown.set(false);
      const val = this.appointmentForm.get('doctor')?.value;
      if (!val) {
        this.doctorError.set('Please, choose the doctor');
      } else {
        const exists = this.allDoctors().some(d => d.fullName.toLowerCase() === val.toLowerCase());
        if (!exists) {
          this.doctorError.set('Invalid doctor name');
        } else {
          this.doctorError.set(null);
        }
      }
    }, 200);
  }

  onServiceInput(event: Event) {
    const val = (event.target as HTMLInputElement).value;
    this.serviceSearch.set(val);
    this.showServiceDropdown.set(true);

    const filtered = this.getAvailableServices().filter(s =>
      s.name.toLowerCase().includes(val.toLowerCase())
    );
    this.filteredServices.set(filtered);
  }

  selectService(service: ViewSpecializationServiceDto) {
    this.appointmentForm.get('service')?.setValue(service.name);
    this.serviceSearch.set(service.name);
    this.showServiceDropdown.set(false);
    this.serviceError.set(null);

    // Fill specialization according to service's specialization (F-1)
    const spec = this.allSpecializations().find(s =>
      s.services.some(serv => serv.id === service.id)
    );
    if (spec) {
      this.appointmentForm.get('specialization')?.setValue(spec.name);
      this.specializationSearch.set(spec.name);
      this.specializationError.set(null);
    }

    this.applyCascadingFromService(service);
  }

  onServiceBlur() {
    setTimeout(() => {
      this.showServiceDropdown.set(false);
      const val = this.appointmentForm.get('service')?.value;
      if (!val) {
        this.serviceError.set('Please, choose the service');
      } else {
        const exists = this.allServices().some(s => s.name.toLowerCase() === val.toLowerCase());
        if (!exists) {
          this.serviceError.set('Invalid service name');
        } else {
          this.serviceError.set(null);
        }
      }
    }, 200);
  }

  onOfficeInput(event: Event) {
    const val = (event.target as HTMLInputElement).value;
    this.officeSearch.set(val);
    this.showOfficeDropdown.set(true);

    const filtered = this.getAvailableOffices().filter(o =>
      o.name.toLowerCase().includes(val.toLowerCase()) ||
      o.address.toLowerCase().includes(val.toLowerCase())
    );
    this.filteredOffices.set(filtered);
  }

  selectOffice(off: any) {
    this.appointmentForm.get('office')?.setValue(off.name);
    this.officeSearch.set(off.name);
    this.showOfficeDropdown.set(false);
    this.officeError.set(null);

    this.applyCascadingFromOffice(off.name);
  }

  onOfficeBlur() {
    setTimeout(() => {
      this.showOfficeDropdown.set(false);
      const val = this.appointmentForm.get('office')?.value;
      if (!val) {
        this.officeError.set('Please, choose the office');
      } else {
        const exists = this.allOffices().some(o => o.name.toLowerCase() === val.toLowerCase());
        if (!exists) {
          this.officeError.set('Invalid office name');
        } else {
          this.officeError.set(null);
        }
      }
    }, 200);
  }

  onDateBlur() {
    const val = this.appointmentForm.get('date')?.value;
    if (!val) {
      this.dateError.set('Please, select the date');
    } else {
      this.dateError.set(null);
    }
  }

  onTimeSlotBlur() {
    setTimeout(() => {
      const val = this.appointmentForm.get('timeSlot')?.value;
      if (!val) {
        this.timeSlotError.set('Please, select the time slot');
      } else {
        this.timeSlotError.set(null);
      }
    }, 200);
  }

  // --- Cascading dynamic filters ---

  private getAvailableSpecializations(): ViewSpecializationDto[] {
    const officeName = this.appointmentForm?.get('office')?.value;
    if (officeName) {
      const office = this.allOffices().find(o => o.name === officeName);
      if (office) {
        const docsInOffice = this.allDoctors().filter(d => d.officeAddress === office.address);
        const specNames = docsInOffice.map(d => d.specialization);
        return this.allSpecializations().filter(s => specNames.includes(s.name));
      }
    }
    return this.allSpecializations();
  }

  private getAvailableDoctors(): any[] {
    let list = this.allDoctors();
    const spec = this.appointmentForm?.get('specialization')?.value;
    const serviceName = this.appointmentForm?.get('service')?.value;
    const officeName = this.appointmentForm?.get('office')?.value;

    if (spec) {
      list = list.filter(d => d.specialization.toLowerCase() === spec.toLowerCase());
    }
    if (serviceName) {
      const service = this.allServices().find(s => s.name === serviceName);
      const parentSpec = this.allSpecializations().find(sp => sp.services.some(s => s.id === service?.id));
      if (parentSpec) {
        list = list.filter(d => d.specialization.toLowerCase() === parentSpec.name.toLowerCase());
      }
    }
    if (officeName) {
      const office = this.allOffices().find(o => o.name === officeName);
      if (office) {
        list = list.filter(d => d.officeAddress === office.address);
      }
    }
    return list;
  }

  private getAvailableServices(): ViewSpecializationServiceDto[] {
    let list = this.allServices();
    const spec = this.appointmentForm?.get('specialization')?.value;
    const doctorName = this.appointmentForm?.get('doctor')?.value;
    const officeName = this.appointmentForm?.get('office')?.value;

    if (spec) {
      const specialization = this.allSpecializations().find(s => s.name.toLowerCase() === spec.toLowerCase());
      list = specialization ? specialization.services : [];
    } else if (doctorName) {
      const doctor = this.allDoctors().find(d => d.fullName === doctorName);
      if (doctor) {
        const specialization = this.allSpecializations().find(s => s.name.toLowerCase() === doctor.specialization.toLowerCase());
        list = specialization ? specialization.services : [];
      }
    } else if (officeName) {
      const office = this.allOffices().find(o => o.name === officeName);
      if (office) {
        const docsInOffice = this.allDoctors().filter(d => d.officeAddress === office.address);
        const specNames = docsInOffice.map(d => d.specialization.toLowerCase());
        list = list.filter(s => {
          const parentSpec = this.allSpecializations().find(sp => sp.services.some(serv => serv.id === s.id));
          return parentSpec && specNames.includes(parentSpec.name.toLowerCase());
        });
      }
    }
    return list;
  }

  private getAvailableOffices(): any[] {
    let list = this.allOffices();
    const spec = this.appointmentForm?.get('specialization')?.value;
    const serviceName = this.appointmentForm?.get('service')?.value;

    if (spec) {
      const docsWithSpec = this.allDoctors().filter(d => d.specialization.toLowerCase() === spec.toLowerCase());
      const officeAddresses = docsWithSpec.map(d => d.officeAddress);
      list = list.filter(o => officeAddresses.includes(o.address));
    } else if (serviceName) {
      const service = this.allServices().find(s => s.name === serviceName);
      const parentSpec = this.allSpecializations().find(sp => sp.services.some(s => s.id === service?.id));
      if (parentSpec) {
        const docsWithSpec = this.allDoctors().filter(d => d.specialization.toLowerCase() === parentSpec.name.toLowerCase());
        const officeAddresses = docsWithSpec.map(d => d.officeAddress);
        list = list.filter(o => officeAddresses.includes(o.address));
      }
    }
    return list;
  }

  // --- Triggers on selection ---

  private applyCascadingFromSpecialization(specName: string) {
    this.filteredDoctors.set(this.getAvailableDoctors());
    this.filteredServices.set(this.getAvailableServices());
    this.filteredOffices.set(this.getAvailableOffices());
  }

  private applyCascadingFromDoctor(doctor: any) {
    this.filteredSpecializations.set(this.getAvailableSpecializations());
    this.filteredServices.set(this.getAvailableServices());
    this.filteredOffices.set(this.getAvailableOffices());
  }

  private applyCascadingFromService(service: ViewSpecializationServiceDto) {
    this.filteredSpecializations.set(this.getAvailableSpecializations());
    this.filteredDoctors.set(this.getAvailableDoctors());
    this.filteredOffices.set(this.getAvailableOffices());
  }

  private applyCascadingFromOffice(officeName: string) {
    this.filteredSpecializations.set(this.getAvailableSpecializations());
    this.filteredDoctors.set(this.getAvailableDoctors());
    this.filteredServices.set(this.getAvailableServices());
  }

  // --- Timeslots loading & selection ---

  loadFreeSlots() {
    const dateVal = this.appointmentForm.get('date')?.value;
    if (!dateVal) {
      this.freeSlots.set([]);
      this.selectedSlot.set(null);
      return;
    }

    const docName = this.appointmentForm.get('doctor')?.value;
    
    if (docName) {
      const doctor = this.allDoctors().find(d => d.fullName === docName);
      if (!doctor) return;

      this.appointmentService.getFreeSlots(doctor.id, dateVal).subscribe((slots) => {
        const filtered = this.filterSlotsByService(slots);
        
        if (filtered.length === 0) {
          this.appointmentForm.get('date')?.setValue('');
          this.freeSlots.set([]);
          this.selectedSlot.set(null);
          this.dateError.set('There are no free slots on this date. Please select another date.');
        } else {
          this.freeSlots.set(filtered);
          this.dateError.set(null);

          if (this.selectedSlot() && !filtered.includes(this.selectedSlot()!)) {
            this.selectedSlot.set(null);
            this.appointmentForm.get('timeSlot')?.setValue('');
          }
          
          if (this.selectedSlot()) {
            this.checkSingleFreeDoctor(dateVal, this.selectedSlot()!);
          }
        }
      });
    } else {
      const availableDocs = this.getAvailableDoctors();
      if (availableDocs.length === 0) {
        this.freeSlots.set([]);
        this.selectedSlot.set(null);
        return;
      }

      const requests = availableDocs.map(doc => 
        this.appointmentService.getFreeSlots(doc.id, dateVal).pipe(
          catchError(() => of([] as string[]))
        )
      );

      forkJoin(requests).subscribe((allDocsSlots) => {
        const unionSlots = new Set<string>();
        allDocsSlots.forEach(slots => {
          slots.forEach(slot => unionSlots.add(slot));
        });

        const sortedSlots = Array.from(unionSlots).sort();
        const filtered = this.filterSlotsByService(sortedSlots);
        
        if (filtered.length === 0) {
          this.appointmentForm.get('date')?.setValue('');
          this.freeSlots.set([]);
          this.selectedSlot.set(null);
          this.dateError.set('There are no free slots on this date. Please select another date.');
        } else {
          this.freeSlots.set(filtered);
          this.dateError.set(null);

          if (this.selectedSlot() && !filtered.includes(this.selectedSlot()!)) {
            this.selectedSlot.set(null);
            this.appointmentForm.get('timeSlot')?.setValue('');
          }

          if (this.selectedSlot()) {
            this.checkSingleFreeDoctor(dateVal, this.selectedSlot()!);
          }
        }
      });
    }
  }

  selectSlot(slot: string) {
    this.selectedSlot.set(slot);
    this.appointmentForm.get('timeSlot')?.setValue(slot);
    this.timeSlotError.set(null);

    const dateVal = this.appointmentForm.get('date')?.value;
    if (dateVal) {
      this.checkSingleFreeDoctor(dateVal, slot);
    }
  }

  private checkSingleFreeDoctor(date: string, slot: string) {
    const currentDoc = this.appointmentForm.get('doctor')?.value;
    if (currentDoc) return;

    const availableDocs = this.getAvailableDoctors();
    
    if (availableDocs.length === 1) {
      const doc = availableDocs[0];
      this.appointmentForm.get('doctor')?.setValue(doc.fullName);
      this.doctorSearch.set(doc.fullName);
      this.doctorError.set(null);

      this.appointmentForm.get('specialization')?.setValue(doc.specialization);
      this.specializationSearch.set(doc.specialization);
      this.specializationError.set(null);

      const matchedOffice = this.allOffices().find(o => o.address === doc.officeAddress);
      if (matchedOffice) {
        this.appointmentForm.get('office')?.setValue(matchedOffice.name);
        this.officeSearch.set(matchedOffice.name);
        this.officeError.set(null);
      }
    }
  }

  filterSlotsByService(slots: string[]): string[] {
    const serviceName = this.appointmentForm.get('service')?.value;
    if (!serviceName) return slots;

    const service = this.allServices().find(s => s.name === serviceName);
    if (!service) return slots;

    const categoryStr = String(service.category);
    
    const isConsultation = categoryStr === 'Consultations' || categoryStr === '1';
    const isDiagnostics = categoryStr === 'Diagnostics' || categoryStr === '2';
    const isAnalyses = categoryStr === 'Analyses' || categoryStr === '0';

    return slots.filter(slot => {
      if (isAnalyses) {
        return true;
      }
      
      const [hours, minutes] = slot.split(':').map(Number);
      
      if (isConsultation) {
        const nextSlot = this.addMinutes(hours, minutes, 10);
        return slots.includes(nextSlot);
      }
      
      if (isDiagnostics) {
        const nextSlot = this.addMinutes(hours, minutes, 10);
        const nextNextSlot = this.addMinutes(hours, minutes, 20);
        return slots.includes(nextSlot) && slots.includes(nextNextSlot);
      }
      
      return true;
    });
  }

  private addMinutes(hours: number, minutes: number, minsToAdd: number): string {
    let totalMins = hours * 60 + minutes + minsToAdd;
    const newHours = Math.floor(totalMins / 60) % 24;
    const newMins = totalMins % 60;
    return `${this.padZero(newHours)}:${this.padZero(newMins)}`;
  }

  private padZero(num: number): string {
    return num < 10 ? `0${num}` : `${num}`;
  }

  // --- Confirm Action ---

  onSubmit() {
    if (!this.isLoggedIn) {
      alert('Sign in to make an appointment');
      this.keycloak.login({
        redirectUri: window.location.origin
      });
      return;
    }

    if (this.appointmentForm.invalid) {
      return;
    }

    const formValues = this.appointmentForm.value;
    const doctor = this.allDoctors().find(d => d.fullName === formValues.doctor);
    const service = this.allServices().find(s => s.name === formValues.service);
    const office = this.allOffices().find(o => o.name === formValues.office);

    if (!doctor || !service || !office || !this.selectedSlot()) {
      return;
    }

    const dateStr = formValues.date;
    const [hours, minutes] = this.selectedSlot()!.split(':');
    
    const localDateTime = new Date(dateStr);
    localDateTime.setHours(parseInt(hours, 10));
    localDateTime.setMinutes(parseInt(minutes, 10));

    const dto = {
      doctorId: doctor.id,
      serviceId: service.id,
      officeId: office.id,
      date: new Date(dateStr).toISOString(),
      timeSlot: localDateTime.toISOString()
    };

    this.appointmentService.createAppointment(dto).subscribe({
      next: (response) => {
        if (response.isSuccess) {
          alert('Appointment has been created');
          this.modalService.close();
        } else {
          alert(response.errors?.join(', ') || 'Failed to create appointment');
        }
      },
      error: (err) => {
        console.error('Error creating appointment:', err);
        alert(err.error?.errors?.join(', ') || 'An error occurred while creating the appointment');
      }
    });
  }
}
