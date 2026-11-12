import { ComponentFixture } from '@angular/core/testing';

import { configureFieldTestBed, createField } from 'ngt-gui/testing';
import { AnnotationTextOptionsReadComponent } from './annotation-text-options-read.component';

describe('AnnotationTextOptionsReadComponent', () => {
  let component: AnnotationTextOptionsReadComponent;
  let fixture: ComponentFixture<AnnotationTextOptionsReadComponent>;

  beforeEach(async () => {
    await configureFieldTestBed(AnnotationTextOptionsReadComponent);
    fixture = createField(AnnotationTextOptionsReadComponent, { label: 'Uso', range: { multiple: false, options: ['a', 'b'] } });
    component = fixture.componentInstance;
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
