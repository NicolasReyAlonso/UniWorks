import { JsonSchema, schemaToFormly } from './schema-to-formly';

describe('schemaToFormly', () => {
  function buildSchema(properties: Record<string, JsonSchema>, required: string[] = []): JsonSchema {
    return { type: 'object', properties, required };
  }

  it('throws when root is not an object', () => {
    expect(() => schemaToFormly({ type: 'string' } as JsonSchema)).toThrow();
  });

  it('maps primitive types to Formly equivalents', () => {
    const fields = schemaToFormly(buildSchema({
      name: { type: 'string' },
      age: { type: 'integer' },
      active: { type: 'boolean' },
    }));
    expect(fields.find(f => f.key === 'name')!.type).toBe('input');
    expect(fields.find(f => f.key === 'age')!.type).toBe('input');
    expect(fields.find(f => f.key === 'age')!.props!['type']).toBe('number');
    expect(fields.find(f => f.key === 'active')!.type).toBe('checkbox');
  });

  it('marks required fields based on the parent required array', () => {
    const [name, nickname] = schemaToFormly(buildSchema(
      { name: { type: 'string' }, nickname: { type: 'string' } },
      ['name'],
    ));
    expect(name.props!['required']).toBe(true);
    expect(nickname.props!['required']).toBe(false);
  });

  it('uses enum to populate select options', () => {
    const [status] = schemaToFormly(buildSchema({
      status: { type: 'string', enum: ['draft', 'active', 'archived'] },
    }));
    expect(status.type).toBe('select');
    expect(status.props!['options']).toEqual([
      { value: 'draft', label: 'draft' },
      { value: 'active', label: 'active' },
      { value: 'archived', label: 'archived' },
    ]);
  });

  it('honors x-formly-type and x-ui-widget overrides', () => {
    const [bio, picker] = schemaToFormly(buildSchema({
      bio: { type: 'string', 'x-ui-widget': 'textarea' } as JsonSchema,
      picker: { type: 'string', 'x-formly-type': 'select-lazy-loading' } as JsonSchema,
    }));
    expect(bio.type).toBe('textarea');
    expect(picker.type).toBe('select-lazy-loading');
  });

  it('forwards x-options-endpoint and label/value fields to props', () => {
    const [role] = schemaToFormly(buildSchema({
      role_id: {
        type: 'integer',
        'x-ui-widget': 'select-lazy-loading',
        'x-options-endpoint': '/roles/',
        'x-options-label': 'display_name',
      } as JsonSchema,
    }));
    expect(role.type).toBe('select-lazy-loading');
    expect(role.props!['optionsEndpoint']).toBe('/roles/');
    expect(role.props!['optionsLabelField']).toBe('display_name');
    expect(role.props!['optionsValueField']).toBe('id');
  });

  it('maps date-time format to datepicker', () => {
    const [createdAt] = schemaToFormly(buildSchema({
      created_at: { type: 'string', format: 'date-time' },
    }));
    expect(createdAt.type).toBe('datepicker');
  });

  it('propagates length constraints both to props and validators', () => {
    const [name] = schemaToFormly(buildSchema({
      name: { type: 'string', minLength: 2, maxLength: 60 },
    }));
    expect(name.props!['minLength']).toBe(2);
    expect(name.props!['maxLength']).toBe(60);
    expect(name.validators!.validation.length).toBe(2);
  });

  it('builds a fieldGroup for nested objects', () => {
    const [address] = schemaToFormly(buildSchema({
      address: {
        type: 'object',
        properties: {
          street: { type: 'string' },
          number: { type: 'integer' },
        },
        required: ['street'],
      },
    }));
    expect(address.fieldGroup).toBeDefined();
    expect(address.fieldGroup!.length).toBe(2);
    expect(address.fieldGroup!.find(f => f.key === 'street')!.props!['required']).toBe(true);
  });

  it('builds a repeat type for array of objects', () => {
    const [items] = schemaToFormly(buildSchema({
      items: {
        type: 'array',
        items: { type: 'object', properties: { sku: { type: 'string' } } },
      },
    }));
    expect(items.type).toBe('repeat');
    expect(typeof items.fieldArray).toBe('function');
  });

  it('resolves $ref to local $defs', () => {
    const schema: JsonSchema = {
      type: 'object',
      properties: { role: { $ref: '#/$defs/Role' } },
      $defs: {
        Role: { type: 'string', enum: ['admin', 'user'] },
      },
    };
    const [role] = schemaToFormly(schema);
    expect(role.type).toBe('select');
    expect(role.props!['options']).toEqual([
      { value: 'admin', label: 'admin' },
      { value: 'user', label: 'user' },
    ]);
  });

  it('applies overrides via deep merge', () => {
    const [name] = schemaToFormly(buildSchema({ name: { type: 'string' } }), {
      overrides: {
        name: { props: { placeholder: 'Tu nombre' } },
      },
    });
    expect(name.props!['placeholder']).toBe('Tu nombre');
    expect(name.props!['label']).toBe('Name');
  });

  it('converts x-hide-when into a Formly expression', () => {
    const [secondary] = schemaToFormly(buildSchema({
      secondary: { type: 'string', 'x-hide-when': 'model.primary === ""' } as JsonSchema,
    }));
    expect(secondary.expressions!['hide']).toBe('model.primary === ""');
  });

  it('forces readonly/disabled in view mode', () => {
    const [name] = schemaToFormly(buildSchema({ name: { type: 'string' } }), { mode: 'view' });
    expect(name.props!['readonly']).toBe(true);
    expect(name.props!['disabled']).toBe(true);
  });

  describe('polymorphic root (Incremento 4)', () => {
    function polymorphicSchema(): JsonSchema {
      return {
        type: 'object',
        properties: {
          object_type_id: { type: 'integer' },
          name: { type: 'string' },
        },
        required: ['name'],
        oneOf: [
          { type: 'object', title: 'Dataset', properties: { structure: { type: 'object', properties: {} } } },
          { type: 'object', title: 'Collection', properties: { size: { type: 'integer' } } },
        ],
        'x-discriminator': { propertyName: 'object_type_id', mapping: { '0': 'Dataset', '106': 'Collection' } },
        'x-relationships': [
          { name: 'rl_owner', target: 'identities', direction: 'MANYTOONE', collection: false },
        ],
      } as JsonSchema;
    }

    it('renders only the base properties and does not throw on oneOf', () => {
      const fields = schemaToFormly(polymorphicSchema());
      const keys = fields.map(f => f.key);
      expect(keys).toEqual(['object_type_id', 'name']);
      expect(fields.find(f => f.key === 'name')!.props!['required']).toBe(true);
    });

    it('does not leak x-relationships or oneOf variants as form fields', () => {
      const keys = schemaToFormly(polymorphicSchema()).map(f => f.key);
      expect(keys).not.toContain('x-relationships');
      expect(keys).not.toContain('structure');
      expect(keys).not.toContain('size');
    });
  });
});
