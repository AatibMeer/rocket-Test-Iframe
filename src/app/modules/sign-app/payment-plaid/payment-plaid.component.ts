import {
  AfterViewInit,
  Component,
  ElementRef,
  EventEmitter,
  Input,
  OnDestroy,
  OnInit,
  Output,
  ViewChild,
} from '@angular/core';
import { Store } from '../../../state/store';
import { getCurrentParty } from '../../../state/selectors';
import { getStorageProxy, StorageProxy } from '../../../services/common/storage.service';
import { EnvInfoService } from '../../../services/common/env-info.service';
import { AlertService } from '../../../services/sign-app/alert.service';
import { MessageService } from '../message';
import { SearchParamsService } from '../../../services/sign-app/search-params.service';

// remove this when we can just `import` the web component
declare interface PlaidWebComponent {
  create(): Promise<void>;
  open(): void;
  destroy(): void;
  linkToken: string;
}

/**
 * This component contains the common for bank pay in and pay out method creation.
 *
 * For the creation of those methods, look for their respective components.
 */
@Component({
  selector: 'rl-payment-plaid',
  styleUrls: [],
  template: `
    <rl-plaid
      #plaid
      brand="rl-us"
      [linkToken]="storedLinkToken"
      [partyId]="partyID"
      [peerPaymentsBaseURL]="peerPaymentsBaseURL"
      [receivedRedirectUri]="receivedRedirectUri"
      [rlAccessToken]="accessToken"
      [tokenRedirectUri]="tokenRedirectURI"
      (rlPlaidEvent)="onEvent($event.detail.eventName)"
      (rlPlaidExit)="onExit($event.detail.error)"
      (rlPlaidSuccess)="onSuccess($event.detail.publicToken, $event.detail.metadata)"
      (rlPlaidLoad)="loaded.emit()"
    ></rl-plaid>
  `,
})
export class PaymentPlaidComponent implements AfterViewInit, OnDestroy, OnInit {
  /** Any additional data to store with the link token. Be careful with this: don't use any known Storage keys. */
  @Input() additionalOAuthStorageData?: Record<string, string>;

  @Output() readonly loaded = new EventEmitter<void>();
  @Output() readonly error = new EventEmitter<void>();
  @Output() readonly exit = new EventEmitter<void>();
  @Output() readonly success = new EventEmitter<{ publicToken: string; metadata: Record<string, unknown> }>();

  accessToken?: string;
  partyID?: string;
  readonly peerPaymentsBaseURL: string;
  /** The actual, full URI if the user has been redirected from their bank's App. This will only be available after a redirect. */
  receivedRedirectUri?: string;
  /** The stored Plaid Link Token from the user's previous session before they were sent to their bank's app. */
  storedLinkToken?: string;
  /** The static redirect URI (without Plaids OAuth extras) which we encode into the Link Token. */
  tokenRedirectURI?: string;
  private readonly storage: StorageProxy<{ plaidRedirectLinkToken: string; [other: string]: string }>;

  @ViewChild('plaid')
  plaidWebComponent: ElementRef<HTMLElement & PlaidWebComponent>;

  constructor(
    private readonly alertService: AlertService,
    envInfoService: EnvInfoService,
    private readonly messageService: MessageService,
    private readonly searchParamsService: SearchParamsService,
    private readonly store: Store
  ) {
    this.storage = getStorageProxy({
      ignoreStorageErrors: true,
    });
    this.peerPaymentsBaseURL = envInfoService.getPeerPaymentsBaseUrl();
  }

  ngOnInit(): void {
    const store = this.store.getState();
    this.accessToken = store.authInfo.access_token;
    this.partyID = getCurrentParty(store).id;
    this.storedLinkToken = this.storage.plaidRedirectLinkToken;
    this.receivedRedirectUri = this.searchParamsService.get('plaid_redirect_uri') || undefined;
    this.tokenRedirectURI = this.storage.isWritable ? store.brandConfig?.plaid?.oAuthRedirectUri : undefined;
  }

  ngAfterViewInit(): void {
    // the Web Component will not be present for unit tests
    if (typeof this.plaidWebComponent.nativeElement?.create === 'function') {
      this.plaidWebComponent.nativeElement.create().then(() => {
        this.plaidWebComponent.nativeElement.open();
      });
    }
  }

  ngOnDestroy(): void {
    // the Web Component will not be present for unit tests
    if (typeof this.plaidWebComponent.nativeElement?.destroy === 'function') {
      this.plaidWebComponent.nativeElement.destroy();
    }
  }

  onEvent(eventName: string): void {
    if (eventName === 'OPEN') {
      if (!this.storage.isWritable) {
        this.alertService.addNotification({
          message: {
            key: 'payment-plaid.warnings.private-browsing',
          },
        });
      }
      if (this.tokenRedirectURI) {
        this.prepareForOAuth();
      }
    }
  }

  onExit(error: Record<string, string> | null): void {
    this.cleanupAfterOAuth();
    if (error) {
      this.error.emit();
    } else {
      this.exit.emit();
    }
  }

  onSuccess(publicToken: string, metadata: Record<string, unknown>): void {
    this.cleanupAfterOAuth();
    this.success.emit({ publicToken, metadata });
  }

  private prepareForOAuth(): void {
    if (this.additionalOAuthStorageData) {
      Object.keys(this.additionalOAuthStorageData).forEach((key) => {
        this.storage[key] = this.additionalOAuthStorageData[key];
      });
    }
    this.storage.plaidRedirectLinkToken = this.plaidWebComponent.nativeElement.linkToken;
    this.messageService.sendEvent({
      action: 'plaidOAuthStarted',
    });
  }

  private cleanupAfterOAuth(): void {
    delete this.storage.plaidRedirectLinkToken;
    if (this.additionalOAuthStorageData) {
      Object.keys(this.additionalOAuthStorageData).forEach((key) => {
        delete this.storage[key];
      });
    }
    this.messageService.sendEvent({
      action: 'plaidOAuthFinished',
    });
  }
}
