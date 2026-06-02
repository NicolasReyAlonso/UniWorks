import {BackendService} from 'ngt-gui/core';
import { Injectable } from '@angular/core';
import { ActivatedRouteSnapshot } from '@angular/router';
import { Observable, of } from 'rxjs';
import { catchError } from 'rxjs/operators';

@Injectable({
    providedIn: "root"
})
export class GroupsResolver  {

    constructor(
        private readonly backendService: BackendService
    ) { }

    resolve(route: ActivatedRouteSnapshot): Observable<any> {
        var groupId = null;
        if (route.url[0].path == "groupDetail" || route.url[0].path == "groupModify") {
            groupId = <string> route.params.id;
        }
        if (groupId) {
            console.log('Getting Group');
            return this.backendService.getGroups(groupId).pipe(
                catchError(err => {
                    console.log('Groups API Error: ');
                    console.log(err);
                    alert('Algo ha fallado');
                    return of(err);
                })
            );
        } else {
            console.log('Getting Identities');
            return this.backendService.getGroups(undefined, {
                'filter': {},
                'pagination': { 'pageIndex': 1, 'pageSize': 10 }
            }).pipe(
                catchError(err => {
                    console.log('Groups API Error: ');
                    console.log(err);
                    alert('Algo ha fallado');
                    return of(err);
                })
            );
        }
    }
}
