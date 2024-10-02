// eslint-disable-next-line max-classes-per-file
import {
  AfterContentInit,
  AfterViewInit,
  Component,
  ContentChildren,
  Directive,
  HostBinding,
  Inject,
  Input,
  OnChanges,
  QueryList,
  SimpleChanges,
} from '@angular/core';
import { Subject } from 'rxjs';
import {
  animate,
  animation,
  AnimationAnimateMetadata,
  AnimationMetadataType,
  AnimationReferenceMetadata,
  AnimationStyleMetadata,
  AnimationTriggerMetadata,
  group,
  query,
  style,
  transition,
  trigger,
  useAnimation,
} from '@angular/animations';
import { DOCUMENT } from '@angular/common';
import { TranslateService } from '@ngx-translate/core';
import { CloseReason, ModalControlService } from '../../../services/sign-app/modal-control.service';
import { TrackingPublisher } from '../../tracking/publisher';
import { Store } from '../../../state/store';

const baseClass = 'rl-modal';

const duration = '150ms';
const modalSelector = '.rl-modal, .modal-wrapper'; // .modal-wrapper is for legacy modals

/**
 * Combine animation()s which are using transforms into one animation() with one transform.
 *
 * It only works with animation()s exactly in the format used in this file. If you are going to use different animations,
 * (such as introducing sequence() or group()) then you'll need to modify this function
 */
function combineTransforms(...animations: AnimationReferenceMetadata[]): AnimationReferenceMetadata {
  let startStyle: Record<string, string | number> = {};
  const startTransform: string[] = [];
  let endStyle: Record<string, string | number> = {};
  const endTransform: string[] = [];
  let params: Record<string, string | number> = {};
  animations.forEach((animationMeta) => {
    if (Array.isArray(animationMeta.animation)) {
      const styleMeta = animationMeta.animation.find(
        (metadata) => metadata.type === AnimationMetadataType.Style
      ) as AnimationStyleMetadata;
      const styles = styleMeta.styles as Record<string, string>;
      startStyle = { ...startStyle, ...styles };
      if (styles.transform && styles.transform !== '*') {
        startTransform.push(styles.transform);
      }

      const animateMeta = animationMeta.animation.find(
        (metadata) => metadata.type === AnimationMetadataType.Animate
      ) as AnimationAnimateMetadata;
      const animateStyles = (animateMeta.styles as AnimationStyleMetadata).styles as Record<string, string>;
      endStyle = { ...endStyle, ...animateStyles };
      if (animateStyles.transform && animateStyles.transform !== '*') {
        endTransform.push(animateStyles.transform);
      }
    }
    if (animationMeta.options && animationMeta.options.params) {
      params = { ...params, ...animationMeta.options.params };
    }
  });
  startStyle.transform = startTransform.join(' ') || '*';
  endStyle.transform = endTransform.join(' ') || '*';
  return animation([style(startStyle), animate('{{ timing }}', style(endStyle))], {
    params,
  });
}

const fadeIn = animation(
  [
    style({
      opacity: '{{ minOpacity }}',
    }),
    animate(
      '{{ timing }}',
      style({
        opacity: '*',
      })
    ),
  ],
  {
    params: {
      minOpacity: '0',
      timing: `${duration} ease-out`,
    },
  }
);

const fadeOut = animation(
  [
    style({
      opacity: '*',
    }),
    animate(
      '{{ timing }}',
      style({
        opacity: '{{ minOpacity }}',
      })
    ),
  ],
  {
    params: {
      minOpacity: '0',
      timing: `${duration} ease-in`,
    },
  }
);

const grow = animation(
  [
    style({
      transform: 'scale({{ scale }})',
    }),
    animate(
      '{{ timing }}',
      style({
        transform: '*',
      })
    ),
  ],
  {
    params: {
      timing: `${duration} ease-in`,
      scale: '0.5',
    },
  }
);

const shrink = animation(
  [
    style({
      transform: '*',
    }),
    animate(
      '{{ timing }}',
      style({
        transform: 'scale({{ scale }})',
      })
    ),
  ],
  {
    params: {
      timing: `${duration} ease-in`,
      scale: '0.5',
    },
  }
);

const moveX = animation(
  [
    style({
      transform: '{{ from }}',
    }),
    animate(
      '{{ timing }}',
      style({
        transform: '{{ to }}',
      })
    ),
  ],
  {
    params: {
      from: '*',
      to: '*',
    },
  }
);

/**
 * Creates the transitions for the "show modal" triggers
 */
const show = (triggerName: 'end' | 'forward' | 'back'): string => {
  return `void => ${triggerName}A, void => ${triggerName}B`;
};
/**
 * Creates the transitions for the "hide modal" triggers.
 *
 * The trigger is any change from triggerB to triggerA and any non-void state to triggerA
 * @param triggerName - The direction state which will trigger hiding the modal
 */
const hide = (triggerName: 'end' | 'forward' | 'back'): string => {
  return ['end', 'forward', 'back']
    .filter((trig) => trig !== triggerName)
    .reduce((accumulator, otherTrigger) => {
      return `${accumulator}, ${otherTrigger}A => ${triggerName}A, ${otherTrigger}B => ${triggerName}A`;
    }, `${triggerName}A <=> ${triggerName}B`);
};

export const showModal: AnimationTriggerMetadata = trigger('showModal', [
  // hide, last modal
  transition(hide('end'), [query(modalSelector, [group([useAnimation(shrink), useAnimation(fadeOut)])])]),
  // show first
  transition(show('end'), [query(modalSelector, [group([useAnimation(grow), useAnimation(fadeIn)])])]),
  // hide, navigating to next modal
  transition(hide('forward'), [
    query(modalSelector, [
      group([
        useAnimation(combineTransforms(moveX, shrink), {
          params: {
            to: 'translateX(-224px)',
            timing: `${duration} ease-in`,
          },
        }),
        useAnimation(fadeOut),
      ]),
    ]),
  ]),
  // show next modal
  transition(show('forward'), [
    query(modalSelector, [
      group([
        useAnimation(combineTransforms(moveX, grow), {
          params: {
            from: 'translateX(224px)',
            timing: `${duration} ease-out`,
          },
        }),
        useAnimation(fadeIn),
      ]),
    ]),
  ]),
  // hide, navigating to previous modal
  transition(hide('back'), [
    query(modalSelector, [
      group([
        useAnimation(combineTransforms(moveX, shrink), {
          params: {
            to: 'translateX(224px)',
            timing: `${duration} ease-in`,
          },
        }),
        useAnimation(fadeOut),
      ]),
    ]),
  ]),
  // show previous modal
  transition(show('back'), [
    query(modalSelector, [
      group([
        useAnimation(combineTransforms(moveX, grow), {
          params: {
            from: 'translateX(-224px)',
            timing: `${duration} ease-out`,
          },
        }),
        useAnimation(fadeIn),
      ]),
    ]),
  ]),
]);

/**
 * Adds a random(ish) ID to host elements if there is no ID already set
 */
@Directive({})
abstract class JustAnIDDirective implements OnChanges {
  @HostBinding('id')
  private _id: string;
  get id(): string {
    return this._id;
  }
  @Input('id')
  set id(id: string | undefined) {
    this._id = id;
  }
  protected prefix: string;

  ngOnChanges({ id }: SimpleChanges): void {
    if (id && !id.currentValue) {
      this.setRandomID();
    }
  }

  ngOnInit(): void {
    if (!this._id) {
      this.setRandomID();
    }
  }

  private setRandomID(): void {
    const id = new Array(12);
    // can't use map(), forEach() et al. with new Array(number)
    for (let i = 0; i < id.length; i += 1) {
      // eslint-disable-next-line no-bitwise
      id[i] = ((Math.random() * 16) | 0).toString(16);
    }
    this._id = `${this.prefix}${id.join('')}`;
  }
}

/**
 * This directive is used to link the actual modal title text to the modal for accessibility.
 * If the ARIA label is not a child of the Modal then don't use this directive; use the labelledBy input with an ID(s).
 *
 * It eliminates Typos as your IDE will detect them, unlike a labelled-by string or template reference variable.
 */
@Directive({
  selector: '[rl-modal-title]',
})
export class ModalTitleDirective extends JustAnIDDirective {
  protected prefix = 'rlModalTitle';
}

/**
 * This directive is used to link the actual modal description text to the modal for accessibility.
 * If the ARIA description is not a child of the Modal then don't use this directive; use the describedBy input with an ID(s).
 *
 * It eliminates Typos as your IDE will detect them, unlike a labelled-by string or template reference variable.
 */
@Directive({
  selector: '[rl-modal-description]',
})
export class ModalDescriptionDirective extends JustAnIDDirective {
  protected prefix = 'rlModalDescription';
}

@Component({
  animations: [],
  selector: 'rl-modal',
  styleUrls: ['./modal.component.scss'],
  templateUrl: './modal.component.html',
})
export class ModalComponent implements AfterContentInit, AfterViewInit, OnChanges {
  binderID?: string;
  @Input('describedBy')
  describedByInput: string | undefined;
  describedBy: string | undefined;
  @ContentChildren(ModalDescriptionDirective, { descendants: true })
  describedByDirectives: QueryList<ModalDescriptionDirective>;
  private readonly destroy: Subject<void>;
  /** `fakePath` is used to create a fake URL for the modal, for tracking a virtual page view. */
  @Input() fakePath?: string;
  @Input('labelledBy')
  labelledByInput: string | undefined;
  labelledBy: string | undefined;
  @ContentChildren(ModalTitleDirective, { descendants: true })
  labelledByDirectives: QueryList<ModalTitleDirective>;
  readonly rootClassnames = baseClass;

  private static getIDsFromDirectives(list: QueryList<JustAnIDDirective> | undefined): string | undefined {
    if (!list || list.length === 0) {
      return undefined;
    }
    const ids = list.reduce((accumulator, directive) => `${accumulator} ${directive.id}`, '');
    return ids.trim();
  }

  constructor(
    private readonly eventTracker: TrackingPublisher,
    private readonly modalControlService: ModalControlService,
    private readonly translateService: TranslateService,
    @Inject(DOCUMENT) private readonly document: HTMLDocument,
    store: Store
  ) {
    this.destroy = new Subject<void>();
    this.binderID = store.getState().binder.id;
  }

  close(reason = CloseReason.UserTerminated): void {
    this.modalControlService.close(reason);
  }

  ngAfterContentInit(): void {
    this.setLabelledBy();
    this.labelledByDirectives.changes.subscribe(() => this.setLabelledBy());
    this.setDescribedBy();
    this.describedByDirectives.changes.subscribe(() => this.setDescribedBy());
  }

  ngAfterViewInit(): void {
    this.trackVirtualPageView();
  }

  ngOnChanges({ describedByInput, labelledByInput }: SimpleChanges): void {
    if (describedByInput) {
      this.setDescribedBy();
    }
    if (labelledByInput) {
      this.setLabelledBy();
    }
  }

  private setDescribedBy(): void {
    this.describedBy = ModalComponent.getIDsFromDirectives(this.describedByDirectives) || this.describedByInput;
  }

  private setLabelledBy(): void {
    this.labelledBy = ModalComponent.getIDsFromDirectives(this.labelledByDirectives) || this.labelledByInput;
  }

  private makeFakeModalURL(): URL {
    const url = new URL(window.location?.href);
    if (this.fakePath === undefined) {
      return url;
    }
    if (url.pathname.includes(this.binderID)) {
      url.pathname = url.pathname.replace(this.binderID, this.fakePath);
    } else {
      url.pathname += `/${this.fakePath}`;
    }
    return url;
  }

  private getTitle(): string {
    if (!this.labelledBy || this.labelledBy.trim().length === 0) {
      return '';
    }
    const description = this.labelledBy
      .split(' ')
      .map((elementID) => this.document.getElementById(elementID)?.textContent)
      .filter((textContent) => {
        if (textContent && textContent.trim().length > 0) {
          return !this.translateService.store.translations[this.translateService.currentLang][textContent];
        }
        return false;
      });
    return [...description, 'RocketLawyer'].join(' | ');
  }

  private trackVirtualPageView(): void {
    const fakeURL = this.makeFakeModalURL();
    const pageTitle = this.getTitle();
    this.document.title = pageTitle;
    this.eventTracker.virtualPageView({
      location: fakeURL.toString(),
      pageTitle,
    });
  }
}
