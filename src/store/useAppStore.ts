import { create } from 'zustand';
import { ITTicket, ITAsset, PurchaseRecord } from '../types';

interface AppStore {
  tickets: ITTicket[];
  assets: ITAsset[];
  purchases: PurchaseRecord[];
  setTickets: (tickets: ITTicket[] | ((prev: ITTicket[]) => ITTicket[])) => void;
  setAssets: (assets: ITAsset[] | ((prev: ITAsset[]) => ITAsset[])) => void;
  setPurchases: (purchases: PurchaseRecord[] | ((prev: PurchaseRecord[]) => PurchaseRecord[])) => void;
}

export const useAppStore = create<AppStore>((set) => ({
  tickets: [],
  assets: [],
  purchases: [],
  setTickets: (tickets) => set((state) => ({ 
    tickets: typeof tickets === 'function' ? tickets(state.tickets) : tickets 
  })),
  setAssets: (assets) => set((state) => ({ 
    assets: typeof assets === 'function' ? assets(state.assets) : assets 
  })),
  setPurchases: (purchases) => set((state) => ({ 
    purchases: typeof purchases === 'function' ? purchases(state.purchases) : purchases 
  })),
}));
