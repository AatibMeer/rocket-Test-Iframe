import { Injectable } from '@angular/core';
import { Observable, Subject } from 'rxjs';
import { filter } from 'rxjs/operators';

export enum CloseReason {
  UserNavigatedBack,
  UserNavigatedNext,
  UserTerminated,
  CompletedSuccessfully,
  CompletedWithError,
}

export type ModalIntent = 'close' | 'leftHeaderWidgetClick' | 'rightHeaderWidgetClick' | 'navigate';

export interface ModalIntention {
  data: Record<any, any>;
  intent: ModalIntent;
}
export interface ModalCloseIntention extends ModalIntention {
  data: { nextModal?: string; reason: CloseReason } & Record<any, any>;
  intent: 'close';
}
export interface ModalHeaderWidgetClickIntention extends ModalIntention {
  data: Record<any, any>;
  intent: 'leftHeaderWidgetClick' | 'rightHeaderWidgetClick';
}
export interface ModalNavigateIntention extends ModalIntention {
  data: { to: string } & Record<any, any>;
  intent: 'navigate';
}

interface IModalControlService {
  /** Emits on close intentions */
  readonly close$: Observable<ModalCloseIntention>;
  /** Emits on navigate intentions */
  readonly navigate$: Observable<ModalNavigateIntention>;
  /** Emits on all intentions */
  readonly state$: Observable<ModalIntention>;

  /** Trigger a close intention */
  close(reason: CloseReason, data?: { nextModal?: string } & Record<any, any>): void;
  /** Trigger a header widget click intention */
  leftHeaderWidgetClick(data?: Record<any, any>): void;
  /** Trigger a navigate intention */
  navigate(to: string, data?: Record<any, any>): void;
  /** Trigger a header widget click intention */
  rightHeaderWidgetClick(data?: Record<any, any>): void;
}

@Injectable()
export class ModalControlService implements IModalControlService {
  /** Emits on close intentions */
  readonly close$: Observable<ModalCloseIntention>;
  /** Emits on navigate intentions */
  readonly navigate$: Observable<ModalNavigateIntention>;
  private readonly state: Subject<ModalIntention>;
  /** Emits on all intentions */
  readonly state$: Observable<ModalIntention>;

  static IsCloseIntention(intention: ModalIntention): intention is ModalCloseIntention {
    return intention.intent === 'close';
  }

  static IsHeaderWidgetClickIntention(intention: ModalIntention): intention is ModalHeaderWidgetClickIntention {
    return intention.intent === 'leftHeaderWidgetClick' || intention.intent === 'rightHeaderWidgetClick';
  }

  static IsNavigateIntention(intention: ModalIntention): intention is ModalNavigateIntention {
    return intention.intent === 'navigate';
  }

  constructor() {
    this.state = new Subject<ModalIntention>();
    this.state$ = this.state.asObservable();
    this.close$ = this.state$.pipe(filter(ModalControlService.IsCloseIntention));
    this.navigate$ = this.state$.pipe(filter(ModalControlService.IsNavigateIntention));
  }

  /** Trigger a close intention */
  close(reason: CloseReason, data?: { nextModal?: string } & Record<any, any>): void {
    this.state.next({
      intent: 'close',
      data: data ? { ...data, reason } : { reason },
    });
  }

  private headerWidgetClick(which: 'left' | 'right', data?: Record<any, any>): void {
    this.state.next({
      intent: `${which}HeaderWidgetClick` as 'leftHeaderWidgetClick',
      data: data || {},
    });
  }

  /** Trigger a header widget click intention */
  leftHeaderWidgetClick(data?: Record<any, any>): void {
    return this.headerWidgetClick('left', data);
  }

  /**
   * Trigger a navigate intention.
   *
   * A modal should not move in response to this intention but may trigger another intention as a result of it.
   */
  navigate(to: string, data?: Record<any, any>): void {
    this.state.next({
      intent: 'navigate',
      data: data ? { ...data, to } : { to },
    });
  }

  /** Trigger a header widget click intention */
  rightHeaderWidgetClick(data?: Record<any, any>): void {
    return this.headerWidgetClick('right', data);
  }
}
