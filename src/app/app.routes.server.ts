import { RenderMode, ServerRoute, PrerenderFallback } from '@angular/ssr';

export const serverRoutes: ServerRoute[] = [
  {
    path: 'edit-service/:id',
    renderMode: RenderMode.Prerender,
    fallback: PrerenderFallback.Client,
    getPrerenderParams: () => Promise.resolve([])
  },
  {
    path: 'edit-job/:id',
    renderMode: RenderMode.Prerender,
    fallback: PrerenderFallback.Client,
    getPrerenderParams: () => Promise.resolve([])
  },
  {
    path: '**',
    renderMode: RenderMode.Prerender
  }
];
