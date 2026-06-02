import { Injectable } from '@angular/core';
import {
  Router, Resolve,
  RouterStateSnapshot,
  ActivatedRouteSnapshot
} from '@angular/router';
import { Observable, of } from 'rxjs';
import { catchError } from 'rxjs/operators';
import {BackendService} from 'ngt-gui/core';

@Injectable()
export class GeoRegionResolver implements Resolve<boolean> {

  constructor(
    private readonly backendService: BackendService,
) { }

  resolve(route: ActivatedRouteSnapshot, state: RouterStateSnapshot) {
    console.log('Getting RegionsGIS');
    return this.backendService.getRegionsGIS().pipe(
      catchError(err => {
          console.log('RegionsGIS API Error: ');
          console.log(err);
          alert('Algo ha fallado');
          return of(err);
      })
  );
  }
}
