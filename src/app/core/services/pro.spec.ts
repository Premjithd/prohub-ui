import { TestBed } from '@angular/core/testing';
import { provideZonelessChangeDetection } from '@angular/core';
import { provideHttpClient } from '@angular/common/http';

import { ProService } from './pro';

describe('ProService', () => {
  let service: ProService;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideZonelessChangeDetection(), provideHttpClient()],
    });
    service = TestBed.inject(ProService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
