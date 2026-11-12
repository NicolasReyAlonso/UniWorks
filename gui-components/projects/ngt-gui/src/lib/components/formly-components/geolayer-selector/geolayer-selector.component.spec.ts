import { ComponentFixture } from '@angular/core/testing';
import { of } from 'rxjs';
import { BackendService } from 'ngt-gui/core';

import { configureFieldTestBed, createField } from 'ngt-gui/testing';
import { GeolayerSelectorComponent } from './geolayer-selector.component';

describe('GeolayerSelectorComponent', () => {
  let component: GeolayerSelectorComponent;
  let fixture: ComponentFixture<GeolayerSelectorComponent>;

  beforeEach(async () => {
    await configureFieldTestBed(GeolayerSelectorComponent, [
      { provide: BackendService, useValue: { getLayerGIS: () => of({ content: [] }) } },
    ]);
    fixture = createField(GeolayerSelectorComponent, { extension: 'shp', filename: 'capa' });
    component = fixture.componentInstance;
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
