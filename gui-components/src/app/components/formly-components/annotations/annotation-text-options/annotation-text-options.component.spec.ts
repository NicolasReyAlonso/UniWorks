import { ComponentFixture, TestBed } from '@angular/core/testing';

import { AnnotationTextOptionsComponent } from './annotation-text-options.component';

describe('AnnotationTextOptionsComponent', () => {
  let component: AnnotationTextOptionsComponent;
  let fixture: ComponentFixture<AnnotationTextOptionsComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ AnnotationTextOptionsComponent ]
    })
    .compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(AnnotationTextOptionsComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
