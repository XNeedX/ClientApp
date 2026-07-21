import { Component, inject, OnInit, OnDestroy, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, AbstractControl, ValidationErrors, ValidatorFn } from '@angular/forms';
import { Subject, of } from 'rxjs';
import { catchError, switchMap, takeUntil, tap } from 'rxjs/operators';
import { RouterModule } from '@angular/router';
import { DoctorService } from '../services/doctor.service';
import { DoctorCardDto, DoctorFilterDto } from '../models/doctor.model';
import { SpecializationService } from '../../../core/services/specialization.service'; 
import { OfficeService } from '../../../core/services/office.service';
import { environment } from '../../../../environments/environment';

@Component({
  selector: 'app-doctor-list',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterModule],
  templateUrl: './doctor-list.html',
  styleUrl: './doctor-list.css',
})
export class DoctorList implements OnInit, OnDestroy {
  private fb = inject(FormBuilder);
  private cdr = inject(ChangeDetectorRef); 
  
  private doctorService = inject(DoctorService);
  private specializationService = inject(SpecializationService);
  private officeService = inject(OfficeService);

  private destroy$ = new Subject<void>();
  private searchSubject = new Subject<DoctorFilterDto>();

  private readonly FALLBACK_IMAGE = 'assets/images/default-doctor.png';

  filterForm!: FormGroup;
  doctors: DoctorCardDto[] = [];
  totalCount = 0;
  isLoading = false;

  allSpecializations: string[] = [];
  filteredSpecializations: string[] = [];
  
  allOffices: any[] = []; 
  filteredOffices: any[] = [];

  ngOnInit() {
    this.filterForm = this.fb.group({
      searchName: [''],
      specialization: ['', [this.specializationValidator()]],
      officeAddress: ['']
    });

    this.loadSpecializations();
    this.loadOffices();

    this.filterForm.get('specialization')?.valueChanges.pipe(
      takeUntil(this.destroy$)
    ).subscribe(spec => {
      if (spec && this.doctors.length > 0) {
        const specOffices = this.doctors
          .filter(d => d.specialization === spec)
          .map(d => d.officeAddress);
        
        const uniqueOffices = [...new Set(specOffices)];
        
        this.filteredOffices = this.allOffices.filter(o => 
          uniqueOffices.includes(o.fullAddress)
        );
      } else {
        this.filteredOffices = [...this.allOffices];
      }
    });

    this.filterForm.get('specialization')?.valueChanges.pipe(
      takeUntil(this.destroy$)
    ).subscribe(spec => {
      if (spec && this.doctors.length > 0) {
        const specOffices = this.doctors
          .filter(d => d.specialization === spec)
          .map(d => d.officeAddress);
        
        const uniqueOffices = [...new Set(specOffices)];
        
        this.filteredOffices = this.allOffices.filter(o => 
          uniqueOffices.includes(o.address || o)
        );
      } else {
        this.filteredOffices = [...this.allOffices];
      }
    });

    this.searchSubject.pipe(
      takeUntil(this.destroy$),
      tap(() => {
        this.isLoading = true;
        this.doctors = [];
        this.totalCount = 0;
        this.cdr.detectChanges(); 
      }),
      switchMap((filter) => 
        this.doctorService.getDoctors(filter).pipe(
          catchError((err) => {
            console.error('Error loading doctors list:', err);
            return of(null);
          })
        )
      )
    ).subscribe((response) => {
      if (response && response.isSuccess && response.data) {
        this.doctors = response.data.data;
        this.totalCount = response.data.totalCount;
      }
      this.isLoading = false;
      this.cdr.detectChanges(); 
    });

    this.onSearch();
  }

getPhotoUrl(photoPath?: string): string {
    if (!photoPath || photoPath === 'string') {
      return this.FALLBACK_IMAGE;
    }
    
    return photoPath;
  }

  ngOnDestroy() {
    this.destroy$.next();
    this.destroy$.complete();
  }

  loadSpecializations() {
    this.specializationService.getSpecializations().pipe(takeUntil(this.destroy$)).subscribe({
      next: (response: any) => {
        if (response && response.data && response.data.items) {
          this.allSpecializations = response.data.items.map((s: any) => s.name);
          this.filteredSpecializations = [...this.allSpecializations];
          this.filterForm.get('specialization')?.updateValueAndValidity();
          this.cdr.detectChanges(); 
        }
      },
      error: (err) => console.error('Error fetching specializations:', err)
    });
  }

  loadOffices() {
    this.officeService.getOffices().pipe(takeUntil(this.destroy$)).subscribe({
      next: (response: any) => { 
        if (response && response.data && response.data.items) {
          this.allOffices = response.data.items;
          this.filteredOffices = [...this.allOffices];
          this.cdr.detectChanges();
        } else if (response && response.items) {
          this.allOffices = response.items;
          this.filteredOffices = [...this.allOffices];
          this.cdr.detectChanges();
        }
      },
      error: (err) => console.error('Error fetching offices:', err)
    });
  }

  specializationValidator(): ValidatorFn {
    return (control: AbstractControl): ValidationErrors | null => {
      const value = control.value;
      if (!value) return null;
      
      const isValid = this.filteredSpecializations.includes(value);
      return isValid ? null : { invalidSpecialization: true };
    };
  }

  onSpecializationBlur() {
    this.filterForm.get('specialization')?.markAsTouched();
  }

  onSearch() {
    if (this.filterForm.invalid) {
      this.filterForm.markAllAsTouched();
      return; 
    }

    const formValues = this.filterForm.value;

    const filter: DoctorFilterDto = {
      searchName: formValues.searchName,
      specialization: formValues.specialization,
      officeAddress: formValues.officeAddress,
      page: 1,
      pageSize: 10
    };

    this.searchSubject.next(filter);
  }

  openMap() {
    console.log('Opening map with offices...');
  }

  onImageError(event: Event) {
      const target = event.target as HTMLImageElement;
 
      if (target.src.includes('default-doctor.png')) {
        return;
      }

      target.src = this.FALLBACK_IMAGE;
 }
}