import { HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import {
  CreateInteractionInput,
  Interaction,
  InteractionListItem,
  UpdateInteractionInput,
} from '../models/interaction.model';
import { ApiService } from './api.service';

@Injectable({ providedIn: 'root' })
export class InteractionService {
  private readonly api = inject(ApiService);

  list(personId?: string): Observable<InteractionListItem[]> {
    let params = new HttpParams();
    if (personId?.trim()) {
      params = params.set('personId', personId.trim());
    }
    return this.api.get<InteractionListItem[]>('/interactions', params);
  }

  getById(id: string): Observable<InteractionListItem> {
    return this.api.get<InteractionListItem>(`/interactions/${id}`);
  }

  create(data: CreateInteractionInput): Observable<Interaction> {
    return this.api.post<Interaction>('/interactions', data);
  }

  update(id: string, data: UpdateInteractionInput): Observable<Interaction> {
    return this.api.patch<Interaction>(`/interactions/${id}`, data);
  }

  remove(id: string): Observable<Interaction> {
    return this.api.delete<Interaction>(`/interactions/${id}`);
  }
}
