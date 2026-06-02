import {Injectable} from '@angular/core';
import { HttpClient, HttpHeaders, HttpRequest } from '@angular/common/http';
import * as fileSaver from 'file-saver';
import {GlobalService} from "ngt-gui/core";

@Injectable({
  providedIn: 'root'
})
export class FilesService {

  baseUrl: string;
  private readonly FILES_MIME_DEPEND_EXTENSION: { [key: string]: string } = {
    ipynb: 'application/x-ipynb+json',
    py: 'text/x-python',
    R: 'text/x-r-source',
    sh: 'application/x-sh',
    sql: 'application/sql',
    zip: 'application/zip'
  }

  constructor(
    private http: HttpClient,
    private readonly globalVariablesService: GlobalService,
  ) {
    this.baseUrl = globalVariablesService.getParameter('host') + globalVariablesService.getParameter('api_prefix');
  }

  getFileFromBosRequestUrl(bosType: string, id: string, format: string, queryParams?: {}) {
    let url = `${this.baseUrl}/bos/${bosType}/${id}.${format}`;
    if (queryParams !== undefined) {
      url += "?"
      for (const [key, value] of Object.entries(queryParams)) {
        url += key + "=" + value + "&"
      }
      url = url.substring(0, url.length - 1);
    }
    return url;
  }

  getFileFromJobRequestUrl(jobId: string, fileName: string) {
    return `${this.baseUrl}/files/jobs/${jobId}/${fileName}.content`;
  }

  getFileFromPathUrl(path: string) {
    if (path.startsWith('/'))
      path = path.substring(1);
    return `${this.baseUrl}/files/${path}.content`;
  }

  async downloadJobResult(jobId: string, fileName: string, params?) {
    if (jobId !== undefined && fileName !== undefined) {
      const httpRequest = this.http.get(
        this.getFileFromJobRequestUrl(jobId, fileName),
        {...this.globalVariablesService.authOptions, params: params ? params : {}, responseType: 'blob'}
      );
      const response: any = await httpRequest.toPromise();
      const blob = response as Blob;
      fileSaver.saveAs(blob, fileName);
    }
  }

  importJobResult(jobId: string, resultFile: {}) {
    const queryParams = {
      filesAPI: `/jobs/${jobId}/${resultFile['file']}`,
      job_id: jobId,
      program: resultFile['subprocess'],
      programversion: '1.0',
      sourceuri: `/jobs/${jobId}/${resultFile['file']}`,
      name: resultFile['bos_name']
    };
    const objectTypeKey = Object.keys(resultFile['object_type'])[0];
    const postUrl = new URL(`${this.baseUrl}/${objectTypeKey}/${resultFile['object_type'][objectTypeKey]}/`);
    let headers = new HttpHeaders();
    for (const [key, value] of this.globalVariablesService.authOptions.headers.headers.entries()) {
      headers = headers.append(key, value);
    }

    headers = headers.append('Content-Type', resultFile['content_type']); // or the content type you need
    const updatedAuthOptions = {
      ...this.globalVariablesService.authOptions,
      headers: headers
    };
    postUrl.search = new URLSearchParams(queryParams).toString();
    return this.http.post(postUrl.toString(), {}, updatedAuthOptions);
  }

  postString2FileApi(path: string, fileName: string, content: string, contentType: string) {
    //curl --cookie app-cookies.txt -H 'Content-Type: text/plain' -XPUT --data-binary 'data:text/x-fasta;base64,PnNlcTEKYWFhYWFhCj5zZXEyCmJiYmJiYgo+c2VxMwpjY2NjY2M=' http://localhost:5000/api/files/msa_editor/1.fasta.content
    const dataUrl = `data:${contentType};base64,${btoa(content)}`;
    const postUrl = new URL(`${this.baseUrl}/files/${path}/${fileName}.content`);
    return this.http.put(postUrl.toString(), dataUrl, this.globalVariablesService.authOptions);
  }

  postDataUrl2FileApi(path: string, fileName: string, dataUrl: string, headers?: {[key: string]: string}) {
    //curl --cookie app-cookies.txt -H 'Content-Type: text/plain' -XPUT --data-binary 'data:text/x-fasta;base64,PnNlcTEKYWFhYWFhCj5zZXEyCmJiYmJiYgo+c2VxMwpjY2NjY2M=' http://localhost:5000/api/files/msa_editor/1.fasta.content
    const postUrl = new URL(`${this.baseUrl}/files/${path}/${fileName}.content`);
    const headersRequest = new HttpHeaders({
      ...headers
    })
    if (this.globalVariablesService.authOptions?.headers) {
      const authHeaders: HttpHeaders = this.globalVariablesService.authOptions?.headers
      for (const headerKey of authHeaders.keys()) {
        headersRequest.set(headerKey, authHeaders.get(headerKey))
      }
    }
    return this.http.put(postUrl.toString(), dataUrl, {...this.globalVariablesService.authOptions, headers: headersRequest});
  }

  deleteFileInFileApi(path: string, fileName: string) {
    //curl --cookie app-cookies.txt -H 'Content-Type: text/plain' -XPUT --data-binary 'data:text/x-fasta;base64,PnNlcTEKYWFhYWFhCj5zZXEyCmJiYmJiYgo+c2VxMwpjY2NjY2M=' http://localhost:5000/api/files/msa_editor/1.fasta.content
    const deleteUrl = new URL(`${this.baseUrl}/files/${path}/${fileName}.content`);
    return this.http.delete(deleteUrl.toString(), this.globalVariablesService.authOptions);
  }

  getFileInFileApi(path: string, fileName: string, headers: {[key: string]: string}) {
    const getUrl = new URL(`${this.baseUrl}/files/${path}/${fileName}.content`);
    const headersRequest = new HttpHeaders({
      ...headers
    })
    if (this.globalVariablesService.authOptions?.headers) {
      const authHeaders: HttpHeaders = this.globalVariablesService.authOptions?.headers
      for (const headerKey of authHeaders.keys()) {
        headersRequest.set(headerKey, authHeaders.get(headerKey))
      }
    }
    return this.http.get(getUrl.toString(), {...this.globalVariablesService.authOptions, headers: headersRequest})
  }

  getFolderContent(path: string) {
    const url = `${this.baseUrl}/files${path}/`
    return this.http.get(url, this.globalVariablesService.authOptions)
  }

  convertStringToDownloadFile(filename, data, type): void {
    const blob = new Blob([data], {type: type});
    const elem = window.document.createElement('a');
    elem.href = window.URL.createObjectURL(blob);
    elem.style.display = 'none';
    elem.download = filename;
    document.body.appendChild(elem);
    elem.click();
    document.body.removeChild(elem);
  }

  convertStringToBlob(filename, data, type): Blob {
    return new Blob([data], {type: type});
  }

  getSequencesHeaders(path: string) {
    const getUrl = new URL(`${this.baseUrl}/files${path}`);
    getUrl.search = new URLSearchParams({'sequence_ids':'True'}).toString();
    return this.http.get(getUrl.toString(), this.globalVariablesService.authOptions);
  }

  public getMIMETypeByExtension(args: {ext: string}): string {
    return this.FILES_MIME_DEPEND_EXTENSION[args.ext] ?? ''
  }
}
