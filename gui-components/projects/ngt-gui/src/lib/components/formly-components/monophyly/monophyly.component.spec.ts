import { ComponentFixture, TestBed } from '@angular/core/testing';

import { MonophylyComponent } from './monophyly.component';

describe('MonophylyComponent', () => {
  let component: MonophylyComponent;
  let fixture: ComponentFixture<MonophylyComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ MonophylyComponent ]
    })
    .compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(MonophylyComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
