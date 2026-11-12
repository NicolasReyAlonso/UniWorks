/**
 * Test harness for Formly field components (`FieldType` subclasses).
 *
 * A field component is never rendered alone in the app: Formly instantiates it
 * and hands it a `field` (form control, props, key). These helpers reproduce
 * that minimum so a spec can mount the component in isolation, without pulling
 * the whole NG-ZORRO / Formly module graph (unknown elements are tolerated).
 */
import { NO_ERRORS_SCHEMA, Provider, Type } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { FormControl } from '@angular/forms';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { FieldType, FormlyFieldConfig } from '@ngx-formly/core';
import { TranslateModule } from '@ngx-translate/core';

export async function configureFieldTestBed(
  component: Type<unknown>,
  providers: Provider[] = [],
): Promise<void> {
  await TestBed.configureTestingModule({
    declarations: [component],
    imports: [TranslateModule.forRoot()],
    providers: [provideHttpClient(), provideHttpClientTesting(), ...providers],
    schemas: [NO_ERRORS_SCHEMA],
  }).compileComponents();
}

/** Creates the component bound to a stand-in Formly field and renders it. */
export function createField<T extends FieldType>(
  component: Type<T>,
  props: Record<string, unknown> = {},
  value: unknown = null,
): ComponentFixture<T> {
  const fixture = TestBed.createComponent(component);
  const field: FormlyFieldConfig = {
    key: 'field',
    formControl: new FormControl(value),
    props,
    options: {},
  };
  fixture.componentInstance.field = field as T['field'];
  fixture.detectChanges();
  return fixture;
}
