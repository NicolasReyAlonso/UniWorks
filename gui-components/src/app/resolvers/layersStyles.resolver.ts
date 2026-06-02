import { Injectable } from '@angular/core';
import { Router, RouterStateSnapshot, ActivatedRouteSnapshot } from '@angular/router';
import { Observable, of } from 'rxjs';
import { catchError } from 'rxjs/operators';
import {BackendService} from 'ngt-gui/core';
@Injectable({
  providedIn: 'root'
})
export class LayerStylesResolver  {
  
  constructor(
    private readonly backendService: BackendService,
  ) { }

  async resolve(route: ActivatedRouteSnapshot) {
    console.log('Getting LayerStyles');
    let id = null;
    if (id) {
      const layerStyle: any = await this.backendService.getLayersStyles(id).toPromise();
      return layerStyle.content ? layerStyle.content : false;
    } else {
      const layerStyles: any = await this.backendService.getLayersStyles().toPromise();
      return layerStyles.content ? layerStyles.content : false;
    }

  }
}
