import { environment } from '../../../environments/environment';

/**
 * Loads runtime configuration from /config.json and applies it over the
 * compile-time `environment` object before the app bootstraps.
 *
 * This lets the deployed API/hub URLs be changed on the server (edit
 * wwwroot/config.json on the App Service) without rebuilding the bundle.
 * The values baked into environment.ts act only as a fallback if the
 * config file is missing or unreachable.
 */
export async function loadRuntimeConfig(): Promise<void> {
  try {
    const response = await fetch('config.json', { cache: 'no-cache' });
    if (!response.ok) {
      console.warn(`config.json returned HTTP ${response.status}; using built-in defaults`);
      return;
    }
    const config = await response.json();
    if (config?.apiUrl) {
      environment.apiUrl = config.apiUrl;
    }
    if (config?.hubUrl) {
      (environment as { hubUrl?: string }).hubUrl = config.hubUrl;
    }
  } catch (err) {
    console.warn('Failed to load config.json; using built-in defaults', err);
  }
}
