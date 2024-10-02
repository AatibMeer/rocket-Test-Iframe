import { Component, OnDestroy, OnInit } from '@angular/core';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { BoundBEM, makeBlockBoundBEMFunction } from '../../../common/utility-components/util-functions';
import { Party } from '../../../services/sign-app/party.interface';
import { Store } from '../../../state/store';
import { selectPartyForEdit } from '../../../state/actions/party-route';
import {
  CloseReason,
  ModalCloseIntention,
  ModalControlService,
  ModalNavigateIntention,
} from '../../../services/sign-app/modal-control.service';
import {
  clearTemporaryPaymentAgreement,
  setTemporaryPaymentAgreementPayee,
  setTemporaryPaymentAgreementPayer,
} from '../../../state/actions/temporary-payment-agreement';
import type { State } from '../../../state/reducers/main.interface';

const baseClass = 'rl-payment-paying-modal';

@Component({
  selector: 'rl-payment-paying-modal',
  styleUrls: ['./payment-payer-modal.component.scss'],
  templateUrl: './payment-payer-modal.component.html',
})
export class PaymentPayerModalComponent implements OnDestroy, OnInit {
  readonly bem: BoundBEM;
  private readonly destroy: Subject<void>;
  parties: Array<Readonly<Party>>;
  selectedParty: Readonly<Party> | undefined;

  constructor(private readonly modalControlService: ModalControlService, private readonly store: Store) {
    this.bem = makeBlockBoundBEMFunction(baseClass);
    this.destroy = new Subject<void>();
    this.parties = [];
  }

  addNewParty(): void {
    this.modalControlService.navigate('newParty');
  }

  editParty(party: Party): void {
    this.modalControlService.navigate('editParty', {
      party,
    });
  }

  /**
   * Get the party which should be selected.
   *
   * If there is a payer in the temporary payment agreement, that party is returned first. If there is only one party
   * in the binder (who is not a payee), that party is returned second.
   * @param binderParties - This collection should have the payee(s) removed, already.
   * @param tempAgreementPayerID - If set, the party with this ID will be returned.
   * @private
   */
  private getSelectedParty(
    binderParties: Readonly<Party>[],
    tempAgreementPayerID?: string | undefined
  ): Party | undefined {
    if (tempAgreementPayerID) {
      return binderParties.find((party) => party.id === tempAgreementPayerID) || this.getSelectedParty(binderParties);
    }
    return binderParties.length === 1 ? binderParties[0] : undefined;
  }

  next(): void {
    const { paymentAgreementTemp } = this.store.getState();
    this.store.dispatch(setTemporaryPaymentAgreementPayer(this.selectedParty.id));
    if (paymentAgreementTemp.payeeID === this.selectedParty.id) {
      this.store.dispatch(setTemporaryPaymentAgreementPayee(undefined));
    }
    this.modalControlService.navigate('next');
  }

  ngOnDestroy(): void {
    this.destroy.next();
    this.selectedParty = undefined;
  }

  ngOnInit(): void {
    this.store
      .getState$()
      .pipe(takeUntil(this.destroy))
      .subscribe((state) => this.stateChanged(state));

    this.modalControlService.close$.pipe(takeUntil(this.destroy)).subscribe((intention) => this.onClose(intention));

    this.modalControlService.navigate$
      .pipe(takeUntil(this.destroy))
      .subscribe((intention) => this.onNavigate(intention));
  }

  private onClose(intention: ModalCloseIntention): void {
    if (intention.data.reason !== CloseReason.UserNavigatedNext) {
      // clean up
      this.store.dispatch(clearTemporaryPaymentAgreement());
    }
  }

  private onNavigate(intention: ModalNavigateIntention): void {
    if (intention.data.to === 'editParty') {
      this.store.dispatch(
        selectPartyForEdit({
          party: intention.data.party,
          returnRoute: 'paymentPayerModal',
        })
      );
      this.modalControlService.close(CloseReason.UserNavigatedNext, {
        nextModal: 'editParty',
      });
    } else if (intention.data.to === 'newParty') {
      this.store.dispatch(
        selectPartyForEdit({
          party: undefined,
          returnRoute: 'paymentPayerModal',
        })
      );
      this.modalControlService.close(CloseReason.UserNavigatedNext, {
        nextModal: 'editParty',
      });
    } else if (intention.data.to === 'next') {
      if (this.store.getState().paymentAgreementTemp.payeeID) {
        this.modalControlService.close(CloseReason.UserNavigatedNext, {
          nextModal: 'paymentDetails',
        });
      } else {
        this.modalControlService.close(CloseReason.UserNavigatedNext, {
          nextModal: 'selectPayee',
        });
      }
    } else if (intention.data.to === 'back') {
      this.modalControlService.close(CloseReason.UserNavigatedBack);
    }
  }

  selectParty(party: Party): void {
    this.selectedParty = party;
  }

  private stateChanged(state: State): void {
    this.parties = state.binder.parties.filter((party) => {
      return state.paymentAgreementTemp.payeeID !== party.id;
    });
    this.selectedParty = this.getSelectedParty(this.parties, state.paymentAgreementTemp.payerID);
  }
}
