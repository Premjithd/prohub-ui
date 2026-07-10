/**
 * Maps an HTTP error to a user-friendly message.
 *
 * When a request never reaches the server (status 0 — server down, no network,
 * CORS), Angular's fetch backend puts a raw browser TypeError in `error.error`
 * whose message is the literal "Failed to fetch" — never surface that to users.
 */
export function getHttpErrorMessage(error: any, fallback: string): string {
  if (error?.status === 0) {
    return 'Unable to reach the server. Please check your internet connection and try again.';
  }
  const body = error?.error;
  if (body && typeof body === 'object' && !(body instanceof Error)) {
    const message = body.message ?? body.error;
    if (typeof message === 'string' && message) {
      return message;
    }
  }
  return fallback;
}
