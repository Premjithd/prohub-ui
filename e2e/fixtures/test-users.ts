/**
 * Dedicated e2e accounts. These are created automatically by auth.setup.ts
 * (via the backend registration API) the first time tests run against a
 * database, so no manual seeding is required.
 *
 * Addresses are inside the seeded service area (Thiruvananthapuram, Kerala)
 * so pro registration and job posting pass service-area validation.
 */

export const E2E_ADDRESS = {
  houseNameNumber: '12A',
  street1: 'MG Road',
  street2: '',
  city: 'Thiruvananthapuram',
  district: 'Thiruvananthapuram',
  state: 'Kerala',
  country: 'India',
  zipPostalCode: '695001',
  latitude: 8.5241,
  longitude: 76.9366,
};

export const E2E_USER = {
  firstName: 'E2E',
  lastName: 'User',
  email: 'e2e.user@yprohub.test',
  password: 'E2eTest!123',
  phoneNumber: '+919876500001',
};

export const E2E_PRO = {
  name: 'E2E Pro',
  email: 'e2e.pro@yprohub.test',
  password: 'E2eTest!123',
  phoneNumber: '+919876500002',
  businessName: 'E2E Testing Services',
};

export const USER_STORAGE_STATE = '.auth/user.json';
export const PRO_STORAGE_STATE = '.auth/pro.json';
