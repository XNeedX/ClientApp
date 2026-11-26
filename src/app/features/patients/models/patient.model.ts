export interface CreatePatientDto {
  photoPath: string | null;
  firstName: string;
  lastName: string;
  middleName: string | null;
  phoneNumber: string;
  email: string;
  dateOfBirth: string;
  isEmailVerified: boolean;
  accountId: string;
}

export interface PatientProfileDto {
  photoPath?: string;
  firstName: string;
  lastName: string;
  middleName?: string;
  phoneNumber: string;
  dateOfBirth: string;
}

export interface ExistingProfileDto {
  id: string;
  firstName: string;
  lastName: string;
  middleName?: string;
  dateOfBirth: string;
}

export interface PatientMatchResultDto {
  isMatchFound: boolean;
  message: string;
  existingProfile?: ExistingProfileDto | null;
}
