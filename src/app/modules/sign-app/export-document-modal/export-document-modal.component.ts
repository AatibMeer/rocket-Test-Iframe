import { Component } from '@angular/core';
import { Store } from '../../../state/store';

import { SignService } from '../../../services/sign-app/sign.service';
import { fadeInOut, modalScaleInOut } from '../../../animations/animations';
import { MessageService } from '../message';
import { UserAgentService } from '../../../services/common/user-agent.service';
import { Binder } from '../../../services/sign-app/binder.interface';
import { CloseReason, ModalControlService } from '../../../services/sign-app/modal-control.service';
import { TrackingPublisher } from '../../tracking/publisher';

@Component({
  selector: 'export-document-modal',
  templateUrl: './export-document-modal.component.html',
  styleUrls: ['./export-document-modal.component.scss'],
  animations: [fadeInOut, modalScaleInOut],
})
export class ExportDocumentModalComponent {
  wordDocumentDownloading = false;
  pdfDocumentDownloading = false;

  constructor(
    private store: Store,
    private signService: SignService,
    private messageService: MessageService,
    private userAgentService: UserAgentService,
    private modalControlService: ModalControlService,
    private readonly eventTracker: TrackingPublisher
  ) {}

  close(): void {
    this.modalControlService.close(CloseReason.UserNavigatedNext, {
      nextModal: 'next',
    });
  }

  exportWord(): void {
    this.wordDocumentDownloading = true;
    const binder = this.store.getState().get('binder');

    this.signService.download(binder, '.docx').subscribe((blob) => {
      if (blob) this.modalControlService.close(CloseReason.CompletedSuccessfully);
    });
  }

  exportPdf(): void {
    this.pdfDocumentDownloading = true;
    const binder: Binder = this.store.getState().get('binder');
    this.signService.download(binder, '.pdf').subscribe((blob) => {
      if (blob) this.modalControlService.close(CloseReason.CompletedSuccessfully);
    });
  }
}
