import { test, expect } from '../../fixtures/session';
import { PostJobPage } from '../../pages/post-job.page';
import { USER_STORAGE_STATE } from '../../fixtures/test-users';

test.describe('Post a job — wizard', () => {
  test.use({ storageState: USER_STORAGE_STATE });

  test('step 1 suggests categories from the job title (no full catalogue up-front)', async ({ page }) => {
    const postJob = new PostJobPage(page);
    await postJob.goto();

    await postJob.expectStep(1);
    await expect(postJob.titleInput).toBeVisible();
    // The full category list is no longer shown on load — it is derived from the title.
    await expect(postJob.categoryButtons).toHaveCount(0);

    await postJob.titleInput.fill('Fix a leaking kitchen sink tap');
    // Categories load from the API and are filtered to the typed title.
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
    // Mock the Nominatim-backed address search so the location autocomplete is
    // deterministic (step 1 now requires a selected Service Location).
    await page.route('**/address/search**', (route) =>
      route.fulfill({
        json: [
          {
            place_id: 123456,
            display_name: 'MG Road, Thiruvananthapuram, Kerala, 695001, India',
            lat: '8.4875',
            lon: '76.9525',
            address: {
              road: 'MG Road',
              city: 'Thiruvananthapuram',
              state_district: 'Thiruvananthapuram',
              state: 'Kerala',
              postcode: '695001',
              country: 'India',
              country_code: 'in',
            },
          },
        ],
      }));

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
