import { create } from 'zustand';

interface UpgradeModalState {
    isOpen: boolean;
    limitType?: string;
    current?: number;
    limit?: number;
    message?: string;
    openModal: (data: {
        limitType?: string;
        current?: number;
        limit?: number;
        message?: string;
    }) => void;
    closeModal: () => void;
}

export const useUpgradeModal = create<UpgradeModalState>((set) => ({
    isOpen: false,
    limitType: undefined,
    current: undefined,
    limit: undefined,
    message: undefined,
    openModal: (data) => set({ isOpen: true, ...data }),
    closeModal: () => set({
        isOpen: false,
        limitType: undefined,
        current: undefined,
        limit: undefined,
        message: undefined
    }),
}));
