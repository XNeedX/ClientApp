import { Component, inject, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ClinicServiceService } from '../services/clinic-service.service';
import { ClinicService, Category } from '../models/service.model';

@Component({
  selector: 'app-services-list',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './services-list.component.html',
  styleUrls: ['./services-list.component.css']
})
export class ServicesListComponent implements OnInit {
  private clinicServiceService = inject(ClinicServiceService);
  private cdr = inject(ChangeDetectorRef); 

  public CategoryEnum = Category;
  activeTab: Category = Category.Consultations; 

  consultations: { [key: string]: ClinicService[] } = {};
  diagnostics: ClinicService[] = [];
  analyses: ClinicService[] = [];

  private loadedCategories: Set<Category> = new Set();

  ngOnInit() {
    this.loadDataForTab(this.activeTab);
  }

  switchTab(tab: Category) {
    this.activeTab = tab;
    if (!this.loadedCategories.has(tab)) {
      this.loadDataForTab(tab);
    }
  }

  private loadDataForTab(category: Category) {
    this.clinicServiceService.getServicesByCategory(category).subscribe({
      next: (services: ClinicService[]) => {
        if (category === Category.Consultations) {
          const activeConsultations = services.filter(s => s.specialization?.status === 'Active');
          
          this.consultations = activeConsultations.reduce((acc: { [key: string]: ClinicService[] }, curr: ClinicService) => {
            const specName = curr.specialization?.name || 'Uncategorized';
            if (!acc[specName]) {
              acc[specName] = [];
            }
            acc[specName].push(curr);
            return acc;
          }, {});

        } else if (category === Category.Diagnostics) {
          this.diagnostics = services;
        } else if (category === Category.Analyses) {
          this.analyses = services;
        }

        this.loadedCategories.add(category);
        this.cdr.detectChanges(); 
      },
      error: (err: unknown) => {
        console.error(`Error fetching services for category ${category}`, err);
      }
    });
  }
}