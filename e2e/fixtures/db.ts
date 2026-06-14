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
 * Source of the test database connection, in priority order:
 *  1. E2E_SQL_CONNECTION env var — a full connection string (used to point the
 *     suite at a remote/Azure SQL database with SQL auth).
 *  2. The backend's Test-environment connection string (appsettings.Test.json),
 *     for the default local LocalDB run.
 */
interface SqlTarget {
  server: string;
  database: string;
  user?: string;
  password?: string;
}

function readSqlTarget(): SqlTarget {
  let conn = process.env.E2E_SQL_CONNECTION;
  if (!conn) {
    const appsettingsPath = join(
      __dirname,
      '../../../ProHubAPI/ServiceProviderAPI/appsettings.Test.json'
    );
    conn = JSON.parse(readFileSync(appsettingsPath, 'utf8'))?.ConnectionStrings?.DefaultConnection ?? '';
  }
  const get = (keys: string[]): string | undefined => {
    for (const key of keys) {
      const match = new RegExp(`(?:^|;)\\s*${key}\\s*=\\s*([^;]+)`, 'i').exec(conn!);
      if (match) return match[1].trim();
    }
    return undefined;
  };
  const server = get(['Server', 'Data Source']);
  const database = get(['Database', 'Initial Catalog']);
  if (!server || !database) {
    throw new Error(`Could not parse Server/Database from the SQL connection string`);
  }
  return { server, database, user: get(['User ID', 'User Id', 'UID']), password: get(['Password', 'PWD']) };
}

const target = readSqlTarget();

function runSql(query: string): void {
  // SQL auth (Azure) when a user is present, otherwise trusted auth (LocalDB).
  // The password is passed via SQLCMDPASSWORD so it never appears on the command line.
  const env = { ...process.env };
  let authArgs = '';
  if (target.user) {
    authArgs = `-U "${target.user}" -N -C`;
    env.SQLCMDPASSWORD = target.password ?? '';
  }
  execSync(`sqlcmd -S "${target.server}" -d "${target.database}" ${authArgs} -Q "${query.replace(/"/g, '\\"')}"`, {
    stdio: 'pipe',
    env,
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
 * Stages a Pending payment row for a job (as POST /payments/create-order would,
 * but without calling Razorpay). A subsequent payment.captured webhook then
 * completes it — letting e2e tests exercise the real "payment received" path.
 */
export function stagePendingPayment(opts: {
  jobId: number; bidId: number; userId: number; principal: number; orderId: string;
}): void {
  const { jobId, bidId, userId, principal, orderId } = opts;
  // SET QUOTED_IDENTIFIER ON: required for DML on tables with filtered indexes.
  runSql(
    `SET QUOTED_IDENTIFIER ON; INSERT INTO Payments ` +
    `(JobId, BidId, UserId, PrincipalAmount, Amount, PlatformFee, ProPayout, RazorpayOrderId, ProviderId, Status, CreatedAt) ` +
    `VALUES (${jobId}, ${bidId}, ${userId}, ${principal}, ${principal}, 0, ${principal}, '${orderId}', 'razorpay', 'Pending', GETUTCDATE())`
  );
}

/**
 * Promotes the e2e admin account to the Admin role. Admin accounts are
 * normally created via the invite flow (email link) — for e2e the account is
 * registered as a regular user and the role is flipped directly.
 */
export function promoteE2eAdmin(): void {
  runSql(`UPDATE Users SET UserType = 'Admin', IsEmailVerified = 1 WHERE Email = '${E2E_ADMIN.email}'`);
}
