import { Injectable } from '@angular/core';
import { ActivatedRouteSnapshot, RouterStateSnapshot } from '@angular/router';
import { SidebarService } from '../../../services/sidebar.service';

/**
 * DynamicPageResolver
 *
 * Universal resolver that loads a Screen definition from the backend
 * using the `:screenName` route parameter.
 *
 * The result is placed into `route.data['screenDefinition']` and
 * consumed by `DynamicPageComponent`.
 */
@Injectable({ providedIn: 'root' })
export class DynamicPageResolver {

  constructor(private readonly sidebarService: SidebarService) {}

  async resolve(route: ActivatedRouteSnapshot, _state: RouterStateSnapshot): Promise<any> {
    const screenName = route.params['screenName'];
    if (!screenName) {
      console.warn('DynamicPageResolver: no screenName param');
      return null;
    }

    try {
      const definition = await this.sidebarService.loadScreenByName(screenName);
      return definition ?? null;
    } catch (err) {
      console.error(`DynamicPageResolver: failed to load screen "${screenName}"`, err);
      return null;
    }
  }
}
