import { Component, inject, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule } from '@angular/forms';
import { Subject, takeUntil } from 'rxjs';

import { DoctorService } from '../services/doctor.service';
import { DoctorCardDto, DoctorFilterDto } from '../models/doctor.model';

@Component({
  selector: 'app-doctor-list',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './doctor-list.html',
  styleUrl: './doctor-list.css',
})
export class DoctorList implements OnInit, OnDestroy {
  private fb = inject(FormBuilder);
  private doctorService = inject(DoctorService);
  private destroy$ = new Subject<void>();

  filterForm!: FormGroup;
  doctors: DoctorCardDto[] = [];
  totalCount = 0;
  isLoading = false;

  ngOnInit() {
    this.filterForm = this.fb.group({
      searchName: [''],
      specialization: [''],
      officeAddress: ['']
    });

    this.loadDoctors();
  }

  ngOnDestroy() {
    this.destroy$.next();
    this.destroy$.complete();
  }

  onSearch() {
    this.loadDoctors();
  }

  private loadDoctors() {
    this.isLoading = true;
    const formValues = this.filterForm.value;
    
    const filter: DoctorFilterDto = {
      searchName: formValues.searchName,
      specialization: formValues.specialization,
      officeAddress: formValues.officeAddress,
      page: 1,
      pageSize: 10
    };
    
    this.doctorService.getDoctors(filter)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response) => {
          if (response.isSuccess && response.data) {
            this.doctors = response.data.data;
            this.totalCount = response.data.totalCount;
          }
          this.isLoading = false;
        },
        error: (err) => {
          console.error('Error loading doctors list:', err);
          this.isLoading = false;
        }
      });
  }

  openMap() {
    console.log('Opening map with offices...');
  }
}