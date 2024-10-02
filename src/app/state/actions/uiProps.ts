import { createAction } from './action';

export const reminderSentToAllViewers = createAction<boolean>('uiProps/setReminderSentToAllViewers');

export const setSignatureBuilderMode = createAction<boolean>('uiProps/setSignatureBuilderModeEnabled');

export const setSignMode = createAction<boolean>('uiProps/setSignModeEnabled');

export const setDocumentEditorMode = createAction<boolean>('uiProps/setDocumentEditModeEnabled');

export const setInputsNeedRepositioningAfterDocumentEdit = createAction<boolean>('uiProps/setInputsNeedRepositioning');

export const setInterviewEditOptions = createAction<boolean>('uiProps/backToInterviewEnabled');

export const setAdvancedEditOption = createAction<boolean>('uiProps/setAdvancedEditEnabled');

export const setBinderHasContent = createAction<boolean>('uiProps/setBinderHasContent');
