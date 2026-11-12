import { CommonModule } from '@angular/common';
import { NO_ERRORS_SCHEMA } from '@angular/core';
import { TestBed } from '@angular/core/testing';

import { AppComponent } from './app.component';

describe('AppComponent', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({ imports: [AppComponent] })
      // Shallow render: the MDI layout and the assistant overlay bring the
      // whole application graph (auth, router, sockets) and have their own specs.
      .overrideComponent(AppComponent, {
        set: { imports: [CommonModule], schemas: [NO_ERRORS_SCHEMA] },
      })
      .compileComponents();
  });

  it('should create the app', () => {
    const fixture = TestBed.createComponent(AppComponent);
    expect(fixture.componentInstance).toBeTruthy();
  });

  it('mounts the window layout and the assistant overlay', () => {
    const fixture = TestBed.createComponent(AppComponent);
    fixture.detectChanges();
    const host = fixture.nativeElement as HTMLElement;
    expect(host.querySelector('app-mdi-layout')).not.toBeNull();
    expect(host.querySelector('app-assistant-overlay')).not.toBeNull();
  });
});
