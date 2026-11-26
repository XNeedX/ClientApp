import { environment } from '../../../environments/environment';

const DOCUMENT_ID = /^[\da-f]{8}(?:-[\da-f]{4}){3}-[\da-f]{12}$/i;

export function documentImageUrl(path: string | null | undefined): string | null {
  if (!path) return null;
  if (/^https?:\/\//i.test(path)) return path;
  return DOCUMENT_ID.test(path) ? environment.gatewayUrl + '/documents/Documents/' + path : null;
}
