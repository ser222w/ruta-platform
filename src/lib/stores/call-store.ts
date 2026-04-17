import { create } from 'zustand';

export interface IncomingCallData {
  callId: string;
  callerPhone: string;
  callerName?: string;
  guestId?: string;
  guestLtv?: number;
  guestStayCount?: number;
  guestLastProperty?: string;
  guestLastStay?: string;
  inquiryId: string;
  managerId?: string;
}

interface CallStore {
  activeCall: IncomingCallData | null;
  setActiveCall: (call: IncomingCallData | null) => void;
  dismissCall: () => void;
}

export const useCallStore = create<CallStore>((set) => ({
  activeCall: null,
  setActiveCall: (call) => set({ activeCall: call }),
  dismissCall: () => set({ activeCall: null })
}));
