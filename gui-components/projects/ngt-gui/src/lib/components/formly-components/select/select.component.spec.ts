import { ComponentFixture } from '@angular/core/testing';

import { configureFieldTestBed, createField } from 'ngt-gui/testing';
import { SelectComponent } from './select.component';

describe('SelectComponent', () => {
  let component: SelectComponent;
  let fixture: ComponentFixture<SelectComponent>;

  beforeEach(async () => {
    await configureFieldTestBed(SelectComponent);
    fixture = createField(SelectComponent, { label: 'Estado', options: [{ label: 'Sana', value: 'healthy' }] });
    component = fixture.componentInstance;
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
