export interface RoutePathServiceInterface {
  _log: any[];
  log: any;
  lastUrl: any;
  breadcrumbTicket: any;
  routePathCounter: any;
  refresh_path(routing: any):any;
  goBack(routing):any;
  getCurrentPath():any
  getPreviousPath():any
}
