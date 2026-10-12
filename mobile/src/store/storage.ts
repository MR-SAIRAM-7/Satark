import AsyncStorage from '@react-native-async-storage/async-storage';
import { createJSONStorage } from 'zustand/middleware';

/** Shared persistence for every store. Data never leaves the phone. */
export const persistStorage = createJSONStorage(() => AsyncStorage);

export const STORE_VERSION = 1;

let counter = 0;
/** Short, sortable, collision-safe id without needing a native UUID module. */
export function newId(prefix: string): string {
  counter = (counter + 1) % 1296;
  return `${prefix}_${Date.now().toString(36)}${counter.toString(36).padStart(2, '0')}${Math.random()
    .toString(36)
    .slice(2, 6)}`;
}
