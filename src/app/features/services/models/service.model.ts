export interface ViewSpecializationServiceDto {
  id: string;
  name: string;
  price: number;
  status: string;
  category: string;
}

export interface ViewSpecializationDto {
  id: string;
  name: string;
  status: string;
  services: ViewSpecializationServiceDto[];
}

export interface ViewCategoryDataDto {
  specializations: ViewSpecializationDto[];
  services: ViewSpecializationServiceDto[];
}