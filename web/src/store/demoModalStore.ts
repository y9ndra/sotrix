import { create } from "zustand";

interface DemoModalState {
  isOpen: boolean;
  actionName: string;
  openDemoModal: (actionName?: string) => void;
  closeDemoModal: () => void;
}

export const useDemoModalStore = create<DemoModalState>((set) => ({
  isOpen: false,
  actionName: "interact",
  openDemoModal: (actionName = "interact") =>
    set({ isOpen: true, actionName }),
  closeDemoModal: () =>
    set({ isOpen: false }),
}));
