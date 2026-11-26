import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { of } from 'rxjs';

import { OfficeService } from '../../../core/services/office.service';
import { SpecializationService } from '../../../core/services/specialization.service';
import { DoctorService } from '../services/doctor.service';

import { DoctorList } from './doctor-list';

describe('DoctorList', () => {
  let component: DoctorList;
  let fixture: ComponentFixture<DoctorList>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [DoctorList],
      providers: [
        provideRouter([]),
        { provide: OfficeService, useValue: { getOffices: () => of({ items: [] }) } },
        {
          provide: SpecializationService,
          useValue: { getSpecializations: () => of({ data: { items: [] } }) },
        },
        {
          provide: DoctorService,
          useValue: {
            getDoctors: () => of({
              isSuccess: true,
              data: {
                totalCount: 1,
                data: [{ id: 'sample', fullName: 'Sample Doctor', specialization: 'Cardiology', experience: 6, officeAddress: 'Demo Clinic' }],
              },
            }),
          },
        },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(DoctorList);
    component = fixture.componentInstance;
    fixture.detectChanges();
    await fixture.whenStable();
  });

  it('shows the search result and its profile link', () => {
    expect(component.isLoading()).toBe(false);
    const link = (fixture.nativeElement as HTMLElement).querySelector(
      'a[aria-label="View doctor Sample Doctor"]',
    );
    expect(link?.getAttribute('href')).toBe('/doctors/sample');
  });
});
