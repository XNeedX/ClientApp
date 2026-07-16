export enum Category {
  Analyses = 'Analyses',
  Consultations = 'Consultations',
  Diagnostics = 'Diagnostics'
}

export interface Specialization {
  id: string;          
  status: string | number;    
  name: string;
  price: number;
  category: Category;
}

export interface ClinicService {
  id: string;         
  status: string | number;    
  name: string;
  price: number;
  category: Category;
  specializationId: string;
  specialization: Specialization;
}