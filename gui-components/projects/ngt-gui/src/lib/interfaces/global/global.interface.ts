export interface GlobalServiceInterface {

  parameters: {
    host: string; // 'http://localhost:5000', 'http://localhost:5000', 'http://10.141.187.173:5000', 'https://one.nis.magic-nexus.eu'
    api_prefix: string;
  };
  authOptions: any; // Used in every REST call

  getParameter(k: string): any;
  setHostUrl(url): void;
  isInt(n): boolean 
  isFloat(n): boolean;
  isNumber(n): boolean;
  convertToJson(jsonString: string): any;
}
