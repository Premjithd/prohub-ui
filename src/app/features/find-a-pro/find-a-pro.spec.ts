import { Router } from '@angular/router';

import { FindAProComponent } from './find-a-pro';
import { BrowsePro } from '../../services/pro-browse.service';
import { Service } from '../../services/my-services.service';

/**
 * Focused logic tests for the "post a job for this pro" CTAs. These assert the
 * chosen pro is carried through to /post-job as proId/proName so the job becomes
 * a RequestedProId direct invite. The constructor has no side effects, so the
 * component is instantiated directly with stub deps (only the Router is used by
 * these methods) — avoiding ngOnInit's service subscriptions entirely.
 */
describe('FindAProComponent — post-job CTAs carry the selected pro', () => {
  let component: FindAProComponent;
  let router: jasmine.SpyObj<Router>;

  const selectedPro: BrowsePro = {
    id: 42,
    proName: 'Alice Johnson',
    businessName: 'Johnson Plumbing Services',
    city: 'Thiruvananthapuram',
    state: 'Kerala',
    country: 'India',
    isEmailVerified: true,
    services: [{ id: 1, name: 'Plumbing', price: 60 }],
  };

  beforeEach(() => {
    router = jasmine.createSpyObj<Router>('Router', ['navigate']);
    const stub: any = {};
    component = new FindAProComponent(
      stub, // proBrowseService
      stub, // serviceCategoryService
      stub, // serviceAreaService
      stub, // cdr
      stub, // auth
      stub, // addressService
      stub, // myServicesService
      router,
      stub, // reviewService
      stub, // http
      stub, // zone
    );
  });

  it('postJobForService passes proId + proName (business name) alongside category/title', () => {
    component.selectedPro = { ...selectedPro };

    const service: Service = {
      id: 7,
      name: 'Pipe Repair',
      description: '',
      price: 45,
      proId: 42,
      createdAt: '',
      updatedAt: '',
      serviceCategoryId: 3,
    };

    component.postJobForService(service);

    expect(router.navigate).toHaveBeenCalledTimes(1);
    const [path, extras] = router.navigate.calls.mostRecent().args as [string[], any];
    expect(path).toEqual(['/post-job']);
    expect(extras.queryParams).toEqual(
      jasmine.objectContaining({
        proId: '42',
        proName: 'Johnson Plumbing Services',
        categoryId: '3',
        title: 'Pipe Repair',
      }),
    );
  });

  it('postJobGeneral passes proId + proName for the selected pro', () => {
    component.selectedPro = { ...selectedPro };

    component.postJobGeneral();

    expect(router.navigate).toHaveBeenCalledTimes(1);
    const [path, extras] = router.navigate.calls.mostRecent().args as [string[], any];
    expect(path).toEqual(['/post-job']);
    expect(extras.queryParams).toEqual(
      jasmine.objectContaining({ proId: '42', proName: 'Johnson Plumbing Services' }),
    );
  });

  it('falls back to proName when the pro has no business name', () => {
    component.selectedPro = { ...selectedPro, businessName: '' };

    component.postJobGeneral();

    const [, extras] = router.navigate.calls.mostRecent().args as [string[], any];
    expect(extras.queryParams.proName).toBe('Alice Johnson');
  });

  it('omits pro params when no pro is selected', () => {
    component.selectedPro = null;

    component.postJobGeneral();

    const [, extras] = router.navigate.calls.mostRecent().args as [string[], any];
    expect(extras.queryParams).toEqual({});
  });
});
