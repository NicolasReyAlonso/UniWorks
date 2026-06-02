import {Injectable} from '@angular/core';
import { ActivatedRouteSnapshot } from '@angular/router';
import { Observable, of} from 'rxjs';
import {catchError} from 'rxjs/operators';
import {BackendService} from 'ngt-gui/core';
@Injectable({
  providedIn: 'root'
})
export class ResourceResolver  {

  constructor(private backendService: BackendService) { }

  resolve(route: ActivatedRouteSnapshot): Observable<any> {
    console.log('Getting Resolvers');
    return this.backendService.getResources().pipe(
        catchError( err => {
          console.log('Resource API Error: ');
          console.log(err);
          alert('Algo ha fallado');
          return of(err);
        }
      ));
  }
}
