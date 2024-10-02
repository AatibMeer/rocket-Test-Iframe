import { CUSTOM_ELEMENTS_SCHEMA, NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HTTP_INTERCEPTORS, HttpClientModule } from '@angular/common/http';
import { PerimeterXInterceptor } from './perimeter-x.interceptor';
import { PerimeterXComponent } from './perimeter-x/perimeter-x.component';

@NgModule({
  declarations: [PerimeterXComponent],
  imports: [CommonModule, HttpClientModule],
  providers: [
    {
      provide: HTTP_INTERCEPTORS,
      useClass: PerimeterXInterceptor,
      multi: true,
    },
  ],
  exports: [PerimeterXComponent],
  schemas: [CUSTOM_ELEMENTS_SCHEMA],
})
export class PerimeterXModule {}
