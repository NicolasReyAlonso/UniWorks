import { ComponentFixture, TestBed } from '@angular/core/testing';

import { GeolayerSelectorComponent } from './geolayer-selector.component';

describe('GeolayerSelectorComponent', () => {
  let component: GeolayerSelectorComponent;
  let fixture: ComponentFixture<GeolayerSelectorComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ GeolayerSelectorComponent ]
    })
    .compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(GeolayerSelectorComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
