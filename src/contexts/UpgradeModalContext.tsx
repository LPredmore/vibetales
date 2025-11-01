import { createContext, useContext, useState, ReactNode, lazy, Suspense } from 'react';

// Lazy load the PremiumUpgradeModal component
const PremiumUpgradeModal = lazy(() => 
  import('@/components/PremiumUpgradeModal').then(module => ({ 
    default: module.PremiumUpgradeModal 
  }))
);

interface UpgradeModalContextType {
  showUpgradeModal: (onSuccess?: () => void) => void;
  hideUpgradeModal: () => void;
}

const UpgradeModalContext = createContext<UpgradeModalContextType | undefined>(undefined);

export const UpgradeModalProvider = ({ children }: { children: ReactNode }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [onSuccessCallback, setOnSuccessCallback] = useState<(() => void) | undefined>();

  const showUpgradeModal = (onSuccess?: () => void) => {
    setOnSuccessCallback(() => onSuccess);
    setIsOpen(true);
  };

  const hideUpgradeModal = () => {
    setIsOpen(false);
    setOnSuccessCallback(undefined);
  };

  const handleSuccess = () => {
    if (onSuccessCallback) {
      onSuccessCallback();
    }
    hideUpgradeModal();
  };

  return (
    <UpgradeModalContext.Provider value={{ showUpgradeModal, hideUpgradeModal }}>
      {children}
      {isOpen && (
        <Suspense fallback={null}>
          <PremiumUpgradeModal 
            open={isOpen}
            onOpenChange={setIsOpen}
            onSuccess={handleSuccess}
          />
        </Suspense>
      )}
    </UpgradeModalContext.Provider>
  );
};

export const useUpgradeModal = () => {
  const context = useContext(UpgradeModalContext);
  if (!context) {
    throw new Error('useUpgradeModal must be used within UpgradeModalProvider');
  }
  return context;
};
