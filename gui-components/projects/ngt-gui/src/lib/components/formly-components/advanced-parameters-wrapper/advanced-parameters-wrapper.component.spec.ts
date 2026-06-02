import { ComponentFixture, TestBed } from '@angular/core/testing';

import { AdvancedParametersWrapperComponent } from './advanced-parameters-wrapper.component';

describe('AdvancedParametersWrapperComponent', () => {
  let component: AdvancedParametersWrapperComponent;
  let fixture: ComponentFixture<AdvancedParametersWrapperComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ AdvancedParametersWrapperComponent ]
    })
    .compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(AdvancedParametersWrapperComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
