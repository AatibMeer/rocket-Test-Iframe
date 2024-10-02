import { Component, OnDestroy, OnInit } from '@angular/core';
import { Subject } from 'rxjs';
import { take, takeUntil } from 'rxjs/operators';
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
} from '../../../state/actions/temporary-payment-agreement';
import type { State } from '../../../state/reducers/main.interface';

const baseClass = 'rl-payment-recipient-modal';

@Component({
  selector: 'rl-payment-recipient-modal',
  styleUrls: ['./payment-payee-modal.component.scss'],
  templateUrl: './payment-payee-modal.component.html',
})
export class PaymentPayeeModalComponent implements OnDestroy, OnInit {
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
   * If there is a payee in the temporary payment agreement, that party is returned first. If there is only one party
   * in the binder (who is not a payer), that party is returned second.
   * @param binderParties - This collection should have the payer(s) removed, already.
   * @param tempAgreementPayeeID - If set, the party with this ID will be returned.
   * @private
   */
  private getSelectedParty(binderParties: Party[], tempAgreementPayeeID?: string | undefined): Party | undefined {
    if (tempAgreementPayeeID) {
      return binderParties.find((party) => party.id === tempAgreementPayeeID) || this.getSelectedParty(binderParties);
    }
    return binderParties.length === 1 ? binderParties[0] : undefined;
  }

  next(): void {
    this.store.dispatch(setTemporaryPaymentAgreementPayee(this.selectedParty.id));
    this.modalControlService.navigate('next');
  }

  ngOnDestroy(): void {
    this.destroy.next();
    this.selectedParty = undefined;
  }

  ngOnInit(): void {
    const unsubscribe = this.store.subscribe((state) => {
      this.stateChanged(state);
    });
    this.destroy.pipe(take(1)).subscribe(() => unsubscribe());

    this.stateChanged(this.store.getState());

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
    if (intention.data.to === 'back') {
      this.modalControlService.close(CloseReason.UserNavigatedBack);
    } else if (intention.data.to === 'editParty') {
      this.store.dispatch(
        selectPartyForEdit({
          party: intention.data.party,
          returnRoute: 'paymentPayeeModal',
        })
      );
      this.modalControlService.close(CloseReason.UserNavigatedNext, {
        nextModal: 'editParty',
      });
    } else if (intention.data.to === 'newParty') {
      this.store.dispatch(
        selectPartyForEdit({
          party: undefined,
          returnRoute: 'paymentPayeeModal',
        })
      );
      this.modalControlService.close(CloseReason.UserNavigatedNext, {
        nextModal: 'editParty',
      });
    } else if (intention.data.to === 'next') {
      this.modalControlService.close(CloseReason.UserNavigatedNext, {
        nextModal: 'next',
      });
    }
  }

  selectParty(party: Party): void {
    this.selectedParty = party;
  }

  private stateChanged(state: State): void {
    this.parties = state.binder.parties.filter((party) => {
      return state.paymentAgreementTemp.payerID !== party.id;
    });
    this.selectedParty = this.getSelectedParty(this.parties as Party[], state.paymentAgreementTemp.payerID);
  }
}
