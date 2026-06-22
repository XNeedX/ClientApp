import { TestBed } from '@angular/core/testing';
import { App } from './app';
import { provideRouter } from '@angular/router';
import { KeycloakService } from 'keycloak-angular';

describe('App', () => {
  beforeEach(async () => {
    const keycloakMock = {
      isLoggedIn: vi.fn().mockResolvedValue(false),
      getUsername: vi.fn().mockReturnValue(''),
      login: vi.fn(),
      logout: vi.fn()
    };

    await TestBed.configureTestingModule({
      imports: [App],
      providers: [
        provideRouter([]),
        { provide: KeycloakService, useValue: keycloakMock } 
      ]
    }).compileComponents();
  });

  it('should create the app', () => {
    const fixture = TestBed.createComponent(App);
    const app = fixture.componentInstance;
    expect(app).toBeTruthy();
  });

  it('should render title', async () => {
    const fixture = TestBed.createComponent(App);
    await fixture.whenStable();
    fixture.detectChanges(); 
    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.querySelector('.logo')?.textContent).toContain('InnoClinic');
  });
});