import {Injectable} from '@angular/core';
import { HttpClient, HttpHeaders, HttpRequest } from '@angular/common/http';
import * as fileSaver from 'file-saver';


export interface FilesServiceInterface {

  baseUrl: string;

  getFileFromBosRequestUrl(bosType: string, id: string, format: string, queryParams?: {}):any;

  getFileFromJobRequestUrl(jobId: string, fileName: string):any;
  getFileFromPathUrl(path: string):any;
downloadJobResult(jobId: string, fileName: string, params?):any;
  importJobResult(jobId: string, resultFile: {}):any;
  postString2FileApi(path: string, fileName: string, content: string, contentType: string):any;

  postDataUrl2FileApi(path: string, fileName: string, dataUrl: string, headers?: {[key: string]: string}):any;

  deleteFileInFileApi(path: string, fileName: string):any;
  getFileInFileApi(path: string, fileName: string, headers: {[key: string]: string}) :any;

  getFolderContent(path: string) :any;

  convertStringToDownloadFile(filename, data, type): void;

  convertStringToBlob(filename, data, type): Blob;

  getSequencesHeaders(path: string) :any;
    getMIMETypeByExtension(args: {ext: string}): string;
}