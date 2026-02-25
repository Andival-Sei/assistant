import { useRegisterSW } from "virtual:pwa-register/react";

type UsePwaRegistrationResult = {
  needRefresh: boolean;
  offlineReady: boolean;
  updateServiceWorker: () => void;
};

export const usePwaRegistration = (): UsePwaRegistrationResult => {
  const {
    needRefresh: [needRefresh],
    offlineReady: [offlineReady],
    updateServiceWorker,
  } = useRegisterSW();

  return {
    needRefresh,
    offlineReady,
    updateServiceWorker,
  };
};
