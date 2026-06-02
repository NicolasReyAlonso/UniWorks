import { Injectable } from '@angular/core';
import { ActivatedRouteSnapshot } from '@angular/router';
import { Observable, of } from 'rxjs';
import { catchError } from 'rxjs/operators';
import {BackendService} from 'ngt-gui/core';
@Injectable({
    providedIn: "root"
})
export class OrganizationsResolver  {

  constructor(
    private readonly backendService: BackendService
  ) { }

  resolve(route: ActivatedRouteSnapshot): Observable<boolean> {
    var organizationId = null;
    if (route.url[0].path == "organizationDetail" || route.url[0].path == "organizationModify") {
      organizationId = <string>route.params.id;
    }
    if (organizationId) {
      console.log('Getting Organization');
      return this.backendService.getOrganizations(organizationId).pipe(
        catchError(err => {
          console.log('Identities API Error: ');
          console.log(err);
          alert('Algo ha fallado');
          return of(err);
        })
      );
    } else {
      console.log('Getting Organizations');
      return this.backendService.getOrganizations(undefined, {
        'filter': {},
        'pagination': { 'pageIndex': 1, 'pageSize': 10 }
      }).pipe(
        catchError(err => {
          console.log('Identities API Error: ');
          console.log(err);
          alert('Algo ha fallado');
          return of(err);
        })
      );
    }
  }
}
