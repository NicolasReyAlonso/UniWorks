# Generación dinámica de formularios — Incremento 3

Sistema que toma el JSON Schema de cualquier entidad expuesta por el backend
(`/<entity>/schema.json`, Incremento 2) y produce automáticamente un
formulario Formly renderizable. La idea: un formulario por entidad sin que
nadie escriba HTML específico.

## Flujo completo

```
SQLAlchemy model
    │ make_simple_rest_crud / make_crudie_rest_crud
    ▼
get_enriched_json_schema   ── inyecta x-ui-widget, x-options-endpoint, …
    │
    ▼
GET /<entity>/schema.json  ── ApiResponse<JSONSchema>
    │
    │ SchemaService.get('/<entity>')  (cache)
    ▼
schemaToFormly(schema)     ── tipos, validadores, expressions
    │
    ▼
<ngt-dynamic-form>         ── renderiza con <formly-form>
```

## Backend — hints `x-*` por columna

`sqlalchemy_to_pydantic` ahora inyecta `Field(json_schema_extra=...)` con UI
hints derivados de la columna SQLAlchemy. Implementación:
[`src/uniback/utils/common.py`](../src/uniback/utils/common.py) ::
`_ui_hints_for_column`.

### Heurísticas automáticas

| Columna SQLAlchemy | Hint resultante |
|---|---|
| `Boolean` | `x-ui-widget: "checkbox"` |
| `DateTime` | `x-ui-widget: "datepicker"`, `x-formly-props: {showTime: true}` |
| `Date` | `x-ui-widget: "date"` |
| `Time` | `x-ui-widget: "time"` |
| `Enum` | `x-ui-widget: "select"` (las opciones ya viajan en el `enum` JSON Schema) |
| `String(length > 500)` | `x-ui-widget: "textarea"` |
| `JSON` / `JSONB` | `x-ui-widget: "json"` |
| Columna con `ForeignKey('<table>.<col>')` | `x-ui-widget: "select-lazy-loading"`, `x-options-endpoint: "/<table>/"`, `x-options-label: "name"`, `x-options-value: "<col>"` |

### Overrides manuales

Cualquier `info` de columna se respeta:

```python
class Person(Base):
    __tablename__ = "person"
    id = Column(Integer, primary_key=True)
    bio = Column(String, info={
        "ui": {"ui-widget": "textarea", "formly-props": {"rows": 8}},
        "x-placeholder": "Cuéntanos algo…",
    })
```

`info["ui"]` se aplana con prefijo `x-`. Claves bajo `info` que ya empiecen por
`x-` también se copian verbatim.

## Frontend — converter

Implementación: [`projects/ngt-gui/src/lib/core/schema-to-formly.ts`](../../../Front/gui-components/projects/ngt-gui/src/lib/core/schema-to-formly.ts).

```ts
import { schemaToFormly } from 'ngt-gui';

const fields = schemaToFormly(jsonSchema, {
  mode: 'create',      // 'edit' | 'view'
  overrides: {
    name: { props: { placeholder: 'Nombre del rol' } },
  },
});
```

### Tabla de mapeo

| JSON Schema | Formly `type` | Notas |
|---|---|---|
| `string` | `input` | Default |
| `string` + `format: date-time` (o `date`) | `datepicker` | |
| `string` + `enum` | `select` | Opciones expuestas en `props.options` |
| `string` + `x-ui-widget: textarea` | `textarea` | |
| `integer`, `number` | `input` (`type: number`) | |
| `boolean` | `checkbox` | |
| `array` de `object` | `repeat` (fieldArray) | |
| `object` con `properties` | sin `type`, `fieldGroup` | |
| `$ref` interno (`#/$defs/X`) | resuelve recursivamente | |

### Hints `x-*` reconocidos

| Keyword | Efecto |
|---|---|
| `x-formly-type` | Sobreescribe directamente el `type` del field |
| `x-ui-widget` | Alias semántico → traducción a `type` Formly |
| `x-options-endpoint` | Para selects lazy: endpoint que sirve las opciones |
| `x-options-label` / `x-options-value` | Campos a usar de la respuesta del endpoint |
| `x-placeholder` | `props.placeholder` |
| `x-formly-props` | Objeto fusionado en `props` (rows, prefix, suffix, …) |
| `x-hide-when` | Expresión Formly → `expressions.hide` |
| `x-required-when` | Expresión Formly → `expressions['props.required']` |
| `x-disabled-when` | Expresión Formly → `expressions['props.disabled']` |

### Validators generados

`minLength`, `maxLength`, `minimum`, `maximum`, `pattern`, `format: email`
producen los `Validators` correspondientes de Angular.

## Frontend — DynamicFormComponent

```html
<!-- Caso 1: por path de entidad (lo más dinámico) -->
<ngt-dynamic-form entityPath="/roles" [(model)]="model" (submitted)="save($event)">
</ngt-dynamic-form>

<!-- Caso 2: con esquema en mano -->
<ngt-dynamic-form [schema]="mySchema" [(model)]="model"></ngt-dynamic-form>

<!-- Caso 3: con FormlyFieldConfig[] ya construidos -->
<ngt-dynamic-form [fields]="fields" [(model)]="model"></ngt-dynamic-form>
```

Inputs:

| Input | Tipo | Notas |
|---|---|---|
| `entityPath` | `string` | Se resuelve con `SchemaService` |
| `schema` | `JsonSchema` | Schema en bruto |
| `fields` | `FormlyFieldConfig[]` | Bypass total del converter |
| `model` | `Record<string, unknown>` | Bidireccional |
| `mode` | `'create'\|'edit'\|'view'` | Modo `view` fuerza readonly/disabled |
| `overrides` | `Record<string, Partial<FormlyFieldConfig>>` | Deep-merge por key |
| `submitButton` | `string \| null` | Texto del botón submit (null → sin botón) |
| `issues` | `Issue[]` | Issues a mostrar bajo el form |

Outputs: `modelChange`, `submitted`, `fieldsReady`.

## Registro de tipos Formly en el consumer

`DynamicFormComponent` solo importa `FormlyModule`. El consumer debe registrar
los `types` que pueda necesitar (input, textarea, checkbox, select,
datepicker, repeat, select-lazy-loading…). El proyecto ya tiene
[`FormlyComponentsModule`](../../../Front/gui-components/projects/ngt-gui/src/lib/components/formly-components/formly-components.module.ts)
con ng-zorro Formly + ~20 tipos custom; basta con cargarlo en la app.

## Pruebas

Backend ([tests/test_api/test_form_schema.py](../tests/test_api/test_form_schema.py)):
- Validan que `/<entity>/schema.json` trae `x-ui-widget` en columnas
  datetime y `x-options-endpoint` en columnas FK.
- Unit tests directos de `_ui_hints_for_column` para boolean, textarea,
  datepicker, FK, override por `column.info["ui"]`.

Frontend ([projects/ngt-gui/src/lib/core/schema-to-formly.spec.ts](../../../Front/gui-components/projects/ngt-gui/src/lib/core/schema-to-formly.spec.ts)):
- Tipos primitivos, required, enum/select, overrides `x-formly-type` y
  `x-ui-widget`, `x-options-endpoint`, fieldGroup, fieldArray, `$ref`,
  expressions (`x-hide-when`), modo `view`.

## Piloto

[`/api-contract-pilot`](../../../Front/gui-components/src/app/pages/api-contract-pilot/api-contract-pilot.component.ts)
ahora también renderiza un formulario generado para la entidad seleccionada
y envía vía `EntityClient.create()`, mostrando issues del envelope.

## Limitaciones conocidas

- El converter solo procesa propiedades de primer nivel y sus hijos
  inmediatos; overrides son por key de primer nivel (no por path).
- `select-lazy-loading` espera que el consumer tenga registrado el tipo
  Formly y que lea `props.optionsEndpoint`/`Label`/`Value`.
- Los `Date/DateTime` se mapean a `datepicker`; el formato exacto se delega
  al tipo Formly registrado en la app.
- `oneOf`, `anyOf`, `allOf` no se soportan todavía — quedan para el
  Incremento 4 si Pydantic los emite.
