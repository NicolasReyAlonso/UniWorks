import { Component } from '@angular/core';
import { FieldType } from '@ngx-formly/core';

/**
 * Tipo formly `datepicker`.
 *
 * `schemaToFormly` mapea los campos de tipo `date`/`date-time` del JSON Schema a
 * este tipo. Lo respaldamos con el `nz-date-picker` de ng-zorro y normalizamos el
 * valor a `YYYY-MM-DD`, que es lo que el backend espera para una columna `Date`
 * (un Date de JS se serializaría como ISO datetime y Pydantic lo rechazaría).
 */
@Component({
  selector: 'app-datepicker-formly',
  templateUrl: './datepicker-formly.component.html',
  standalone: false,
})
export class DatepickerFormlyComponent extends FieldType {
  // Cacheamos el Date para devolver SIEMPRE la misma referencia mientras el valor
  // del control no cambie. Si el getter creara un `new Date` en cada ciclo de
  // detección de cambios, nz-date-picker vería el [ngModel] como "modificado"
  // continuamente → bucle infinito que cuelga el picker al seleccionar fecha.
  private _cachedRaw: unknown = Symbol('uninit');
  private _cachedDate: Date | null = null;

  /** Valor del control (string `YYYY-MM-DD`) expuesto como Date estable. */
  get dateValue(): Date | null {
    const raw = this.formControl.value;
    if (raw !== this._cachedRaw) {
      this._cachedRaw = raw;
      this._cachedDate = parseLocalDate(raw);
    }
    return this._cachedDate;
  }

  onChange(d: Date | null): void {
    const iso = d ? toISODate(d) : null;
    this._cachedRaw = iso;
    this._cachedDate = d;
    this.formControl.setValue(iso);
    this.formControl.markAsDirty();
    this.formControl.markAsTouched();
  }
}

/** Convierte un Date a `YYYY-MM-DD` usando la fecha local (sin desfase UTC). */
function toISODate(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

/**
 * Parsea el valor del control a Date. Para un string `YYYY-MM-DD` construimos la
 * fecha en hora LOCAL (no `new Date("YYYY-MM-DD")`, que es UTC y provoca desfases
 * de un día). Para cualquier otro formato (o vacío) caemos a Date directo / null.
 */
function parseLocalDate(value: unknown): Date | null {
  if (!value) return null;
  if (value instanceof Date) return value;
  if (typeof value === 'string') {
    const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(value);
    if (m) return new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
    const d = new Date(value);
    return isNaN(d.getTime()) ? null : d;
  }
  return null;
}
