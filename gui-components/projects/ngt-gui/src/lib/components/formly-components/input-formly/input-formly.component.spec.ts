import { ComponentFixture, TestBed } from '@angular/core/testing';

import { InputFormlyComponent } from './input-formly.component';

describe('InputFormlyComponent', () => {
  let component: InputFormlyComponent;
  let fixture: ComponentFixture<InputFormlyComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ InputFormlyComponent ]
    })
    .compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(InputFormlyComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
