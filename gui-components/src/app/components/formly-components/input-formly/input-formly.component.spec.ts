import { ComponentFixture } from '@angular/core/testing';

import { configureFieldTestBed, createField } from 'ngt-gui/testing';
import { InputFormlyComponent } from './input-formly.component';

describe('InputFormlyComponent', () => {
  let component: InputFormlyComponent;
  let fixture: ComponentFixture<InputFormlyComponent>;

  beforeEach(async () => {
    await configureFieldTestBed(InputFormlyComponent);
    fixture = createField(InputFormlyComponent, { label: 'Nombre' });
    component = fixture.componentInstance;
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
