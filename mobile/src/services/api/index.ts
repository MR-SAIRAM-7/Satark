import { hasBackend } from '@/config/env';

import { httpApi } from './http';
import { localApi } from './local';
import type { SatarkApi } from './types';

/** Set EXPO_PUBLIC_API_BASE_URL to switch from the on-device engine to the backend. */
export const api: SatarkApi = hasBackend ? httpApi : localApi;

export type { CaseFiling, CaseSync, DeliveryStatus, ReportPayload, SatarkApi, ServerAlert, WhatsAppPayload } from './types';
