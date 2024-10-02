import { Directive, ElementRef, Input, OnInit } from '@angular/core';

@Directive({
  selector: '[comLinkNewTab]'
})
export class CommuteLinkNewTab implements OnInit {

  constructor(private elementRef: ElementRef) {

  }

  ngOnInit() {
    for (let i = 0; i < this.elementRef.nativeElement.childNodes.length; i++) {
      const element = this.elementRef.nativeElement.childNodes[i];
      if (element.href) { // this checks if element is an html node with an href property and not just a string.
        let tempRef = element.href;        
        element.onclick = (e) => {
          e.preventDefault();
          window.open(tempRef, '_blank'); // '_blank' is a special value that makes sure it opens in a new window each time.
        };
      }
    }
  }
  /*
    example usage: <p comLinkNewTab [comContent]="'Login-component_terms-of-use'"></p>
    Add the directive ^^^^^ to any element that has nested <a></a> inside the translation.
    For instance Login-component_terms-of-use translates to;
    "By signing in you agree to Rocket Lawyer's <a href='/gb/en/terms'>Conditions of Use</a>, and <a href='/gb/en/terms-lawyers'>Conditions of Use for Lawyers</a>"
    commuteLinkNewTab will find those nested href's, save the relative path, and replace it with '#'
    then it will add an event listener to those elements, that opens the translated path, on click in a new window.
  */
}