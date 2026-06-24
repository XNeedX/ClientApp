import { Component, inject, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule } from '@angular/forms';
import { Subject, takeUntil, debounceTime, distinctUntilChanged, switchMap, startWith } from 'rxjs';

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

    this.filterForm.valueChanges.pipe(
      startWith(this.filterForm.value), 
      debounceTime(400), 
      distinctUntilChanged((prev, curr) => JSON.stringify(prev) === JSON.stringify(curr)),
      switchMap(formValues => {
        this.isLoading = true;
        
        const filter: DoctorFilterDto = {
          searchName: formValues.searchName,
          specialization: formValues.specialization,
          officeAddress: formValues.officeAddress,
          page: 1,
          pageSize: 10
        };
        
        return this.doctorService.getDoctors(filter);
      }),
      takeUntil(this.destroy$)
    ).subscribe({
      next: (response) => {
        if (response.isSuccess && response.data) {
          this.doctors = response.data.data;
          this.totalCount = response.data.totalCount;
        }
        this.isLoading = false;
      },
      error: (err) => {
        console.error('Ошибка при загрузке списка врачей:', err);
        this.isLoading = false;
      }
    });
  }

  ngOnDestroy() {
    this.destroy$.next();
    this.destroy$.complete();
  }

  openMap() {
    console.log('Открытие карты с офисами...');
  }
}