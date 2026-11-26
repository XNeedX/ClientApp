import { Component, inject, OnInit, OnDestroy, ChangeDetectorRef, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, AbstractControl, ValidationErrors, ValidatorFn } from '@angular/forms';
import { Subject, of } from 'rxjs';
import { catchError, finalize, switchMap, takeUntil, timeout } from 'rxjs/operators';
import { RouterModule } from '@angular/router';
import { DoctorService } from '../services/doctor.service';
import { DoctorCardDto, DoctorFilterDto } from '../models/doctor.model';
import { SpecializationService } from '../../../core/services/specialization.service'; 
import { OfficeService } from '../../../core/services/office.service';
import { documentImageUrl } from '../../../core/models/document-image';

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
  readonly doctors = signal<DoctorCardDto[]>([]);
  readonly totalCount = signal(0);
  readonly isLoading = signal(false);
  readonly loadFailed = signal(false);

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

    this.searchSubject.pipe(
      switchMap((filter) => {
        this.isLoading.set(true);
        this.loadFailed.set(false);
        return this.doctorService.getDoctors(filter).pipe(
          timeout(12_000),
          catchError(() => of(null)),
          finalize(() => this.isLoading.set(false)),
        );
      }),
      takeUntil(this.destroy$),
    ).subscribe((response) => {
      if (response?.isSuccess && response.data) {
        this.doctors.set(response.data.data);
        this.totalCount.set(response.data.totalCount);
      } else {
        this.loadFailed.set(true);
      }
    });

    this.onSearch();
  }

  getPhotoUrl(photoPath?: string): string {
    return documentImageUrl(photoPath) ?? this.FALLBACK_IMAGE;
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
          this.cdr.markForCheck();
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
          this.cdr.markForCheck();
        } else if (response && response.items) {
          this.allOffices = response.items;
          this.filteredOffices = [...this.allOffices];
          this.cdr.markForCheck();
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

  onImageError(event: Event) {
      const target = event.target as HTMLImageElement;
 
      if (target.src.includes('default-doctor.png')) {
        return;
      }

      target.src = this.FALLBACK_IMAGE;
 }
}
