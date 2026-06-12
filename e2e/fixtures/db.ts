import { execSync } from 'child_process';
import { E2E_PRO, E2E_USER } from './test-users';

/**
 * Direct LocalDB access for test staging that has no API:
 *  - marking the e2e accounts email-verified (posting jobs / bidding require it,
 *    and the verification code is only delivered by email)
 *  - forcing a job status that normally needs a real Razorpay payment
 *
 * Local-dev only: requires sqlcmd and the (localdb)\mssqllocaldb instance the
 * backend uses.
 */

const SQL_SERVER = '(localdb)\\mssqllocaldb';
const SQL_DB = 'ProhubDB';

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
