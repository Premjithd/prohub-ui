import { copyFileSync, existsSync, renameSync } from 'fs';
import { join } from 'path';

/**
 * The app loads its API/hub URLs at runtime from public/config.json. For e2e we
 * must point it at the local Test backend (https://localhost:7042) without
 * disturbing the committed config.json (which holds the deployed prod URLs).
 *
 * This swaps config.e2e.json into place for the duration of the run; the
 * companion global-teardown.ts restores the original. The original is preserved
 * in a .orig backup so a crashed run can still be recovered on the next start.
 */
const PUBLIC_CONFIG = join(__dirname, '../public/config.json');
const BACKUP = join(__dirname, '../public/config.json.orig');
const E2E_CONFIG = join(__dirname, 'config.e2e.json');

export default function globalSetup(): void {
  // Recover from a previous crashed run that left the e2e config in place.
  if (existsSync(BACKUP)) {
    renameSync(BACKUP, PUBLIC_CONFIG);
  }
  if (existsSync(PUBLIC_CONFIG)) {
    copyFileSync(PUBLIC_CONFIG, BACKUP);
  }
  copyFileSync(E2E_CONFIG, PUBLIC_CONFIG);
}
