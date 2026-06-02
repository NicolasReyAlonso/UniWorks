import { InjectionToken } from '@angular/core';
import { FilesServiceInterface } from '../interfaces/files/files.interface';

export const FILES_SERVICE_TOKEN = new InjectionToken<FilesServiceInterface>('core.files.service');