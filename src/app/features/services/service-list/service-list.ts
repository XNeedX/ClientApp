import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ClinicService } from '../services/clinic.service';
import { ViewCategoryDataDto } from '../models/service.model';

type TabType = 'Consultations' | 'Diagnostics' | 'Analyses';

@Component({
  selector: 'app-service-list',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './service-list.html',
  styleUrl: './service-list.css'
})
export class ServiceList implements OnInit {
  private clinicService = inject(ClinicService);

  activeTab: TabType = 'Consultations';
  isLoading = false;
  categoryData: ViewCategoryDataDto | null = null;

  ngOnInit() {
    this.loadServices(this.activeTab);
  }

  setTab(tab: TabType) {
    if (this.activeTab === tab) return;
    this.activeTab = tab;
    this.loadServices(tab);
  }

  private loadServices(category: TabType) {
    this.isLoading = true;
    this.categoryData = null;

    this.clinicService.getServicesByCategory(category).subscribe({
      next: (response) => {
        if (response.isSuccess && response.data) {
          this.categoryData = response.data;
        }
        this.isLoading = false;
      },
      error: (err) => {
        console.error('Failed to load services', err);
        this.isLoading = false;
      }
    });
  }
}