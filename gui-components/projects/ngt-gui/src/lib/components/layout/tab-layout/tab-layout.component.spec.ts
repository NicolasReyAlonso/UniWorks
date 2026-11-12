import { CommonModule } from '@angular/common';
import { EventEmitter, NO_ERRORS_SCHEMA } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideNoopAnimations } from '@angular/platform-browser/animations';
import { provideRouter } from '@angular/router';

import {
  AUTH_SERVICE_TOKEN,
  INTERNATIONALIZATION_SERVICE,
  ROUTE_PATH_SERVICE,
  STATE_SERVICE,
} from 'ngt-gui/core';

import { TabLayoutComponent } from './tab-layout.component';

describe('TabLayoutComponent', () => {
  let component: TabLayoutComponent;
  let fixture: ComponentFixture<TabLayoutComponent>;
  let i18n: jasmine.SpyObj<any>;

  beforeEach(async () => {
    i18n = jasmine.createSpyObj('InternationalizationService', [
      'changeCurrentLanguage',
      'setDefaultLanguage',
      'getCurrentLanguage',
      'getLangChangeEvent',
    ]);
    i18n.getCurrentLanguage.and.returnValue('private-es');
    i18n.getLangChangeEvent.and.returnValue(new EventEmitter());

    await TestBed.configureTestingModule({
      imports: [TabLayoutComponent],
      providers: [
        provideRouter([]),
        provideNoopAnimations(),
        { provide: AUTH_SERVICE_TOKEN, useValue: { initializeAngularFireAuthChange: () => undefined } },
        { provide: INTERNATIONALIZATION_SERVICE, useValue: i18n },
        { provide: ROUTE_PATH_SERVICE, useValue: { routePathCounter: 0 } },
        { provide: STATE_SERVICE, useValue: { currentUrl: '' } },
      ],
    })
      // Shallow render: sidebar, top area, split panes and modals have their
      // own dependencies and are not what this shell spec is about.
      .overrideComponent(TabLayoutComponent, {
        set: { imports: [CommonModule], schemas: [NO_ERRORS_SCHEMA] },
      })
      .compileComponents();

    fixture = TestBed.createComponent(TabLayoutComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('selects the application language on init', () => {
    expect(i18n.changeCurrentLanguage).toHaveBeenCalledWith('private-es');
    expect(component.selectedOptionLanguage).toBe('private-es');
  });
});
