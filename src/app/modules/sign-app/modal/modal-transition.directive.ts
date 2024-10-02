// eslint-disable-next-line max-classes-per-file
import { AnimationEvent } from '@angular/animations';
import {
  ChangeDetectorRef,
  Directive,
  EventEmitter,
  HostBinding,
  HostListener,
  Injectable,
  Input,
  OnDestroy,
  OnInit,
  Output,
} from '@angular/core';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { CloseReason, ModalControlService } from '../../../services/sign-app/modal-control.service';
import { TrackingPublisher } from '../../tracking/publisher';

/**
 * Whether it's A or B makes no difference: it's just important that the strings are different.
 * @see the show variable in modal.component.ts
 */
type Directions = 'backA' | 'backB' | 'forwardA' | 'forwardB' | 'endA' | 'endB';

/**
 * This directive is the mediator between the ModalControlService and the modal router.
 * It listens to the service for close intentions and stores the next route. When the animation finishes, an event is
 * emitted which can be used to call the routeModal() method in the dashboard.
 *
 * The ModalFlowService is used to control the animation as the value needs to be carefully controlled between all modals.
 */
@Directive({
  selector: '[rl-modal-transition]',
})
export class ModalTransitionDirective implements OnDestroy, OnInit {
  private readonly destroy: Subject<void>;
  /** Adds the showModal animation to the host and controls that animation. */
  @HostBinding('@showModal')
  private _transition: Directions;
  @Input('rl-modal-transition')
  set transition(transition: Directions) {
    this._transition = transition;
  }
  /** Emits when a modal is hidden. Use this event to make the next route happen. */
  @Output('rl-modal-transition-onHide')
  readonly onHideComplete = new EventEmitter<{ nextModal: string }>();
  private to: string;

  constructor(
    private readonly modalControlService: ModalControlService,
    private readonly eventTracker: TrackingPublisher
  ) {
    this.destroy = new Subject<void>();
  }

  ngOnDestroy(): void {
    this.destroy.next();
  }

  ngOnInit(): void {
    this.modalControlService.close$.pipe(takeUntil(this.destroy)).subscribe((state /*: ModalCloseIntention */) => {
      if (state.data.nextModal) {
        this.to = state.data.nextModal;
      } else if (state.data.reason === CloseReason.UserNavigatedBack) {
        this.to = 'back';
      } else if (state.data.reason === CloseReason.UserNavigatedNext) {
        this.to = 'next';
      } else {
        if (state.data.reason === CloseReason.UserTerminated) {
          this.eventTracker.userTerminatedModal({});
        } else if (
          state.data.reason === CloseReason.CompletedSuccessfully ||
          state.data.reason === CloseReason.CompletedWithError
        ) {
          this.eventTracker.modalClosed();
        }
        this.to = 'end';
      }
    });
  }

  /** Triggered when the showModal animation completes, it will emit an event only when the modal was hidden (closed). */
  @HostListener('@showModal.done', ['$event'])
  onAnimationComplete(event: AnimationEvent): void {
    if (event.fromState !== 'void') {
      this.onHideComplete.emit({
        nextModal: this.to,
      });
    }
  }
}

/**
 * A temporary halfway-house until we can get some "proper" Angular routing to control modal flow.
 * It allows for modals on the dashboard to quickly hook into the ModalControlService before they are updated to use the
 * modal component.
 * Its main function is to listen to the ModalControlService and control the ModalTransitionDirective's animation
 * direction appropriately.
 */
@Injectable()
export class ModalFlowService implements OnDestroy {
  private readonly destroy = new Subject<void>();
  private _direction: Directions = 'endA';
  get direction(): Directions {
    return this._direction;
  }

  constructor(private readonly modalControlService: ModalControlService, private readonly changeDetectorRef: ChangeDetectorRef) {
    this.modalControlService.close$.pipe(takeUntil(this.destroy)).subscribe((state /*: ModalCloseIntention */) => {
      switch (state.data.reason) {
        case CloseReason.UserNavigatedNext:
          this.forwardDirection();
          break;
        case CloseReason.UserNavigatedBack:
          this.backwardDirection();
          break;
        case CloseReason.CompletedWithError:
        case CloseReason.CompletedSuccessfully:
        case CloseReason.UserTerminated:
        default:
          this.endDirection();
          break;
      }

      // We need to force the changes detection after the PerimeterX captcha is solved to trigger the modal animation
      this.changeDetectorRef.detectChanges();
    });
  }

  /**
   * @deprecated You don't need to call this directly if you use the ModalControlService
   */
  end(reason?: CloseReason): void {
    this.modalControlService.close(reason);
  }

  private endDirection(): void {
    this._direction = this._direction !== 'endA' ? 'endA' : 'endB';
  }

  /**
   * @deprecated You don't need to call this directly if you use the ModalControlService
   * @param [nextModal] - This should match up with a nextModal key in the modal-router.ts.
   */
  backward(nextModal?: string): void {
    this.modalControlService.close(CloseReason.UserNavigatedBack, {
      nextModal,
    });
  }

  private backwardDirection(): void {
    this._direction = this._direction !== 'backA' ? 'backA' : 'backB';
  }

  /**
   * @deprecated You don't need to call this directly if you use the ModalControlService
   * @param [nextModal] - This should match up with a "to" key in the modal-router.ts
   */
  forward(nextModal?: string): void {
    this.modalControlService.close(CloseReason.UserNavigatedNext, {
      nextModal,
    });
  }

  private forwardDirection(): void {
    this._direction = this._direction !== 'forwardA' ? 'forwardA' : 'forwardB';
  }

  ngOnDestroy(): void {
    this.destroy.next();
  }
}
