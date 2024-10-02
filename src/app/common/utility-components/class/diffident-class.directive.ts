/* eslint-disable max-classes-per-file */
import { Directive, ElementRef, Input, OnChanges, OnInit, Renderer2, SimpleChanges } from '@angular/core';

export type ClassInput = string | string[] | Record<string, boolean | null | undefined>;

export class DiffidentClassHelper {
  private readonly elementRef: ElementRef;
  private readonly renderer: Renderer2;

  constructor(elementRef: ElementRef, renderer: Renderer2) {
    this.elementRef = elementRef;
    this.renderer = renderer;
  }

  static MakeClassDictionary(classnames: ClassInput): Record<string, boolean> {
    if (typeof classnames === 'string') {
      return this.MakeClassDictionary(classnames.split(' '));
    }
    if (Array.isArray(classnames)) {
      return classnames.reduce((dictionary, classname) => {
        if (classname) {
          dictionary[classname] = true;
        }
        return dictionary;
      }, {});
    }
    return classnames;
  }

  /**
   * Add new classnames to the element.
   * @param newClasses - Any classnames which are not in <code>oldClasses</code> will be added.
   * @param oldClasses - Any classnames which are not in <code>newClasses</code> will be removed.
   */
  setClassnames(newClasses: ClassInput, oldClasses: ClassInput = {}): void {
    if (typeof newClasses !== 'object' || Array.isArray(newClasses)) {
      return this.setClassnames(DiffidentClassHelper.MakeClassDictionary(newClasses || {}), oldClasses);
    }
    if (typeof oldClasses === 'string' || Array.isArray(oldClasses)) {
      return this.setClassnames(newClasses, DiffidentClassHelper.MakeClassDictionary(oldClasses));
    }
    Object.keys(newClasses).forEach((classname) => {
      if (newClasses[classname]) {
        if (oldClasses[classname]) {
          oldClasses[classname] = false;
        } else if (classname) {
          this.renderer.addClass(this.elementRef.nativeElement, classname);
        }
      }
    });
    Object.keys(oldClasses).forEach((classname) => {
      if (oldClasses[classname] && classname) {
        this.renderer.removeClass(this.elementRef.nativeElement, classname);
      }
    });
  }
}

/**
 * Like the built-in class directive, but less aggressive.
 *
 * [class] will get rid of all other classes on the element since it writes the whole classlist
 * [rl-class] will append the classes. Changing the input will only remove those classes which were added using this directive
 *
 * You'll want to use this directive with other directives which modify classes.
 * If you use [class.*] then you probably won't need this directive
 */
@Directive({
  selector: '[rl-class]',
})
export class DiffidentClassDirective implements OnChanges, OnInit {
  @Input('rl-class')
  classes: ClassInput | undefined;
  private readonly helper: DiffidentClassHelper;

  constructor(elementRef: ElementRef, renderer: Renderer2) {
    this.helper = new DiffidentClassHelper(elementRef, renderer);
  }

  ngOnChanges({ classes }: SimpleChanges): void {
    if (classes && !classes.firstChange) {
      this.helper.setClassnames(classes.currentValue, classes.previousValue);
    }
  }

  ngOnInit(): void {
    if (this.classes) {
      this.helper.setClassnames(this.classes);
    }
  }
}
