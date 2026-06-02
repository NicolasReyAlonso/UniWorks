export interface IView {
  BREADCRUMB_NAME: string | { key: string, params: any};
  currentUrl?: string;

  getState?: () => {};
  setState?: (value) => {};
}
