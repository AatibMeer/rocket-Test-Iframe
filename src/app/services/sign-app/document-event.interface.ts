export interface DocumentEvent {
  binderId: string;
  details: documentDetails;
  id: string;
  occurredAt: string;
  partyId: string;
  type: string;
}

export enum HistoryEventType {
  'BINDER_CREATED',
  'BINDER_VIEWED',
  'BINDER_SIGNED',
  'BINDER_DOWNLOADED',
  'BINDER_CANCELED',
  'BINDER_SIGN_COMPLETED',
  'INVITATION_TO_SIGN_SENT',
  'SIGNER_DECLINED_TO_SIGN',
  'VIEWER_INVITED',
  'VIEWER_REMOVED_FROM_BINDER',
  'BINDER_DOCUMENT_CHANGED',
  'SIGN_REMINDER_SENT',
  'BINDER_PRINTED',
}

interface documentDetails {
  binderName: string;
  description: string;
  legalName: string;
  reason?: string;
  message?: string;
  email?: string;
}
