import { ComponentFixture, TestBed } from '@angular/core/testing';

import { AnnotationTextOptionsReadComponent } from './annotation-text-options-read.component';

describe('AnnotationTextOptionsReadComponent', () => {
  let component: AnnotationTextOptionsReadComponent;
  let fixture: ComponentFixture<AnnotationTextOptionsReadComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ AnnotationTextOptionsReadComponent ]
    })
    .compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(AnnotationTextOptionsReadComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
