import { Component, Input, OnInit } from '@angular/core';
import { Binder } from '../../../../services/sign-app/binder.interface';
import { CustomActionsModal } from '../../../../common/interfaces/branding.interface';
import { ActionItem } from '../../action-modal/custom-menu-item.interface';
import { SearchParamsService } from '../../../../services/sign-app/search-params.service';

@Component({
  selector: 'rl-copy-document-actions-container',
  templateUrl: './copy-document-actions-container.component.html',
})
export class CopyDocumentActionsContainerComponent implements OnInit {
  @Input() binder: Binder;
  @Input() signerDataComplete: boolean;
  @Input() binderHasInputs: boolean;
  @Input() ownerUser: boolean;
  @Input() customActionsModal: CustomActionsModal[];
  @Input() actions: ActionItem[];
  @Input() userIsPayee: boolean;
  @Input() payeeAccountAttached: boolean;
  @Input() payeeAccountVerificationFailed: boolean;
  @Input() payoutEnabled: boolean;
  private enabled = true;

  activatedCustomActionsModal: CustomActionsModal;

  constructor(private readonly searchParams: SearchParamsService) {}

  ngOnInit(): void {
    if (this.customActionsModal) {
      this.activatedCustomActionsModal = this.customActionsModal.find((modal) =>
        this.searchParams.notEmpty(modal.queryParamToActivate)
      );
    }
  }

  invokeAction(actionItemId: string): void {
    const foundAction = this.actions.find((action) => action.id === actionItemId);
    foundAction.onClick();
    this.enabled = false;
  }

  hasEnabledLayoutForCompletedDocuments(): boolean {
    return (
      this.searchParams.notEmpty('copyDocument') &&
      this.binder.status === 'SIGN_COMPLETED' &&
      this.ownerUser &&
      this.signerDataComplete &&
      this.binderHasInputs &&
      (!this.userIsPayee || (this.payeeAccountAttached && !this.payeeAccountVerificationFailed && this.payoutEnabled))
    );
  }

  hasEnabledLayoutForCopiedDocuments(): boolean {
    return (
      this.enabled &&
      this.binder.status === 'IN_PREPARATION' &&
      this.ownerUser &&
      !!this.activatedCustomActionsModal &&
      this.signerDataComplete &&
      this.binderHasInputs &&
      (!this.userIsPayee || (this.payeeAccountAttached && !this.payeeAccountVerificationFailed && this.payoutEnabled))
    );
  }
}
