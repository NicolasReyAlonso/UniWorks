export interface CoreEnvironment {
  production: boolean;
  backend_url: string;
  firebase_config?: any;
  firebaseui_config?: any;
  api_prefix?: string;
}
