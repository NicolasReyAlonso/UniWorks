import {BackendService} from 'ngt-gui/core';
import { Injectable } from '@angular/core';
import { ActivatedRouteSnapshot } from '@angular/router';
import { Observable, of } from 'rxjs';
import { catchError } from 'rxjs/operators';

@Injectable({
  providedIn: "root"
})
export class RolesResolver  {

    constructor(
        private readonly backendService: BackendService
    ) { }

    resolve(route: ActivatedRouteSnapshot): Observable<any> {
        var roleId = null;
        if (route.url[0].path == "roleDetail" || route.url[0].path == "roleModify") {
            roleId = <string> route.params.id;
        }
        if (roleId) {
            console.log('Getting Role');
            return this.backendService.getRoles(roleId).pipe(
                catchError(err => {
                    console.log('Roles API Error: ');
                    console.log(err);
                    alert('Algo ha fallado');
                    return of(err);
                })
            );
        } else {
            console.log('Getting Roles');
            return this.backendService.getRoles(undefined, {
                'filter': {},
                'pagination': { 'pageIndex': 1, 'pageSize': 10 }
            }).pipe(
                catchError(err => {
                    console.log('Roles API Error: ');
                    console.log(err);
                    alert('Algo ha fallado');
                    return of(err);
                })
            );
        }
    }
}
