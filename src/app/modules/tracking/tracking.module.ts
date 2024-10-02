import { ModuleWithProviders, NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { TRACKING_CONFIG, TrackingModuleConfig } from './config';
import { TrackingPublisher } from './publisher';

@NgModule({
  declarations: [],
  imports: [CommonModule],
})
export class TrackingModule {
  static forRoot(config: TrackingModuleConfig): ModuleWithProviders<TrackingModule> {
    return {
      ngModule: TrackingModule,
      providers: [{ provide: TRACKING_CONFIG, useValue: config }, TrackingPublisher],
    };
  }
}
