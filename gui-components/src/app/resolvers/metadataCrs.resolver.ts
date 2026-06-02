import { Injectable } from '@angular/core';
import { ActivatedRouteSnapshot } from '@angular/router';
import {BackendService} from 'ngt-gui/core';
@Injectable({
  providedIn: 'root'
})
export class MetadataCrsResolver  {

  constructor(
    private readonly backendService: BackendService,
  ) { }

  async resolve(route: ActivatedRouteSnapshot) {
    console.log('Getting CRS');
    let id = null;
    if (route.url[0].path === 'crsDetail') {
      id = route.params.id as string;
    }
    if (id) {
      const sources: any = await this.backendService.getHierarchyNodes(id).toPromise();
      return sources.content ? sources.content : false;
    }
    const sources: any = await this.backendService.getHierarchyNodes(null, {hierarchy_id: 3}).toPromise();
    return sources.content ? sources.content : false;

  }
}
