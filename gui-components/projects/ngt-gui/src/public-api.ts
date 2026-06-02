/*
 * Public API Surface of ngt-gui
 */

export * from './lib/interfaces/backend/api-contract';
// El bundle main define su propio CORE_ENVIRONMENT / GLOBAL_SERVICE (distintos de
// los de ngt-gui/core). EntityClient depende de ellos, así que hay que exportarlos
// para que la app pueda proveerlos. Ver app.config.ts.
export * from './lib/tokens/config.token';
export * from './lib/tokens/global.token';
export * from './lib/core/entity-client.service';
export * from './lib/core/schema.service';
export * from './lib/core/discovery.service';
export * from './lib/core/api-error.interceptor';
export * from './lib/core/schema-to-formly';
export * from './lib/core/schema-to-aggrid';
export * from './lib/components/dynamic-form/dynamic-form.component';
export * from './lib/components/dynamics/bulk-edit-grid/bulk-edit-grid.component';

export default void 0;

