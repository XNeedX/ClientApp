export interface ApiResponse<T = any> {
  isSuccess: boolean;
  message?: string;
  errors: string[];
  data?: T;
}