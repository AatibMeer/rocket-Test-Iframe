import { Component, ElementRef, HostListener, ViewChild, Input, AfterViewInit, OnInit } from '@angular/core';
import { SignaturePad } from './signature-pad-lib/signature_pad_lib';
import { SvgData } from '../../../services/sign-app/signature-pad.interface';

@Component({
  selector: 'signature-pad',
  templateUrl: './signature-pad-wrapper.component.html',
  styleUrls: ['./signature-pad-wrapper.component.scss'],
})
export class SignaturePadWrapperComponent implements OnInit, AfterViewInit {
  signaturePad: SignaturePad;
  canvas: HTMLCanvasElement;
  canvasDimensions = {
    width: 0,
    height: 0,
  };
  resizeTimeout = null;
  resizeStartDimensions = null;
  scaleRatio = 1;
  protected canvasMaxSize = 431;
  @Input() svgData: SvgData;
  @ViewChild('padContainer') padContainer: ElementRef;
  @ViewChild('svgCroppingBox') svgCroppingBox: ElementRef;
  @ViewChild('canvasRef') canvasRef: ElementRef;
  parentPadContainer: HTMLElement;

  @HostListener('window:resize')
  onWindowResize() {
    this.rescaleCanvas();
  }

  @HostListener('window:orientationchange')
  onOrientationChange() {
    this.rescaleCanvas();
  }

  ngOnInit(): void {
    this.parentPadContainer = document.querySelector('#parentPadContainer');
    this.setCanvasSize();
  }

  ngAfterViewInit() {
    this.canvas = <HTMLCanvasElement>this.canvasRef.nativeElement;
    this.signaturePad = new SignaturePad(this.canvas, {
      backgroundColor: 'rgba(255, 255, 255, 0)',
      penColor: 'rgb(51 , 51, 51)',
    });
    // this delay must be here to ensure that pad is initialized
    setTimeout(() => {
      this.signaturePad.clear();
      if (this.svgData) {
        this.resizeStartDimensions = { width: this.svgData.canvas.width, height: this.svgData.canvas.height };
        this.signaturePad.fromData(this.svgData.points);
      }
      this.rescaleCanvas();
    }, 100);
  }

  setCanvasSize() {
    this.canvasDimensions.width = this.parentPadContainer?.offsetWidth;
    this.canvasDimensions.height = this.parentPadContainer?.offsetWidth * 0.5;
    this.resizeStartDimensions = { width: this.canvasDimensions.width, height: this.canvasDimensions.height };
  }

  rescaleCanvas() {
    this.canvasDimensions.width = this.parentPadContainer?.offsetWidth;
    this.canvasDimensions.height = this.parentPadContainer?.offsetWidth * 0.5;
    if (this.resizeTimeout) clearTimeout(this.resizeTimeout);
    // this delay must be here to ensure that pad is initialized
    this.resizeTimeout = setTimeout(() => {
      let newRatio;
      if (this.svgData && this.svgData.canvas) {
        newRatio =
          (this.padContainer?.nativeElement?.offsetWidth / this.resizeStartDimensions.width) * this.svgData.canvas.ratio;
      } else {
        newRatio = this.padContainer?.nativeElement?.offsetWidth / this.resizeStartDimensions.width;
      }
      const oldData = this.signaturePad.toData();
      this.signaturePad.clear();
      this.signaturePad.setScaleRatio(newRatio);
      this.scaleRatio = newRatio;
      this.setPathWidth(this.padContainer.nativeElement.offsetWidth, newRatio);
      this.signaturePad.fromData(oldData);
    }, 100);
  }

  setPathWidth(canvasWidth: number, scale) {
    const resizeRatio = canvasWidth / this.canvasMaxSize;
    this.signaturePad.minWidth = resizeRatio / scale;
    this.signaturePad.maxWidth = (2.5 * resizeRatio) / scale;
  }

  switchColor(color) {
    const oldData = this.signaturePad.toData();
    this.signaturePad.clear();
    this.signaturePad.penColor = color;
    for (let i = 0; i < oldData.length; i++) {
      oldData[i].color = color;
    }
    this.signaturePad.fromData(oldData);
  }

  cropSignatureCanvas() {
    const parser = new DOMParser();
    const doc = parser.parseFromString(this.signaturePad.toSVG(), 'image/svg+xml');

    this.svgCroppingBox.nativeElement.innerHTML = '';
    this.svgCroppingBox.nativeElement.appendChild(doc.documentElement);

    const svgElem = this.svgCroppingBox.nativeElement.getElementsByTagName('svg')[0];
    const bBox = (this.svgCroppingBox.nativeElement.getElementsByTagName('svg')[0] as any).getBBox();
    const viewBox = [bBox.x, bBox.y - bBox.y * 0.05, bBox.width, bBox.height + bBox.height * 0.1].join(' '); // without these arbitrary corrections it will cut few pixels for some reason
    svgElem.setAttribute('viewBox', viewBox);
    svgElem.setAttribute('width', bBox.width);
    svgElem.setAttribute('height', bBox.height);
    return btoa(this.svgCroppingBox.nativeElement.innerHTML);
  }

  getSvgData(): SvgData {
    return {
      points: this.signaturePad.toData(),
      canvas: { width: this.canvasDimensions.width, height: this.canvasDimensions.height, ratio: this.scaleRatio },
    };
  }

  clearPad() {
    this.signaturePad.clear();
  }
}
