import { CurrencyPipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, DestroyRef, OnInit, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';

import { Category, ServiceCatalog } from '../models/service.model';
import { ClinicServiceService } from '../services/clinic-service.service';

type CategoryState =
  | { status: 'loading' | 'error' }
  | { status: 'loaded'; data: ServiceCatalog };

@Component({
  selector: 'app-services-list',
  standalone: true,
  imports: [CurrencyPipe],
  templateUrl: './services-list.component.html',
  styleUrl: './services-list.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ServicesListComponent implements OnInit {
  private readonly clinicServices = inject(ClinicServiceService);
  private readonly destroyRef = inject(DestroyRef);
  private readonly categories = signal<Partial<Record<Category, CategoryState>>>({});

  protected readonly CategoryEnum = Category;
  protected readonly activeTab = signal(Category.Consultations);
  protected readonly current = computed(() => this.categories()[this.activeTab()]);

  ngOnInit(): void {
    this.load(this.activeTab());
  }

  protected switchTab(tab: Category): void {
    this.activeTab.set(tab);
    if (this.categories()[tab] === undefined) this.load(tab);
  }

  protected retry(): void {
    this.load(this.activeTab());
  }

  private load(category: Category): void {
    this.setCategory(category, { status: 'loading' });
    this.clinicServices.getServicesByCategory(category).pipe(
      takeUntilDestroyed(this.destroyRef),
    ).subscribe({
      next: (data) => this.setCategory(category, { status: 'loaded', data }),
      error: () => this.setCategory(category, { status: 'error' }),
    });
  }

  private setCategory(category: Category, state: CategoryState): void {
    this.categories.update((categories) => ({ ...categories, [category]: state }));
  }
}
