import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';

import { CheckProcedenceGuard } from './check-procedence.guard';

describe('CheckProcedenceGuard', () => {
  let guard: CheckProcedenceGuard;

  beforeEach(() => {
    TestBed.configureTestingModule({ providers: [provideRouter([])] });
    guard = TestBed.inject(CheckProcedenceGuard);
  });

  it('should be created', () => {
    expect(guard).toBeTruthy();
  });
});
