import { Routes } from '@angular/router';
import { SignAppDashboardComponent } from './sign-app-dashboard/sign-app-dashboard.component';
import { BinderResolver } from '../../services/sign-app/binder.resolver';
import { BrandingResolver } from '../../services/sign-app/branding.resolver';

export const signAppRoutes: Routes = [
  {
    path: ':binderId/cancelled',
    loadChildren: () => import('./sigining-cancelled/signing-cancelled.module').then((m) => m.SigningCancelledModule),
    resolve: { binderOrError: BinderResolver, branding: BrandingResolver },
  },
  {
    path: 'cancelled',
    loadChildren: () => import('./sigining-cancelled/signing-cancelled.module').then((m) => m.SigningCancelledModule),
  },
  {
    path: ':binderId/access-revoked',
    loadChildren: () => import('./access-revoked/access-revoked.module').then((m) => m.AccessRevokedModule),
    resolve: { binderOrError: BinderResolver, branding: BrandingResolver },
  },
  {
    path: 'access-revoked',
    loadChildren: () => import('./access-revoked/access-revoked.module').then((m) => m.AccessRevokedModule),
  },
  {
    path: ':binderId/service-down',
    loadChildren: () => import('./service-down/service-down.module').then((m) => m.ServiceDownModule),
    resolve: { binderOrError: BinderResolver, branding: BrandingResolver },
  },
  {
    path: 'service-down',
    loadChildren: () => import('./service-down/service-down.module').then((m) => m.ServiceDownModule),
  },
  {
    path: ':binderId/not-found',
    loadChildren: () => import('./binder-not-found/not-found.module').then((m) => m.BinderNotFoundModule),
    resolve: { binderOrError: BinderResolver, branding: BrandingResolver },
  },
  {
    path: 'not-found',
    loadChildren: () => import('./binder-not-found/not-found.module').then((m) => m.BinderNotFoundModule),
  },
  {
    path: ':binderId',
    loadChildren: () => import('./sign-app-dashboard/dashboard.module').then((m) => m.DashboardModule),
    resolve: { binderOrError: BinderResolver, branding: BrandingResolver },
  },
  {
    path: '',
    loadChildren: () => import('./sign-app-dashboard/dashboard.module').then((m) => m.DashboardModule),
    resolve: { binderOrError: BinderResolver, branding: BrandingResolver },
  },
  { path: '**', redirectTo: 'not-found' },
];
