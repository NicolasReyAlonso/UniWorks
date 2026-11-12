import { ComponentFixture } from '@angular/core/testing';

import { configureFieldTestBed, createField } from 'ngt-gui/testing';
import { MonophylyComponent } from './monophyly.component';

describe('MonophylyComponent', () => {
  let component: MonophylyComponent;
  let fixture: ComponentFixture<MonophylyComponent>;

  beforeEach(async () => {
    await configureFieldTestBed(MonophylyComponent);
    fixture = createField(MonophylyComponent, { taxons: [] });
    component = fixture.componentInstance;
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
