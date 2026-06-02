import { Injectable } from '@angular/core';
import { ActivatedRouteSnapshot } from '@angular/router';
import {BackendService} from 'ngt-gui/core';
@Injectable({
  providedIn: 'root'
})
export class MetadataThemesResolver  {
  
  constructor(
    private readonly backendService: BackendService,
  ) { }

  async resolve(route: ActivatedRouteSnapshot) {
    console.log('Getting Themes');
    const sources: any = await this.backendService.getHierarchyNodes(null, {hierarchy_id: 1}).toPromise();
    return sources.content ? sources.content : false;

  }
}