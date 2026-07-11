import { Injectable, signal } from '@angular/core';

@Injectable({
  providedIn: 'root'
})
export class AppointmentModalService {
  private isOpenSignal = signal<boolean>(false);

  public get isOpen() {
    return this.isOpenSignal.asReadonly();
  }

  open(): void {
    this.isOpenSignal.set(true);
  }

  close(): void {
    this.isOpenSignal.set(false);
  }
}
