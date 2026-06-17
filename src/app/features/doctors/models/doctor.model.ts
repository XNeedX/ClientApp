export interface DoctorCardDto {
  photoPath?: string;
  fullName: string;
  specialization: string;
  experience: number;
  officeAddress: string;
}

export interface DoctorFilterDto {
  searchName?: string;
  specialization?: string;
  officeAddress?: string;
  page: number;
  pageSize: number;
}