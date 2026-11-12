import { ComponentFixture } from '@angular/core/testing';

import { configureFieldTestBed, createField } from 'ngt-gui/testing';
import { AnnotationTextOptionsComponent } from './annotation-text-options.component';

describe('AnnotationTextOptionsComponent', () => {
  let component: AnnotationTextOptionsComponent;
  let fixture: ComponentFixture<AnnotationTextOptionsComponent>;

  beforeEach(async () => {
    await configureFieldTestBed(AnnotationTextOptionsComponent);
    fixture = createField(AnnotationTextOptionsComponent, { label: 'Uso', range: { multiple: false, options: ['a', 'b'] } });
    component = fixture.componentInstance;
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
