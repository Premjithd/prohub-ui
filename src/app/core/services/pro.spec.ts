import { TestBed } from '@angular/core/testing';

import { Pro } from './pro';

describe('Pro', () => {
  let service: Pro;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(Pro);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
