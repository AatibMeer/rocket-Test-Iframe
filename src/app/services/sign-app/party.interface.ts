export const enum RoleEnum {
  Owner = 'OWNER',
  Signer = 'SIGNER',
  Viewer = 'VIEWER',
  Payer = 'PAYER',
  Payee = 'PAYEE',
  Notary = 'NOTARY',
}

/** @deprecated Use the enum */
type Roles = 'OWNER' | 'SIGNER' | 'VIEWER' | 'PAYER' | 'PAYEE' | 'NOTARY';

export type Role = RoleEnum | Roles;

export interface Party {
  readonly id?: string;
  reference?: string;
  legalName?: string;
  missingLegalNameIndex?: number;
  jobTitle?: string;
  personId?: string;
  email?: string;
  /** Has the party's email address been changed? This is set by the reducer, it isn't something you set manually! */
  readonly emailChanged?: boolean;
  roles: Role[];
  invitationToken?: string;
  metaData?: any;
  isCurrentUser?: boolean;
  isTemporary: boolean;
  color?: string;
  status?: 'SIGNED' | 'DECLINED' | 'VIEWED' | 'INVITED';
}

export const pii: ReadonlyArray<keyof Party> = ['legalName', 'personId', 'email'];
