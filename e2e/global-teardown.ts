import { existsSync, renameSync } from 'fs';
import { join } from 'path';

/** Restores the committed public/config.json that global-setup.ts swapped out. */
const PUBLIC_CONFIG = join(__dirname, '../public/config.json');
const BACKUP = join(__dirname, '../public/config.json.orig');

export default function globalTeardown(): void {
  if (process.env.E2E_BASE_URL) {
    return;
  }
  if (existsSync(BACKUP)) {
    renameSync(BACKUP, PUBLIC_CONFIG);
  }
}
