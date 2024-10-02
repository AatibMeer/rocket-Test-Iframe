import {Component, EventEmitter, Input, OnInit, Output} from '@angular/core';


@Component({
  selector: 'custom-button',
  templateUrl: './custom-button.component.html',
  styleUrls: ['./custom-button.component.scss']
})

// This is a util component that adds a button + a loading state
// The component will automatically adjust the width of the button so that it stays the same width
// when transitioning from normal to loading state
export class CustomButtonComponent implements OnInit {
  @Input() btnType: string = 'button';
  @Input() btnClass: any;
  @Output()
  onClick = new EventEmitter<MouseEvent>();
  @Input() defaultTranslation: Translation;
  @Input() loadingTranslation: Translation;
  @Input() isLoading: boolean;
  @Input() isDisabled = false;
  primaryButtonEnabled = false;
  secondaryButtonEnabled = false;

  ngOnInit(): void {
      this.primaryButtonEnabled = this.btnClass.indexOf('btn-primary') > -1;
      this.secondaryButtonEnabled = this.btnClass.indexOf('btn-secondary') > -1;
  }

  handleClick(event: MouseEvent): void {
      this.onClick.emit(event);
  }
}

interface Translation {
    key: string;
    params?: Object;
}
