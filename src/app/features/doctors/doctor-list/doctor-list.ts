import { Component, inject, OnInit, OnDestroy, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule } from '@angular/forms';
import { Subject, of } from 'rxjs';
import { catchError, switchMap, takeUntil, tap } from 'rxjs/operators';

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
  
  private cdr = inject(ChangeDetectorRef); 
  
  private destroy$ = new Subject<void>();
  private searchSubject = new Subject<DoctorFilterDto>();

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

  ngOnDestroy() {
    this.destroy$.next();
    this.destroy$.complete();
  }

  onSearch() {
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
}