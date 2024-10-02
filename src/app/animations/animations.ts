import { trigger, transition, animate, state, style, query, animateChild } from '@angular/animations';

export const animationTiming = '200ms ease-in';

export const animateModalChildren =
    trigger('animateModalChildren', [
        transition(':enter, :leave', [
        query('@*', animateChild(), {optional: true})
        ])
    ]);

export const modalScaleInOut =
     trigger('modalScaleInOut', [
        state('void', style({transform: 'scale(0.3)'})),
        state('*',  style({transform: 'scale(1)'})),
        transition(':enter', animate(animationTiming)),
        transition(':leave', animate(animationTiming))
    ]);

export const modalFadeInOut =
    trigger('fadeInOut', [
        state('void', style({ zIndex: -1, opacity: 0 })),
        state('*', style({ opacity: 1 })),
        transition(':enter', animate('200ms ease-out')),
        transition(':leave', animate('200ms ease-in'))
    ]);

export const fadeInOut =
    trigger('fadeInOut', [
        state('void', style({ zIndex: -1, opacity: 0 })),
        state('*', style({ opacity: 1 })),
        transition(':enter', animate(animationTiming)),
        transition(':leave', animate(animationTiming))
    ]);

export const scaleAndFade =
    trigger('scaleAndFade', [
        state('void', style({ opacity: 0, transform: 'scale(0)' })),
        state('*', style({ opacity: 1, transform: 'scale({{scale}})'}), {params: {scale: 1}}),
        transition(':enter', animate(animationTiming)),
        transition(':leave', animate(animationTiming))
    ]);

export const resizeIconScaleAndFade =
    trigger('resizeIconScaleAndFade', [
        state('void', style({ opacity: 0, transform: 'rotate(90deg) scale(0)' })),
        state('*', style({ opacity: 1, transform: 'rotate(90deg) scale({{scale}})'}), {params: {scale: 1}}),
        transition(':enter', animate(animationTiming)),
        transition(':leave', animate(animationTiming))
    ]);

export const intentionModalFadeIn =
     trigger('intentionModalFadeIn', [
        transition(':enter', [
            style({opacity: 0}),
            animate('150ms ease-in', style({opacity: 1})),
            query('.modal-wrapper', [
                style({transformOrigin: '90vw 100px', transform: 'scale(.3)', opacity: 0}),
                animate('150ms ease-out', style({transformOrigin: '90vw 100px', transform: 'scale(1)', opacity: 1}))
            ], { optional: true})
        ]),
        transition(':leave', [
            query('.modal-wrapper', [
                style({transformOrigin: '90vw 100px', transform: 'scale(1)', opacity: 1}),
                animate('150ms ease-out', style({transformOrigin: '90vw 100px', transform: 'scale(.3)', opacity: 0}))
            ], { optional: true}),
            style({opacity: 1}),
            animate('150ms ease-out', style({opacity: 0}))
        ])
    ]);
    
export const slideInOut =
    trigger('slideInOut', [
        state('void', style({position: 'absolute', visibility: 'hidden', opacity: 0})),
        state('left', style({position: 'absolute', visibility: 'hidden', opacity: 0, transform: 'translateX(-50px)'})),
        state('center', style({position: 'relative', visibility: 'visible', opacity: 1, transform: 'translateX(0)'})),
        state('right', style({position: 'absolute', visibility: 'hidden', opacity: 0, transform: 'translateX(+50px)'})),
        transition('center => left, center => right', animate('200ms ease-out')),
        transition('left => center, right => center', animate('200ms ease-in'))
    ]);

export const slideUpDown =
    trigger('slideUpDown', [
        state('void', style({ maxHeight: '0px' })),
        state('*', style({ maxHeight: '500px'})),
        transition(':enter', animate(animationTiming)),
        transition(':leave', animate(animationTiming))
    ]);

export const actionMenuSlideUpDown =
    trigger('actionMenuSlideUpDown', [
        state('collapsed', style({ maxHeight: '40px', overflow: 'hidden' })),
        state('expanded', style({ maxHeight: '500px', overflow: 'auto'})),
        transition('collapsed => expanded', animate(animationTiming)),
        transition('expanded => collapsed', animate(animationTiming))
    ]);