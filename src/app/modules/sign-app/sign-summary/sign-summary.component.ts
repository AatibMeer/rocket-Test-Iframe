import { Component, Output, EventEmitter, OnDestroy } from '@angular/core';
import { Store } from '../../../state/store';
import { Binder } from '../../../services/sign-app/binder.interface';
import { SignService } from '../../../services/sign-app/sign.service';
import { AlertService } from '../../../services/sign-app/alert.service';
import { setSignatureBuilderMode } from '../../../state/actions/uiProps';
import { ModalType } from '../sign-app-dashboard/modal-type.enum';
import type { State } from '../../../state/reducers/main.interface';
import { PartyService } from '../../../services/sign-app/party.service';
import { getStorageProxy, StorageProxy } from '../../../services/common/storage.service';

@Component({
    selector: 'sign-summary',
    templateUrl: './sign-summary.component.html',
    styleUrls: ['./sign-summary.component.scss']
})

export class SignSummaryComponent implements OnDestroy {
    private readonly storage: StorageProxy<{ showOwnerFinaliseWarning: string }>;
    constructor(
        private store: Store,
        private signService: SignService,
        private alertService: AlertService,
        private partyService: PartyService,
    ) {
        var state = this.store.getState();
        this.setupComponent(state);
        let sub = this.store.subscribe((state) => this.setupComponent(state));
        this.subscriptions.push(sub);
        this.storage = getStorageProxy({
            storage: sessionStorage,
            ignoreStorageErrors: true,
        });
    }
    @Output() onShowInviteCollaborators: EventEmitter<any> = new EventEmitter();
    @Output() onSavedChanges: EventEmitter<any> = new EventEmitter();
    @Output() onShowWarning: EventEmitter<any> = new EventEmitter();

    binder: Readonly<Binder>;
    // originalBinder is used to store data saved in API
    private subscriptions: Function[] = [];
    actionInProgress = false;
    cancelInProgress = false;


    ngOnDestroy() {
        this.subscriptions.forEach(unsub => unsub());
    }

    setupComponent(state: State) {
        if(!state.binder) return;
        this.binder = state.binder;
        this.signerDataIsMissing = this.binder.parties.filter(p => !p.legalName || !p.email).length != 0;
    }

    @Output() showModal = new EventEmitter<ModalType>();
    private signerDataIsMissing = false;
    saveChanges() {
        if(this.signerDataIsMissing) {
            this.showModal.emit('addSignerDataModal');
            return;
        }
        if (this.storage.isWritable) {
            if (!this.storage.showOwnerFinaliseWarning) {
                this.onShowWarning.emit();
                return;
            }
        }
        else {
            this.onShowWarning.emit();
            return;
        }
        this.actionInProgress = true;
        this.partyService.ensurePartyRefIntegrity()
          .subscribe({
              next: () => {
                  this.actionInProgress = false;
                  this.store.dispatch(setSignatureBuilderMode(false));
                  this.onSavedChanges.emit();
              },
              error: () => {
                  this.alertService.addDangerAlert({
                      message: 'sign-summary_prepare-to-sign-submit-failed',
                  });
              }
          })
    }

    cancel() {
        this.cancelInProgress = true;
        this.signService.getBinder(this.store.getState().get('binder').id, {fetchPages: false})
        .subscribe( () => {
            this.store.dispatch(setSignatureBuilderMode(false));
            this.cancelInProgress = false;
        });
    }

    getBinder(callback) {
        this.signService.getBinder(this.store.getState().get('binder').id, {fetchPages: false})
        .subscribe( () => {
            callback();
        });
    }
}