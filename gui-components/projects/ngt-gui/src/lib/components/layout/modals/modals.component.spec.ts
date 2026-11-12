import { CommonModule } from '@angular/common';
import { NO_ERRORS_SCHEMA } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { TranslateModule } from '@ngx-translate/core';

import { AUTH_SERVICE_TOKEN } from 'ngt-gui/core';

import { ModalsComponent } from './modals.component';

describe('ModalsComponent', () => {
  let component: ModalsComponent;
  let fixture: ComponentFixture<ModalsComponent>;
  let auth: { isEmailVerified: boolean; isAnonymous: boolean; hiddenAuthModal: boolean };

  beforeEach(async () => {
    auth = { isEmailVerified: false, isAnonymous: false, hiddenAuthModal: false };

    await TestBed.configureTestingModule({
      imports: [ModalsComponent, TranslateModule.forRoot()],
      providers: [{ provide: AUTH_SERVICE_TOKEN, useValue: auth }],
    })
      // Shallow render: the login/registration children and the Firebase and
      // NG-ZORRO modules are out of scope for this component's own logic.
      .overrideComponent(ModalsComponent, {
        set: { imports: [CommonModule, TranslateModule], schemas: [NO_ERRORS_SCHEMA] },
      })
      .compileComponents();

    fixture = TestBed.createComponent(ModalsComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('asks for login while the user is neither verified nor anonymous', () => {
    expect(component.showModal()).toBeTrue();
  });

  it('stays hidden for anonymous or verified users', () => {
    auth.isAnonymous = true;
    expect(component.showModal()).toBeFalse();

    auth.isAnonymous = false;
    auth.isEmailVerified = true;
    expect(component.showModal()).toBeFalse();
  });
});
