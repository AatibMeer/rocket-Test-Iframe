import { ConfigurationData, GlobalBrandConfig } from '../../common/interfaces/branding.interface';
import { createAction } from './action';

export const setBrandConfig = createAction<ConfigurationData>('user/setBrandConfig');
export const setGlobalBrandConfig = createAction<GlobalBrandConfig>('user/setGlobalBrandConfig');
export type SetBrandConfigAction = ReturnType<typeof setBrandConfig>;
export type SetGlobalBrandConfigAction = ReturnType<typeof setGlobalBrandConfig>
