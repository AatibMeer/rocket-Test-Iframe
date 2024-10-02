// eslint-disable-next-line max-classes-per-file
import {
  ChangeDetectionStrategy,
  Component,
  EventEmitter,
  HostBinding,
  HostListener,
  Input,
  NgModule,
  OnChanges,
  OnDestroy,
  OnInit,
  Output,
  SimpleChanges,
} from '@angular/core';
import { animate, AnimationEvent, style, transition, trigger } from '@angular/animations';
import { Subject, Observable } from 'rxjs';
import { distinctUntilChanged, pluck, takeUntil } from 'rxjs/operators';

import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { AlertService } from '../../../services/sign-app/alert.service';
import { makeBlockBoundBEMFunction } from '../../../common/utility-components/util-functions';
import { Alert } from '../../../state/actions/alerts';
import { Store } from '../../../state/store';
import { TrackingPublisher } from '../../tracking/publisher';
import { CommuteModule } from '../../../common/utility-components/commute/commute.module';
import { PipeModule } from '../../../common/pipes/pipe.module';
import { CommonModule } from '@angular/common';
import { TestDirectiveModule } from '../test-directive.module';

@Component({
  animations: [
    trigger('showHideAlert', [
      transition(':enter', [
        style({
          height: 0,
          opacity: 0.4,
        }),
        animate(
          '300ms cubic-bezier(0.34, 1.56, 0.64, 1)',
          style({
            height: '*',
            opacity: '*',
          })
        ),
      ]),
      transition(':leave', [
        animate(
          '300ms cubic-bezier(0.36, 0, 0.66, -0.56)',
          style({
            height: 0,
            opacity: 0.4,
          })
        ),
      ]),
    ]),
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'rl-alert',
  styleUrls: ['./alert.component.scss'],
  template: ` <div [class]="iconClassNames" role="presentation">
      <i class="rl-icon {{ icon }} {{ bem('icon') }}"></i>
    </div>
    <div
      [class]="messageClassNames"
      [comContent]="translation"
      [params]="translationParams"
      rl-test="alert-message"
      rl-typography="bold"
      size="small"
    ></div>
    <div [class]="closeClassNames">
      <button
        title="{{ 'alerts.close-a11y' | translate }}"
        [class]="closeButtonClassNames"
        (click)="closeClick.emit(alert)"
        rl-test="alert-close"
      >
        <i class="rl-icon close-x"></i>
      </button>
    </div>`,
})
export class AlertComponent implements OnChanges {
  @Input()
  alert: Readonly<Alert>;

  @Output()
  closeClick = new EventEmitter<Alert>();
  @Output()
  readonly onHide = new EventEmitter<Alert>();
  @Output()
  readonly onShow = new EventEmitter<Alert>();

  @HostBinding('@showHideAlert')
  readonly animate = true;

  readonly bem = makeBlockBoundBEMFunction('rl-alert');
  @HostBinding('class')
  classNames = 'rl-alert';
  messageClassNames = '';
  iconClassNames = '';
  closeClassNames = '';
  closeButtonClassNames = '';
  get translation(): string {
    return typeof this.alert.message === 'string' ? this.alert.message : this.alert.message.key;
  }
  get translationParams(): Record<string, unknown> | undefined {
    return typeof this.alert.message === 'string' ? undefined : this.alert.message.params;
  }
  get icon(): string {
    return this._icon;
  }

  private static readonly iconMap: Record<Alert['type'], string> = {
    success: 'alert-success',
    danger: 'alert-danger',
    notification: 'alert-info',
  };
  private _icon = '';

  ngOnChanges({ alert }: SimpleChanges): void {
    if (alert) {
      const { type } = alert.currentValue as Alert;
      this.classNames = this.bem({
        [type]: true,
      });
      this.messageClassNames = this.bem('message-container', {
        [type]: true,
      });
      this.iconClassNames = this.bem('icon-container', {
        [type]: true,
      });
      this.closeClassNames = this.bem('close-container', {
        [type]: true,
      });
      this.closeButtonClassNames = this.bem('close-btn', {
        [type]: true,
      });
      this._icon = AlertComponent.iconMap[type];
    }
  }

  @HostListener('@showHideAlert.done', ['$event'])
  onAnimationEvent(event: AnimationEvent): void {
    if (event.phaseName === 'done') {
      if (event.toState === 'void') {
        this.onHide.emit(this.alert);
      } else {
        this.onShow.emit(this.alert);
      }
    }
  }
}

@Component({
  selector: 'rl-alerts-container',
  styleUrls: ['./alert.component.scss'],
  template: `<div [class]="bem()">
      @for (alert of alerts | async; track alert) {
        <rl-alert
          [alert]="alert"
          (onShow)="alertShown($event)"
          (closeClick)="closeAlert($event, 'button')"
        ></rl-alert>
      }
    </div>`,
})
export class AlertContainerComponent implements OnDestroy, OnInit {
  static readonly AUTO_CLOSE_TIMEOUT = 5000;

  alerts: Observable<ReadonlyArray<Readonly<Alert>>>;
  readonly bem = makeBlockBoundBEMFunction('rl-alerts');

  private readonly destroy = new Subject<void>();

  constructor(
    private readonly alertService: AlertService,
    private readonly eventTracker: TrackingPublisher,
    private readonly translateService: TranslateService,
    private readonly store: Store
  ) {}

  ngOnInit(): void {
    this.alerts = this.store
      .getState$()
      .pipe(takeUntil(this.destroy), pluck('alerts', 'alerts'), distinctUntilChanged());
  }

  ngOnDestroy(): void {
    this.destroy.next();
  }

  alertShown(alert: Alert): void {
    if (alert.autoClose !== false) {
      setTimeout(() => this.closeAlert(alert, 'auto'), AlertContainerComponent.AUTO_CLOSE_TIMEOUT);
    }
    const { key, params } = AlertContainerComponent.getTranslation(alert);
    this.eventTracker.alertShown({
      type: alert.type,
      fullText: this.translateService.instant(key, params),
    });
  }

  closeAlert(alert: Alert, closeType: 'auto' | 'button' = 'auto'): void {
    this.alertService.deleteAlert(alert);
    const { key, params } = AlertContainerComponent.getTranslation(alert);
    this.eventTracker.alertDismissed({
      type: alert.type,
      fullText: this.translateService.instant(key, params),
      closeType,
    });
  }

  private static getTranslation(alert: Alert): { key: string; params?: Record<string, unknown> } {
    if (typeof alert.message === 'string') {
      return { key: alert.message };
    }
    return alert.message;
  }
}

@NgModule({
  imports: [CommuteModule, TranslateModule, CommonModule, TestDirectiveModule],
  declarations: [AlertComponent, AlertContainerComponent],
  exports: [AlertComponent, AlertContainerComponent],
})
export class AlertModule {}
