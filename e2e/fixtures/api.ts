import { APIRequestContext, expect } from '@playwright/test';
import { E2E_ADDRESS, E2E_PRO, E2E_USER } from './test-users';

// Must match apiUrl in prohub-ui/src/environments/environment.ts
export const API_URL = 'https://localhost:7042/api';

/** Fails fast with a clear message if the backend is not running. */
export async function assertBackendUp(request: APIRequestContext): Promise<void> {
  try {
    // Any response (even 401/404) proves the server is listening
    await request.get(`${API_URL}/services`, { timeout: 5_000 });
  } catch {
    throw new Error(
      `Backend API is not reachable at ${API_URL}.\n` +
      'Start it first: cd ProHubAPI/ServiceProviderAPI && dotnet watch run\n' +
      '(it must listen on https://localhost:7042 — the default launch profile)'
    );
  }
}

/** Creates the e2e consumer account if it doesn't exist yet. Idempotent. */
export async function ensureUserAccount(request: APIRequestContext): Promise<void> {
  const draft = await request.post(`${API_URL}/auth/user/register/draft`, {
    data: {
      firstName: E2E_USER.firstName,
      lastName: E2E_USER.lastName,
      email: E2E_USER.email,
      password: E2E_USER.password,
      phoneNumber: E2E_USER.phoneNumber,
    },
  });

  if (draft.status() === 400) return; // already registered — nothing to do
  expect(draft.ok(), `user draft registration failed: ${await draft.text()}`).toBe(true);

  const { userId } = await draft.json();
  const complete = await request.post(`${API_URL}/auth/user/register/complete/${userId}`, {
    data: { ...E2E_ADDRESS },
  });
  expect(complete.ok(), `user registration step 2 failed: ${await complete.text()}`).toBe(true);
}

/** Creates the e2e pro account if it doesn't exist yet. Idempotent. */
export async function ensureProAccount(request: APIRequestContext): Promise<void> {
  const draft = await request.post(`${API_URL}/auth/pro/register/draft`, {
    data: {
      name: E2E_PRO.name,
      email: E2E_PRO.email,
      password: E2E_PRO.password,
      phoneNumber: E2E_PRO.phoneNumber,
      businessName: E2E_PRO.businessName,
    },
  });

  if (draft.status() === 400) return; // already registered
  expect(draft.ok(), `pro draft registration failed: ${await draft.text()}`).toBe(true);

  const { proId } = await draft.json();
  const complete = await request.post(`${API_URL}/auth/pro/register/complete/${proId}`, {
    data: { ...E2E_ADDRESS },
  });
  expect(complete.ok(), `pro registration step 2 failed: ${await complete.text()}`).toBe(true);
}

// Sessions cached per worker process — tests in the same file reuse them
const sessionCache = new Map<string, { token: string; id: number }>();

/** Logs in via the API and returns token + account id — for test data setup. */
export async function apiLoginWithId(
  request: APIRequestContext,
  role: 'user' | 'pro'
): Promise<{ token: string; id: number }> {
  const cached = sessionCache.get(role);
  if (cached) return cached;

  const creds = role === 'user' ? E2E_USER : E2E_PRO;
  const res = await request.post(`${API_URL}/auth/${role}/login`, {
    data: { email: creds.email, password: creds.password },
  });
  expect(res.ok(), `${role} API login failed: ${await res.text()}`).toBe(true);
  const body = await res.json();
  const session = { token: body.token, id: body.id };
  sessionCache.set(role, session);
  return session;
}

/** Logs in via the API and returns the JWT — for API-based test data setup. */
export async function apiLogin(
  request: APIRequestContext,
  role: 'user' | 'pro'
): Promise<string> {
  return (await apiLoginWithId(request, role)).token;
}

const auth = (token: string) => ({ Authorization: `Bearer ${token}` });

export interface E2eJob {
  id: number;
  title: string;
  status: string;
}

/**
 * Creates an Open job owned by the e2e user. The service address is inside
 * the seeded service area so it passes validation. Title should be unique
 * per test (e.g. include Date.now()) so tests can find their own job.
 */
export async function apiCreateJob(
  request: APIRequestContext,
  userToken: string,
  title: string
): Promise<E2eJob> {
  const res = await request.post(`${API_URL}/jobs`, {
    headers: auth(userToken),
    data: {
      title,
      description: 'Automated e2e test job. Safe to delete. Created by the Playwright suite.',
      serviceAddressHouse: E2E_ADDRESS.houseNameNumber,
      serviceAddressStreet1: E2E_ADDRESS.street1,
      serviceAddressCity: E2E_ADDRESS.city,
      serviceAddressDistrict: E2E_ADDRESS.district,
      serviceAddressState: E2E_ADDRESS.state,
      serviceAddressCountry: E2E_ADDRESS.country,
      serviceAddressPIN: E2E_ADDRESS.zipPostalCode,
      contactPersonName: `${E2E_USER.firstName} ${E2E_USER.lastName}`,
      contactPersonPhone: E2E_USER.phoneNumber,
      estimatedBudget: 2500,
      timeline: '1-week',
      latitude: E2E_ADDRESS.latitude,
      longitude: E2E_ADDRESS.longitude,
    },
  });
  expect(res.ok(), `job creation failed: ${await res.text()}`).toBe(true);
  return res.json();
}

/** Submits a bid on a job as the e2e pro. Returns the created bid. */
export async function apiSubmitBid(
  request: APIRequestContext,
  proToken: string,
  jobId: number,
  amount = 1800,
  message = 'E2E test bid — I can do this job.'
): Promise<{ id: number }> {
  const res = await request.post(`${API_URL}/jobs/${jobId}/bid`, {
    headers: auth(proToken),
    // CreateJobBidRequest uses JsonPropertyName: quotedPrice / message
    data: { quotedPrice: amount, message },
  });
  expect(res.ok(), `bid submission failed: ${await res.text()}`).toBe(true);
  return res.json();
}

/** Accepts a bid as the e2e user (job → 'Bid Accepted', pro assigned). */
export async function apiAcceptBid(
  request: APIRequestContext,
  userToken: string,
  jobId: number,
  bidId: number
): Promise<void> {
  const res = await request.post(`${API_URL}/jobs/${jobId}/bids/${bidId}/accept`, {
    headers: auth(userToken),
  });
  expect(res.ok(), `bid acceptance failed: ${await res.text()}`).toBe(true);
}

export interface E2ePhase {
  id: string;
  title: string;
  description?: string;
  isCompleted: boolean;
  completedAt?: string | null;
}

/** Sets the work phases on a job (owner or assigned pro). */
export async function apiSetJobPhases(
  request: APIRequestContext,
  token: string,
  jobId: number,
  phases: E2ePhase[]
): Promise<void> {
  const res = await request.put(`${API_URL}/jobs/${jobId}/phases`, {
    headers: auth(token),
    data: { jobPhases: phases },
  });
  expect(res.ok(), `setting job phases failed: ${await res.text()}`).toBe(true);
}

/**
 * Sends a direct message. senderType is the SENDER's role; the backend infers
 * the recipient type (User↔Pro) and creates the conversation if needed.
 */
export async function apiSendMessage(
  request: APIRequestContext,
  senderToken: string,
  senderType: 'User' | 'Pro',
  recipientId: number,
  content: string
): Promise<void> {
  const res = await request.post(`${API_URL}/messages/send`, {
    headers: auth(senderToken),
    data: { content, recipientId, senderType },
  });
  expect(res.ok(), `sending message failed: ${await res.text()}`).toBe(true);
}

/** Toggles completion of one phase (the "work update" action). */
export async function apiTogglePhase(
  request: APIRequestContext,
  token: string,
  jobId: number,
  phaseId: string
): Promise<void> {
  const res = await request.post(`${API_URL}/jobs/${jobId}/phases/${phaseId}/toggle`, {
    headers: auth(token),
  });
  expect(res.ok(), `toggling phase failed: ${await res.text()}`).toBe(true);
}
