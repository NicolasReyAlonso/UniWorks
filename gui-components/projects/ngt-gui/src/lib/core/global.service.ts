import {Injectable, Inject} from '@angular/core';
import { CORE_ENVIRONMENT } from '../tokens/config.token';
import { CoreEnvironment } from '../interfaces/core-environment.interface';
import { GlobalServiceInterface } from '../interfaces/global/global.interface';

@Injectable({
  providedIn: 'root'
})
export class GlobalService implements GlobalServiceInterface {

  parameters: {
    host: string; // 'http://localhost:5000', 'http://localhost:5000', 'http://10.141.187.173:5000', 'https://one.nis.magic-nexus.eu'
    api_prefix: string;
  };
  authOptions: any; // Used in every REST call

constructor(@Inject(CORE_ENVIRONMENT) private env: CoreEnvironment) {
    this.parameters = {
      host: env.backend_url,
      api_prefix: env.api_prefix ?? '/api'
    };
  }

  getParameter(k: string): any {
    return this.parameters[k];
  }

  setHostUrl(url): void {
    this.parameters.host = url;
  }

  isInt(n) {
    return Number(n) === n && n % 1 === 0;
  }

  isFloat(n) {
    return Number(n) === n && n % 1 !== 0;
  }

  isNumber(n) {
    return Number(n) === n;
  }

  convertToJson(jsonString: string): any {
    try {
      return JSON.parse(jsonString);
    } catch (e) {
      return null;
    }
  }
}
