export interface Office {
  id: string;
  address: string;
}

export interface BookingDoctor {
  id: string;
  fullName: string;
  specializationId: string;
  officeId: string;
}

export interface BookingService {
  id: string;
  name: string;
  specializationId: string;
}

export interface BookingSpecialization {
  id: string;
  name: string;
}

export interface BookingCatalogs {
  doctors: BookingDoctor[];
  offices: Office[];
  services: BookingService[];
  specializations: BookingSpecialization[];
}

export interface CreateAppointmentCommand {
  serviceId: string;
  doctorId: string;
  officeId: string;
  date: string;
  timeSlot: string;
}

export interface AppointmentHistoryItem {
  appointmentId: string;
  date: string;
  startTime: string;
  endTime: string;
  doctorFullName: string;
  serviceName: string;
  resultId: string | null;
}

export interface AppointmentResult {
  complaints: string;
  conclusion: string;
  recommendations: string;
}
