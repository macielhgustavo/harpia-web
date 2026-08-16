import { HttpParams, HttpResponse } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import {
  CreateDocumentInput,
  Document,
  DocumentFilters,
} from '../models/document.model';
import { ApiService } from './api.service';

@Injectable({ providedIn: 'root' })
export class DocumentService {
  private readonly api = inject(ApiService);

  list(filters: DocumentFilters): Observable<Document[]> {
    let params = new HttpParams();
    for (const [key, value] of Object.entries(filters)) {
      if (value?.trim()) params = params.set(key, value.trim());
    }
    return this.api.get<Document[]>('/documents', params);
  }

  upload(input: CreateDocumentInput): Observable<Document> {
    const formData = new FormData();
    formData.append('file', input.file, input.file.name);
    formData.append('name', input.name);
    formData.append('category', input.category);
    for (const key of [
      'personId',
      'investmentId',
      'unitId',
      'developmentId',
    ] as const) {
      const value = input[key];
      if (value?.trim()) formData.append(key, value.trim());
    }
    return this.api.postFormData<Document>('/documents', formData);
  }

  download(id: string): Observable<HttpResponse<Blob>> {
    return this.api.getBlob(`/documents/${id}/download`);
  }

  remove(id: string): Observable<Document> {
    return this.api.delete<Document>(`/documents/${id}`);
  }
}

export function filenameFromContentDisposition(
  header: string | null,
  fallback: string,
): string {
  if (!header) return fallback;
  const encoded = /filename\*=UTF-8''([^;]+)/i.exec(header)?.[1];
  if (encoded) {
    try {
      return decodeURIComponent(encoded);
    } catch {
      return fallback;
    }
  }
  const quoted = /filename="([^"]+)"/i.exec(header)?.[1];
  return quoted?.trim() || fallback;
}
