import { TestBed } from '@angular/core/testing';

import { CheckProcedenceGuard } from './check-procedence.guard';

describe('CheckStateGuard', () => {
  let guard: CheckProcedenceGuard;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    guard = TestBed.inject(CheckProcedenceGuard);
  });

  it('should be created', () => {
    expect(guard).toBeTruthy();
  });
});
