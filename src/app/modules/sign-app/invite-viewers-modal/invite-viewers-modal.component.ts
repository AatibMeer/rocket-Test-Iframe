import { Component, Input, Output, EventEmitter, HostListener, Inject, OnInit, OnDestroy } from '@angular/core';
import { DOCUMENT } from '@angular/common';
import { TranslatePipe, TranslateService } from '@ngx-translate/core';

import { takeUntil } from 'rxjs/operators';
import { Subject } from 'rxjs';
import { Store } from '../../../state/store';
import { AlertService } from '../../../services/sign-app/alert.service';
import { SignService } from '../../../services/sign-app/sign.service';
import { Binder } from '../../../services/sign-app/binder.interface';
import { Party, RoleEnum } from '../../../services/sign-app/party.interface';
import { ValidationService } from '../../../services/common/validation.service';
import { fadeInOut, modalScaleInOut, slideInOut } from '../../../animations/animations';
import { getPartyByRoleName } from '../../../state/selectors';
import {
  CloseReason,
  ModalControlService,
  ModalNavigateIntention,
} from '../../../services/sign-app/modal-control.service';
import { MessageService } from '../message';

@Component({
  selector: 'invite-viewers-modal',
  templateUrl: './invite-viewers-modal.component.html',
  styleUrls: ['./invite-viewers-modal.component.scss'],
  animations: [fadeInOut, modalScaleInOut, slideInOut],
  providers: [TranslatePipe],
})
export class InviteViewersModalComponent implements OnInit, OnDestroy {
  constructor(
    @Inject(TranslateService) private translate: TranslateService,
    private alertService: AlertService,
    private signService: SignService,
    private readonly modalControlService: ModalControlService,
    private validationService: ValidationService,
    private store: Store,
    @Inject(DOCUMENT) private documentEl: Document,
    private translatePipe: TranslatePipe,
    private messageService: MessageService
  ) {
    this.binder = this.store.getState().binder;
    const sub = this.store.subscribe((state) => {
      this.binder = state.binder;
    });
    this.subscriptions.push(sub);
  }

  binder: Binder;
  actionInProgress = false;
  actionAttempted = false;
  viewerName = '';
  viewerEmail = '';
  customMessage = '';
  customMessageLength = 0;
  ownerParty: Party;
  binderHasViewers = false;
  subscriptions: Function[] = [];
  private readonly destroy = new Subject<void>();

  @Input() showModal: boolean;
  @Output() closeModal = new EventEmitter<boolean>();
  @Output() startAction = new EventEmitter<string>();
  @HostListener('document:click', ['$event'])
  onClick() {
    // all other click handlers stop propagation,
    // so this will only trigger for unhandled clicks
    if (this.showModal) {
      this.close();
    }
  }

  ngOnInit() {
    this.binderHasViewers = !!this.binder.parties.find((p) => p.roles.includes(RoleEnum.Viewer));
    this.ownerParty = getPartyByRoleName(this.binder, RoleEnum.Owner);
    this.modalControlService.navigate$
      .pipe(takeUntil(this.destroy))
      .subscribe((intention) => this.onNavigate(intention));
  }

  ngOnDestroy(): void {
    this.subscriptions.forEach((unsub) => unsub());
    this.destroy.next();
  }

  private onNavigate(intention: ModalNavigateIntention): void {
    this.modalControlService.close(CloseReason.UserNavigatedBack);
  }

  sendInvitations() {
    this.actionAttempted = true;
    if (!this.isFormValid()) return;
    this.actionInProgress = true;
    const party = {
      legalName: this.viewerName,
      email: this.viewerEmail,
    };
    this.signService.sendNewViewer(party, this.binder.id, this.messageOrDefault(this.customMessage)).subscribe({
      complete: () => {
        this.onSuccess(party.legalName);
      },
      error: () => {
        this.onError();
      },
    });
  }

  private messageOrDefault(message: string) {
    return message || this.translatePipe.transform('invite-viewers-modal_placeholder-message');
  }

  onSuccess(viewerName) {
    this.signService.getBinder(this.store.getState().binder.id, { fetchPages: false }).subscribe((binder) => {
      this.messageService.sendEvent({
        eventName: 'VIEWER_INVITED',
        binder,
        category: 'SignEvent',
      });
      this.actionInProgress = false;
      this.goBack();
      this.alertService.setAlertMessage({
        message: 'invite-collaborators-modal_invitations-sent',
        type: 'success',
        params: { viewerName },
      });
    });
  }

  onError() {
    this.actionInProgress = false;
    this.close();
    this.alertService.setAlertMessage({ message: 'invite-collaborators-modal_invitations-error', type: 'danger' });
  }

  isFormValid(): boolean {
    return (
      this.isNameValid() &&
      this.isEmailValid() &&
      this.isMessageValid() &&
      !this.isViewerAlreadyInvited() &&
      !this.isViewerSigner() &&
      !this.isViewerOwner()
    );
  }
  isNameValid(): boolean {
    return this.viewerName.trim().length > 0;
  }
  isEmailValid(): boolean {
    const valid = this.validationService.emailValidation(this.viewerEmail);
    return valid;
  }
  isViewerOwner(): boolean {
    const ownerEmail = this.ownerParty.email.toLowerCase();
    const viewerEmail = this.viewerEmail.toLowerCase();
    return ownerEmail == viewerEmail;
  }
  isViewerSigner(): boolean {
    const viewerEmail = this.viewerEmail.toLowerCase();
    return this.binder.parties.some((p) => p.roles.includes(RoleEnum.Signer) && p.email?.toLowerCase() == viewerEmail);
  }
  isViewerAlreadyInvited(): boolean {
    const viewerEmail = this.viewerEmail.toLowerCase();
    return this.binder.parties.some((p) => p.roles.includes(RoleEnum.Viewer) && p.email?.toLowerCase() == viewerEmail);
  }
  isMessageValid(): boolean {
    return this.customMessage.length <= 600;
  }

  getDocumentName() {
    if (!this.binder.documents[0]) return '';
    return this.binder.documents[0].name;
  }

  close() {
    if (this.actionInProgress) {
      return;
    }
    this.closeModal.emit();
  }

  goBack() {
    if (this.actionInProgress) {
      return;
    }
    this.modalControlService.navigate('back');
  }

  updateCounter(event) {
    this.customMessageLength = event.target.value.length;
  }
}
