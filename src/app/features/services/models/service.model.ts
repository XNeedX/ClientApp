export enum Category {
  Analyses = 'Analyses',
  Consultations = 'Consultations',
  Diagnostics = 'Diagnostics',
}

export interface CatalogService {
  id: string;
  status: string | number;
  name: string;
  price: number;
}

export interface Specialization {
  id: string;
  status: string | number;
  name: string;
  price: number;
  category: Category;
}

export interface ClinicService extends CatalogService {
  category: Category;
  specializationId: string;
  specialization: Specialization;
}

export interface ServiceGroup {
  id: string;
  name: string;
  status: string | number;
  services: CatalogService[];
}

export interface ServiceCatalog {
  specializations: ServiceGroup[];
  services: CatalogService[];
}
