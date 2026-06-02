/**
 * @interface SidebarItem
 * @description
 * Define la estructura del objeto que representa el menú lateral (sidebar) de la aplicación.
 * 
 * Cada clave del objeto principal (`submenu`) representa un submenú con su propio icono, código de traducción
 * y un conjunto de rutas asociadas.
 *
 * Las rutas pueden incluir propiedades adicionales como permisos o parámetros de consulta.
 */

export interface SidebarItem {
  /**
   * Interfaz que representa la estructura de los submenús y los items de los submenus
   */
    [submenu: string]: {
      /**
       * Código de traducción para el título del submenú (opcional, si no se proporciona se genera automáticamente)
       */
      code?: string,
      icon: string,
      routes: {
        [routes: string]: {
          routerLink: string, routes: string[], queryParams?: object, permission?: string, funcCondition?: () => boolean}
      }
    };
}
