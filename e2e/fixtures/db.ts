import { execSync } from 'child_process';
import { readFileSync } from 'fs';
import { join } from 'path';
import { E2E_ADMIN, E2E_PRO, E2E_USER } from './test-users';

/**
 * Direct LocalDB access for test staging that has no API:
 *  - marking the e2e accounts email-verified (posting jobs / bidding require it,
 *    and the verification code is only delivered by email)
 *  - forcing a job status that normally needs a real Razorpay payment
 *
 * Local-dev only: requires sqlcmd and the (localdb)\mssqllocaldb instance the
 * backend uses.
 */

/**
 * Single source of truth for the test database: the backend's Test-environment
 * connection string (appsettings.Test.json). Run the backend with
 * ASPNETCORE_ENVIRONMENT=Test so the API and this staging code share one DB.
 */
function readTestConnection(): { server: string; database: string } {
  const appsettingsPath = join(
    __dirname,
    '../../../ProHubAPI/ServiceProviderAPI/appsettings.Test.json'
  );
  const config = JSON.parse(readFileSync(appsettingsPath, 'utf8'));
  const conn: string = config?.ConnectionStrings?.DefaultConnection ?? '';
  const server = /Server=([^;]+)/i.exec(conn)?.[1];
  const database = /Database=([^;]+)/i.exec(conn)?.[1];
  if (!server || !database) {
    throw new Error(`Could not parse Server/Database from appsettings.Test.json: "${conn}"`);
  }
  return { server, database };
}

const { server: SQL_SERVER, database: SQL_DB } = readTestConnection();

function runSql(query: string): void {
  execSync(`sqlcmd -S "${SQL_SERVER}" -d ${SQL_DB} -Q "${query.replace(/"/g, '\\"')}"`, {
    stdio: 'pipe',
  });
}

/** Marks both e2e accounts as email-verified so they can post jobs and bid. */
export function verifyE2eEmails(): void {
  runSql(`UPDATE Users SET IsEmailVerified = 1 WHERE Email = '${E2E_USER.email}'`);
  runSql(`UPDATE Pros SET IsEmailVerified = 1 WHERE Email = '${E2E_PRO.email}'`);
}

/**
 * Forces a job into a given status. Used to stage states that the API only
 * reaches through a real payment (e.g. 'In Progress' for work-update tests).
 */
export function setJobStatus(jobId: number, status: string): void {
  runSql(`UPDATE Jobs SET Status = '${status}' WHERE Id = ${jobId}`);
}

/**
 * Promotes the e2e admin account to the Admin role. Admin accounts are
 * normally created via the invite flow (email link) — for e2e the account is
 * registered as a regular user and the role is flipped directly.
 */
export function promoteE2eAdmin(): void {
  runSql(`UPDATE Users SET UserType = 'Admin', IsEmailVerified = 1 WHERE Email = '${E2E_ADMIN.email}'`);
}
