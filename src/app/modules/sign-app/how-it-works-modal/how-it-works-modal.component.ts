import { Component, OnDestroy, OnInit, Output } from '@angular/core';
import { TranslateService } from '@ngx-translate/core';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { fadeInOut, modalScaleInOut } from '../../../animations/animations';
import {
  CloseReason,
  ModalControlService,
  ModalNavigateIntention,
} from '../../../services/sign-app/modal-control.service';

@Component({
  selector: 'how-it-works-modal',
  templateUrl: './how-it-works-modal.component.html',
  styleUrls: ['./how-it-works-modal.component.scss'],
  animations: [modalScaleInOut, fadeInOut],
})
export class HowItWorksModalComponent implements OnInit, OnDestroy {
  constructor(protected modalControlService: ModalControlService, private translateService: TranslateService) {}

  protected readonly destroy = new Subject<void>();
  lang = 'en';

  ngOnInit() {
    this.modalControlService.navigate$
      .pipe(takeUntil(this.destroy))
      .subscribe((intention) => this.onNavigate(intention));
    this.lang = this.translateService.getDefaultLang();
  }

  private onNavigate(intention: ModalNavigateIntention): void {
    this.modalControlService.close(CloseReason.UserNavigatedBack);
  }

  ngOnDestroy() {
    this.destroy.next();
  }

  close() {
    this.modalControlService.close(CloseReason.CompletedSuccessfully);
  }
}
