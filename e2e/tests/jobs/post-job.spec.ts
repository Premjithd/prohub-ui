import { test, expect } from '../../fixtures/session';
import { PostJobPage } from '../../pages/post-job.page';
import { USER_STORAGE_STATE } from '../../fixtures/test-users';

test.describe('Post a job — wizard', () => {
  test.use({ storageState: USER_STORAGE_STATE });

  test('renders step 1 with categories loaded from the API', async ({ page }) => {
    const postJob = new PostJobPage(page);
    await postJob.goto();

    await postJob.expectStep(1);
    await expect(postJob.titleInput).toBeVisible();
    await expect(postJob.categoryButtons.first()).toBeVisible({ timeout: 15_000 });
  });

  test('Next is blocked until step 1 is valid', async ({ page }) => {
    const postJob = new PostJobPage(page);
    await postJob.goto();

    await postJob.nextButton.click();
    await postJob.expectStep(1); // still on step 1
    await expect(postJob.errorTexts.first()).toBeVisible();
  });

  test('valid step 1 advances to step 2 and Back returns', async ({ page }) => {
    const postJob = new PostJobPage(page);
    await postJob.goto();

    await postJob.fillStep1(
      'E2E test job — fix kitchen sink',
      'This is an automated e2e test job description with enough detail to pass validation.'
    );
    await postJob.nextButton.click();
    await postJob.expectStep(2);

    await postJob.backButton.click();
    await postJob.expectStep(1);
    // Step 1 data is retained
    await expect(postJob.titleInput).toHaveValue('E2E test job — fix kitchen sink');
  });
});
