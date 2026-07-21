import { ComponentFixture, TestBed } from '@angular/core/testing';
import { SignUpModalComponent } from './sign-up-modal';
import { ReactiveFormsModule } from '@angular/forms';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting, HttpTestingController } from '@angular/common/http/testing';
import { By } from '@angular/platform-browser';

describe('SignUpModalComponent', () => {
  let component: SignUpModalComponent;
  let fixture: ComponentFixture<SignUpModalComponent>;
  let httpTestingController: HttpTestingController;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [SignUpModalComponent, ReactiveFormsModule],
      providers: [provideHttpClient(), provideHttpClientTesting()]
    }).compileComponents();

    fixture = TestBed.createComponent(SignUpModalComponent);
    component = fixture.componentInstance;
    httpTestingController = TestBed.inject(HttpTestingController);
    fixture.detectChanges();
  });

  afterEach(() => {
    httpTestingController.verify();
  });

  it('должен создать компонент', () => {
    expect(component).toBeTruthy();
  });

  describe('Валидация формы (Form Validation)', () => {
    it('форма должна быть невалидной при инициализации (все поля пустые)', () => {
      expect(component.signUpForm.invalid).toBe(true);
    });

    it('F-1: должен выдавать ошибку при неверном формате email', () => {
      const emailControl = component.signUpForm.controls['email'];
      
      emailControl.setValue('invalid-email');
      expect(emailControl.hasError('email')).toBe(true);
      
      emailControl.setValue('test@test.com');
      expect(emailControl.hasError('email')).toBe(false);
    });

    it('F-2: пароль должен быть от 6 до 15 символов', () => {
      const passwordControl = component.signUpForm.controls['password'];
      
      passwordControl.setValue('12345'); // < 6
      expect(passwordControl.hasError('minlength')).toBe(true);
      
      passwordControl.setValue('1234567890123456'); // > 15
      expect(passwordControl.hasError('maxlength')).toBe(true);

      passwordControl.setValue('ValidPass1!');
      expect(passwordControl.valid).toBe(true);
    });

    it('AC-4, F-3: пароли должны совпадать', () => {
      const passwordControl = component.signUpForm.controls['password'];
      const confirmPasswordControl = component.signUpForm.controls['confirmPassword'];

      passwordControl.setValue('Password123');
      confirmPasswordControl.setValue('Password124'); 
      
      component.signUpForm.updateValueAndValidity();

      expect(confirmPasswordControl.hasError('passwordMismatch')).toBe(true);

      confirmPasswordControl.setValue('Password123'); 
      expect(confirmPasswordControl.hasError('passwordMismatch')).toBe(false);
    });
  });

  describe('UI и взаимодействие (UI Interactions)', () => {
    it('AC-7: кнопка Sign up должна быть заблокирована (disabled) при невалидной форме', () => {
      const submitButton = fixture.debugElement.query(By.css('button[type="submit"]')).nativeElement;
      expect(submitButton.disabled).toBe(true);

      component.signUpForm.patchValue({
        email: 'test@test.com',
        password: 'Password123',
        confirmPassword: 'Password123'
      });
      fixture.detectChanges();

      expect(submitButton.disabled).toBe(false);
    });

    it('AC-8: клик по кнопке "X" должен вызывать событие close', () => {
      vi.spyOn(component.close, 'emit'); 
      
      const closeButton = fixture.debugElement.query(By.css('.close-btn')).nativeElement;
      closeButton.click();

      expect(component.close.emit).toHaveBeenCalled();
    });

    it('AC-6: клик по ссылке "Sign in" должен вызывать событие switchToSignIn', () => {
      vi.spyOn(component.switchToSignIn, 'emit');
      
      const signInLink = fixture.debugElement.query(By.css('.footer-link a')).nativeElement;
      signInLink.click();

      expect(component.switchToSignIn.emit).toHaveBeenCalled();
    });
  });

  describe('Отправка формы (Submission)', () => {
    it('AC-5: должен отправлять POST запрос при сабмите валидной формы', () => {
      component.signUpForm.patchValue({
        email: 'test@test.com',
        password: 'Password123',
        confirmPassword: 'Password123'
      });

      component.onSubmit();

      const req = httpTestingController.expectOne('https://localhost:5001/auth/signup');
      expect(req.request.method).toBe('POST');
      expect(req.request.body).toEqual({
        email: 'test@test.com',
        password: 'Password123'
      });

      req.flush({ isSuccess: true, errors: [] });
      
      expect(component.isSubmitting).toBe(false);
    });
  });
});