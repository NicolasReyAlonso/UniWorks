import { Observable } from "rxjs";
export interface backendSecurityAdminInterface {
  getIdentities?(id?: any, params?: any): Observable<any>;
  postIdentity?(value?: any): Observable<any>;
  putIdentity?(id?: any, value?: any): Observable<any>;
  deleteIdentity?(id?: any, params?: any): Observable<any>;

  getGroups?(id?: any, params?: any): Observable<any>;
  postGroup?(value?: any): Observable<any>;
  putGroup?(id?: any, value?: any): Observable<any>;
  deleteGroups?(id?: any, params?: any): Observable<any>;

  getOrganizations?(id?: any, params?: any): Observable<any>;
  postOrganization?(value?: any): Observable<any>;
  putOrganization?(id?: any, value?: any): Observable<any>;
  deleteOrganization?(id?: any, params?: any): Observable<any>;

  getRoles?(id?: any, params?: any): Observable<any>;
  getCurrentUserRoles?(params?: any): Observable<any>;
  postRole?(value?: any): Observable<any>;
  putRole?(id?: any, value?: any): Observable<any>;
  deleteRole?(id?: any, params?: any): Observable<any>;

  getCurrentUserApiKeys?(params?: any): Observable<any>;
  postCurrentUserApiKey?(value?: any, params?: any): Observable<any>;
  removeCurrentUserApiKey?(id?: any, params?: any): Observable<any>;

  getSystemFunctions?(id?: any, params?: any): Observable<any>;
  putACLExpression?(id?: any, value?: any, params?: any): Observable<any>;

  getACL?(id?: any, params?: any): Observable<any>;
  postACL?(value?: any, params?: any): Observable<any>;
  putACL?(id?: any, value?: any, params?: any): Observable<any>;
  deleteACL?(id?: any, params?: any): Observable<any>;

  getAuthrExplain?(id?: any, params?: any): Observable<any>;
  getObjectTypes?(id?: any, params?: any): Observable<any>;
}