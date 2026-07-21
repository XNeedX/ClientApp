export enum Status {
  Active = 0,
  Inactive = 1
}

export enum ServiceCategory {
  Analyses = 0,
  Consultations = 1,
  Diagnostics = 2
}

export interface Office {
  id: string;
  status: Status;
  address: string;
}

export interface Doctor {
  id: string;
  firstName: string;
  lastName: string;
  middleName?: string | null;
  specialization: string; 
  status: Status; 
}

export interface TimeSlotUi {
  time: string; 
  fullDateTime: string;
  isAvailable: boolean;
}

export interface CreateAppointmentCommand {
  serviceId: string;
  doctorId: string;
  officeId: string;
  patientId?: string; 
  date: string; 
  timeSlot: string;
}