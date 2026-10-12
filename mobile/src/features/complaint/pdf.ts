import { kitHtml, type KitPerson } from '@satark/shared';
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import { Platform } from 'react-native';

import { sha256 } from '@/services/hash';
import type { Complaint } from '@/types';

export type { KitPerson };

export interface RenderedKit {
  uri: string | null;
  sha256: string;
}

/** Render the kit to a PDF file and hash it, so the PDF itself is tamper-evident. */
export async function renderKit(complaint: Complaint, person: KitPerson): Promise<RenderedKit> {
  const html = kitHtml(complaint, person);
  if (Platform.OS === 'web') return { uri: null, sha256: await sha256(html) };
  const file = await Print.printToFileAsync({ html, base64: true });
  return { uri: file.uri, sha256: await sha256(file.base64 ?? html) };
}

/** Open the PDF: system share sheet on the phone, print dialog on the web. */
export async function openKit(complaint: Complaint, person: KitPerson): Promise<void> {
  if (Platform.OS === 'web' || !complaint.pdfUri) {
    await Print.printAsync({ html: kitHtml(complaint, person) });
    return;
  }
  await Sharing.shareAsync(complaint.pdfUri, {
    mimeType: 'application/pdf',
    dialogTitle: 'Satark Complaint Kit',
    UTI: 'com.adobe.pdf',
  });
}
