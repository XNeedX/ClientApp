import { inject, PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { ActivatedRouteSnapshot, RouterStateSnapshot, CanActivateFn } from '@angular/router';
import { KeycloakService } from 'keycloak-angular';

export const authGuard: CanActivateFn = async (
  route: ActivatedRouteSnapshot,
  state: RouterStateSnapshot
) => {
  const platformId = inject(PLATFORM_ID);

  if (!isPlatformBrowser(platformId)) {
    return true;
  }

  const keycloak = inject(KeycloakService);

  const authenticated = await keycloak.isLoggedIn();

  if (!authenticated) {
    await keycloak.login({
      redirectUri: window.location.origin + state.url
    });
    return false;
  }

  const requiredRoles = route.data['roles'];

  if (!(requiredRoles instanceof Array) || requiredRoles.length === 0) {
    return true;
  }

  const userRoles = keycloak.getUserRoles();
  
  return requiredRoles.some((role) => userRoles.includes(role));
};