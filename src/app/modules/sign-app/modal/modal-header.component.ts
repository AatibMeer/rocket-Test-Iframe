import { AfterContentInit, Component, ContentChildren, QueryList } from '@angular/core';
import { ModalHeaderWidgetDirective } from './modal-header-widget.directive';
import { makeBlockBoundBEMFunction } from '../../../common/utility-components/util-functions';
import { ModalControlService } from '../../../services/sign-app/modal-control.service';
import { ModalHeaderBase, WithWidgets } from './modal-header';

const baseClass = 'rl-modal-header';
const Base = WithWidgets(ModalHeaderBase);

@Component({
  selector: 'rl-modal-header',
  styleUrls: ['./modal-header.component.scss'],
  templateUrl: './modal-header.component.html',
})
export class ModalHeaderComponent extends Base implements AfterContentInit {
  @ContentChildren(ModalHeaderWidgetDirective) widgets?: QueryList<ModalHeaderWidgetDirective>;

  readonly bem = makeBlockBoundBEMFunction(baseClass);

  constructor(private readonly modalControlService: ModalControlService) {
    super();
  }

  ngAfterContentInit(): void {
    this.setupWidgets();
  }

  leftWidgetClick(): void {
    if (this.leftWidget) {
      this.modalControlService.leftHeaderWidgetClick();
    }
  }

  rightWidgetClick(): void {
    if (this.rightWidget) {
      this.modalControlService.rightHeaderWidgetClick();
    }
  }
}
