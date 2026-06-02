import {BackendService} from 'ngt-gui/core';
import { Injectable } from '@angular/core';
import { ActivatedRouteSnapshot } from '@angular/router';
import { Observable, of } from 'rxjs';
import { catchError } from 'rxjs/operators';

@Injectable({
  providedIn: 'root'
})
export class IdentitiesResolver  {

    constructor(
        private readonly backendService: BackendService
    ) { }

    resolve(route: ActivatedRouteSnapshot): Observable<any> {
        var identityId = null;
        if (route.url[0].path == "identityDetail" || route.url[0].path == "identityModify") {
            identityId = <string> route.params.id;
        }
        if (identityId) {
            console.log('Getting Identity');
            return this.backendService.getIdentities(identityId).pipe(
                catchError(err => {
                    console.log('Identities API Error: ');
                    console.log(err);
                    alert('Algo ha fallado');
                    return of(err);
                })
            );
        } else {
            console.log('Getting Identities');
            return this.backendService.getIdentities(undefined, {
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
