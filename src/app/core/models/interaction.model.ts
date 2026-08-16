export type InteractionType =
  'REUNIAO' | 'LIGACAO' | 'WHATSAPP' | 'EMAIL' | 'OUTRO';

export interface Interaction {
  id: string;
  date: string;
  type: InteractionType;
  summary: string;
  nextStep: string | null;
  personId: string;
  organizationId: string;
  createdAt: string;
  updatedAt: string;
  person?: { id: string; name: string };
}

export interface InteractionListItem extends Interaction {
  person: { id: string; name: string };
}

export interface CreateInteractionInput {
  personId: string;
  date: string;
  type: InteractionType;
  summary: string;
  nextStep?: string;
}

export interface UpdateInteractionInput {
  date?: string;
  type?: InteractionType;
  summary?: string;
  nextStep?: string;
}
