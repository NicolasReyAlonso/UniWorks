import {BackendService} from 'ngt-gui/core';
import { Injectable } from '@angular/core';
import { ActivatedRouteSnapshot } from '@angular/router';
import { Observable, of } from 'rxjs';
import { catchError } from 'rxjs/operators';

@Injectable({
  providedIn: 'root'
})
export class LayerResolver  {

    constructor(
        private readonly backendService: BackendService
    ) { }

    resolve(route: ActivatedRouteSnapshot): Observable<any> {
        console.log('Getting Layers');
        let layerId = null;
        if (route.url[0].path === 'geolayerDetail') {
            layerId = route.params.id as string;
        }
        if (layerId) {
            return this.backendService.getLayerGIS(layerId).pipe(
                catchError(err => {
                    console.log('GeoLayer API Error: ');
                    console.log(err);
                    alert('Algo ha fallado');
                    return of(err);
                })
            );
        } else {
            return this.backendService.getLayerGIS().pipe(
                catchError(err => {
                    console.log('GeoLayer API Error: ');
                    console.log(err);
                    alert('Algo ha fallado');
                    return of(err);
                })
            );
        }

    }

}
