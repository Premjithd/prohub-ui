import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';

export interface UploadedFile {
  fileId: string;
  url: string;
}

@Injectable({ providedIn: 'root' })
export class FileUploadService {
  private apiUrl = `${environment.apiUrl}/files`;

  constructor(private http: HttpClient) {}

  /** Upload a single file; returns its stored id and public URL. */
  upload(file: File): Observable<UploadedFile> {
    const form = new FormData();
    form.append('file', file);
    return this.http.post<UploadedFile>(`${this.apiUrl}/upload`, form);
  }

  /** Public URL for a previously-stored file id. */
  fileUrl(fileId: string): string {
    return `${this.apiUrl}/${fileId}`;
  }
}
