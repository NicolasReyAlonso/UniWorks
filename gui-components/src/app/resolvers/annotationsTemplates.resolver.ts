import { Injectable } from '@angular/core';
import { ActivatedRouteSnapshot } from '@angular/router';
import {BackendService} from 'ngt-gui/core';
@Injectable({
  providedIn: 'root'
})
export class AnnotationsTemplatesResolver  {
  constructor(
    private readonly backendService: BackendService,
  ) { }

  async resolve(route: ActivatedRouteSnapshot) {
    let templateId = null;
    if (route.url[0].path === 'annotationsTemplateDetail') {
      templateId = route.params.id as string;
    }
    if (templateId) {
      const templateResponse: any = await this.backendService.getAnnotationsTemplates(templateId).toPromise();
      return templateResponse ? templateResponse : false;
    } else {
      const templatesResponse: any = await this.backendService.getAnnotationsTemplates().toPromise();
      return templatesResponse ? templatesResponse : false;
    }

  }
}
