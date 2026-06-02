import { ComponentFixture, TestBed } from '@angular/core/testing';

import { SubprocessWrapperComponent } from './subprocess-wrapper.component';

describe('SubprocessWrapperComponent', () => {
  let component: SubprocessWrapperComponent;
  let fixture: ComponentFixture<SubprocessWrapperComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ SubprocessWrapperComponent ]
    })
    .compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(SubprocessWrapperComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
