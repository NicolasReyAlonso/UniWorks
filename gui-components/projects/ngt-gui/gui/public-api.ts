/*
 * Public API Surface of ngt-gui
 */

// Re-exporta desde la ubicación original en src/lib
export * from './src/gui/layout/tab-layout/tab-layout.component';
export * from './src/gui/layout/mdi-layout/mdi-layout.component';
export * from './src/gui/layout/window-frame/window-frame.component';
export * from './src/services/window-manager.service';
export * from './src/interfaces/window-instance.interface';
export * from './src/tokens/sidebar-config.token';
export * from './src/services/sidebar.service'
export * from './src/modules/shared.module';
export * from './src/gui/dynamics/dynamic-browse/dynamic-browse.component';
export * from './src/gui/dynamics/dynamic-analyses-import/dynamic-analyses-import.component';
export * from './src/gui/dynamics/dynamic-analysis-detail/dynamic-analysis-detail.component';
export * from './src/gui/dynamics/dynamic-table/dynamic-table.component';
export * from './src/gui/dynamics/dynamic-input-modal/dynamic-input-modal.component';
export * from './src/gui/data/annotations/annotations-form/annotations-form.component';
export * from './src/pipes/safe-html.pipe';
export * from './src/services/modal-info.service'
export * from './src/interfaces/view.interface';

// Dynamic page system
export * from './src/gui/dynamics/dynamic-page/dynamic-page.component';
export * from './src/gui/dynamics/dynamic-page/dynamic-page.resolver';
export * from './src/interfaces/navigation.interface';