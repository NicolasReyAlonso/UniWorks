import { ComponentFixture } from '@angular/core/testing';

import { configureFieldTestBed, createField } from 'ngt-gui/testing';
import { AnnotationTextFieldReadComponent } from './annotation-text-field-read.component';

describe('AnnotationTextFieldReadComponent', () => {
  let component: AnnotationTextFieldReadComponent;
  let fixture: ComponentFixture<AnnotationTextFieldReadComponent>;

  beforeEach(async () => {
    await configureFieldTestBed(AnnotationTextFieldReadComponent);
    fixture = createField(AnnotationTextFieldReadComponent, { label: 'Notas' });
    component = fixture.componentInstance;
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
