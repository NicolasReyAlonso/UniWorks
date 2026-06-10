import { FormlyFieldConfig } from '@ngx-formly/core';
import { ValidatorFn, Validators } from '@angular/forms';

/**
 * Minimal JSON Schema (Draft 2020-12) shape consumed by the converter.
 * Vendor extensions live under `x-*` keys and are forwarded verbatim.
 */
export interface JsonSchema {
  $schema?: string;
  $id?: string;
  $ref?: string;
  $defs?: Record<string, JsonSchema>;
  definitions?: Record<string, JsonSchema>;

  type?: string | string[];
  title?: string;
  description?: string;
  default?: unknown;
  readOnly?: boolean;
  writeOnly?: boolean;

  properties?: Record<string, JsonSchema>;
  required?: string[];
  items?: JsonSchema | JsonSchema[];

  enum?: unknown[];
  const?: unknown;

  // Polymorphic roots (backend Incremento 4) carry oneOf + x-discriminator
  // alongside the base `properties`. The converter renders the base columns
  // and intentionally does NOT expand variants into a type selector yet.
  oneOf?: JsonSchema[];

  format?: string;
  minLength?: number;
  maxLength?: number;
  pattern?: string;
  minimum?: number;
  maximum?: number;
  exclusiveMinimum?: number;
  exclusiveMaximum?: number;
  multipleOf?: number;
  minItems?: number;
  maxItems?: number;

  // Vendor extensions (x-*) live in this index signature.
  [key: string]: unknown;
}

export type FormMode = 'create' | 'edit' | 'view';

export interface SchemaToFormlyOptions {
  /** Optional overrides keyed by field key (top-level only for now). */
  overrides?: Record<string, Partial<FormlyFieldConfig>>;
  /** Used to inform readOnly/disabled defaults. */
  mode?: FormMode;
  /** Root schema, kept around so `$ref` resolution can walk it. */
  rootSchema?: JsonSchema;
}

/**
 * Converts a (root) JSON Schema into a Formly field configuration array.
 * The root MUST describe an object — entity schemas always do.
 */
export function schemaToFormly(schema: JsonSchema, options: SchemaToFormlyOptions = {}): FormlyFieldConfig[] {
  const resolved = resolveRef(schema, schema);
  if (resolved.type !== 'object' || !resolved.properties) {
    throw new Error('schemaToFormly: root schema must describe an object with properties');
  }

  // Polymorphic roots also carry `oneOf` + `x-discriminator` and entities may
  // carry `x-relationships`. These are metadata for codegen/mirroring; the
  // form is built from the base `properties` only (no type selector for now),
  // so they are deliberately ignored here rather than throwing.

  const required = new Set(resolved.required ?? []);
  const opts: SchemaToFormlyOptions = { ...options, rootSchema: schema };

  const fields: FormlyFieldConfig[] = [];
  for (const [key, propSchema] of Object.entries(resolved.properties)) {
    const field = propertyToField(key, propSchema, required.has(key), opts);
    const override = options.overrides?.[key];
    fields.push(override ? deepMerge(field, override) : field);
  }
  return fields;
}

function propertyToField(
  key: string,
  rawSchema: JsonSchema,
  isRequired: boolean,
  opts: SchemaToFormlyOptions,
): FormlyFieldConfig {
  const schema = resolveSchema(rawSchema, opts.rootSchema ?? rawSchema);
  const type = pickFormlyType(schema);

  const props: Record<string, unknown> = {
    label: (schema.title as string | undefined) ?? humanize(key),
    description: schema.description,
    required: isRequired,
    readonly: schema.readOnly === true || opts.mode === 'view',
    disabled: opts.mode === 'view',
  };

  const placeholder = (schema['x-placeholder'] as string | undefined) ?? undefined;
  if (placeholder) props['placeholder'] = placeholder;
  const xProps = schema['x-formly-props'];
  if (xProps && typeof xProps === 'object') Object.assign(props, xProps);

  if (Array.isArray(schema.enum)) {
    props['options'] = schema.enum.map(value => ({ value, label: String(value) }));
  }

  applyTypeConstraints(props, schema);

  const field: FormlyFieldConfig = {
    key,
    type,
    props,
    expressions: buildExpressions(schema),
    validators: buildValidators(schema),
    defaultValue: schema.default,
  };

  // Object → fieldGroup
  if (schema.type === 'object' && schema.properties) {
    const nestedRequired = new Set(schema.required ?? []);
    field.fieldGroup = Object.entries(schema.properties).map(([childKey, childSchema]) =>
      propertyToField(childKey, childSchema, nestedRequired.has(childKey), opts),
    );
    field.type = undefined;
  }

  // Array of objects → fieldArray
  if (schema.type === 'array') {
    const items = Array.isArray(schema.items) ? schema.items[0] : schema.items;
    const itemSchema = items ? resolveRef(items, opts.rootSchema ?? items) : undefined;
    if (itemSchema?.type === 'object' && itemSchema.properties) {
      field.type = 'repeat';
      field.fieldArray = () => propertyToField('item', itemSchema, false, opts);
    }
  }

  if (schema['x-options-endpoint']) {
    props['optionsEndpoint'] = schema['x-options-endpoint'];
    props['optionsLabelField'] = schema['x-options-label'] ?? 'name';
    props['optionsValueField'] = schema['x-options-value'] ?? 'id';
  }

  return field;
}

function pickFormlyType(schema: JsonSchema): string {
  const explicit = (schema['x-formly-type'] as string | undefined)
    ?? mapUiWidget(schema['x-ui-widget'] as string | undefined);
  if (explicit) return explicit;

  if (Array.isArray(schema.enum)) return 'select';

  switch (schema.type) {
    case 'boolean': return 'checkbox';
    case 'integer':
    case 'number':  return 'input';
    case 'string':
      switch (schema.format) {
        case 'date':
        case 'date-time': return 'datepicker';
        case 'email':     return 'input';
        default:          return 'input';
      }
    case 'array':  return 'repeat';
    case 'object': return 'object'; // overwritten by fieldGroup branch above
    default:       return 'input';
  }
}

function mapUiWidget(hint?: string): string | undefined {
  if (!hint) return undefined;
  switch (hint) {
    case 'textarea':            return 'textarea';
    case 'checkbox':            return 'checkbox';
    case 'datepicker':          return 'datepicker';
    case 'date':                return 'datepicker';
    case 'select':              return 'select';
    case 'select-lazy-loading': return 'select-lazy-loading';
    case 'json':                return 'textarea';
    case 'uuid':                return 'input';
    default:                    return hint;
  }
}

function applyTypeConstraints(props: Record<string, unknown>, schema: JsonSchema): void {
  if (typeof schema.minLength === 'number') props['minLength'] = schema.minLength;
  if (typeof schema.maxLength === 'number') props['maxLength'] = schema.maxLength;
  if (typeof schema.minimum === 'number')   props['min'] = schema.minimum;
  if (typeof schema.maximum === 'number')   props['max'] = schema.maximum;
  if (schema.pattern)                       props['pattern'] = schema.pattern;
  if (schema.type === 'integer' || schema.type === 'number') props['type'] = 'number';
}

function buildValidators(schema: JsonSchema): { validation: ValidatorFn[] } | undefined {
  const validation: ValidatorFn[] = [];

  if (typeof schema.minLength === 'number') validation.push(Validators.minLength(schema.minLength));
  if (typeof schema.maxLength === 'number') validation.push(Validators.maxLength(schema.maxLength));
  if (typeof schema.minimum === 'number')   validation.push(Validators.min(schema.minimum));
  if (typeof schema.maximum === 'number')   validation.push(Validators.max(schema.maximum));
  if (schema.pattern)                       validation.push(Validators.pattern(schema.pattern));
  if (schema.format === 'email')            validation.push(Validators.email);

  return validation.length ? { validation } : undefined;
}

function buildExpressions(schema: JsonSchema): Record<string, string> | undefined {
  const expressions: Record<string, string> = {};
  const hide = schema['x-hide-when'];
  if (typeof hide === 'string') expressions['hide'] = hide;
  const requiredWhen = schema['x-required-when'];
  if (typeof requiredWhen === 'string') expressions['props.required'] = requiredWhen;
  const disabledWhen = schema['x-disabled-when'];
  if (typeof disabledWhen === 'string') expressions['props.disabled'] = disabledWhen;
  return Object.keys(expressions).length ? expressions : undefined;
}

/**
 * Resolves a property schema to the shape the converter can reason about.
 *
 * Beyond a direct `$ref`, this also unwraps the nullable/optional pattern that
 * Pydantic v2 emits for `Optional[...]` fields: the meaningful branch (often a
 * `$ref` to an enum in `$defs`) combined with a `{ "type": "null" }` branch
 * under `anyOf`/`oneOf`/`allOf`. Without unwrapping, an optional enum like
 * `health` carries neither a top-level `type` nor `enum`, so it would fall back
 * to a plain text input instead of a `select`. Outer keywords on the wrapper
 * (e.g. `default`) win over the branch; the branch's own `title`/`description`
 * (typically the `$defs` class name) are dropped so the field falls back to the
 * humanized property key.
 */
export function resolveSchema(rawSchema: JsonSchema, root: JsonSchema): JsonSchema {
  const schema = resolveRef(rawSchema, root);

  const variants = (schema.anyOf ?? schema.oneOf ?? schema['allOf']) as JsonSchema[] | undefined;
  const alreadyTyped = schema.type !== undefined || schema.enum !== undefined || !!schema.properties;
  if (!Array.isArray(variants) || alreadyTyped) return schema;

  const meaningful = variants
    .map(variant => resolveRef(variant, root))
    .filter(variant => variant.type !== 'null');
  if (meaningful.length !== 1) return schema;

  const { anyOf, oneOf, allOf, ...outer } = schema as JsonSchema & { allOf?: unknown };
  const merged: JsonSchema = { ...meaningful[0], ...outer };
  if (outer.title === undefined) delete merged.title;
  if (outer.description === undefined) delete merged.description;
  return merged;
}

function resolveRef(schema: JsonSchema, root: JsonSchema): JsonSchema {
  if (!schema.$ref) return schema;
  const path = schema.$ref;
  if (!path.startsWith('#/')) return schema;
  const segments = path.slice(2).split('/');
  let cursor: unknown = root;
  for (const segment of segments) {
    if (!cursor || typeof cursor !== 'object') return schema;
    cursor = (cursor as Record<string, unknown>)[segment];
  }
  return (cursor as JsonSchema) ?? schema;
}

function humanize(key: string): string {
  return key
    .replace(/_/g, ' ')
    .replace(/([a-z])([A-Z])/g, '$1 $2')
    .replace(/^\s*\w/, c => c.toUpperCase());
}

function deepMerge<T>(target: T, source: Partial<T>): T {
  if (!source) return target;
  const output: Record<string, unknown> = { ...(target as object) };
  for (const [k, v] of Object.entries(source)) {
    const existing = (target as Record<string, unknown>)[k];
    if (v && typeof v === 'object' && !Array.isArray(v) && existing && typeof existing === 'object' && !Array.isArray(existing)) {
      output[k] = deepMerge(existing as Record<string, unknown>, v as Record<string, unknown>);
    } else {
      output[k] = v;
    }
  }
  return output as T;
}
