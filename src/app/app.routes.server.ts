import { RenderMode, ServerRoute } from '@angular/ssr';

export const serverRoutes: ServerRoute[] = [
  {
    path: 'services',
    renderMode: RenderMode.Client
  },
  {
    path: 'doctors',
    renderMode: RenderMode.Client
  },
  {
    path: 'doctors/:id',
    renderMode: RenderMode.Client
  },
  {
    path: 'onboarding',
    renderMode: RenderMode.Client
  },
  {
    path: 'profile',
    renderMode: RenderMode.Client
  },
  {
    path: '**',
    renderMode: RenderMode.Prerender
  }
];
