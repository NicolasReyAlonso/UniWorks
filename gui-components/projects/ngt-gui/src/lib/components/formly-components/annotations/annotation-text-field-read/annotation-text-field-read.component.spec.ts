import { ComponentFixture, TestBed } from '@angular/core/testing';

import { AnnotationTextFieldReadComponent } from './annotation-text-field-read.component';

describe('AnnotationTextFieldReadComponent', () => {
  let component: AnnotationTextFieldReadComponent;
  let fixture: ComponentFixture<AnnotationTextFieldReadComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ AnnotationTextFieldReadComponent ]
    })
    .compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(AnnotationTextFieldReadComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
