import { lazy, Suspense, ComponentProps } from 'react';
import { Loader2 } from 'lucide-react';

// Lazy load modal components for better initial bundle size
const PremiumUpgradeModalLazy = lazy(() => 
  import('./PremiumUpgradeModal').then(module => ({ default: module.PremiumUpgradeModal }))
);

const ReportDialogLazy = lazy(() => 
  import('./ReportDialog').then(module => ({ default: module.ReportDialog }))
);

// Loading fallback for modals
const ModalLoader = () => (
  <div className="flex items-center justify-center p-8">
    <Loader2 className="h-8 w-8 animate-spin text-primary" />
  </div>
);

// Wrapped components with Suspense
export const PremiumUpgradeModal = (props: ComponentProps<typeof PremiumUpgradeModalLazy>) => (
  <Suspense fallback={<ModalLoader />}>
    <PremiumUpgradeModalLazy {...props} />
  </Suspense>
);

export const ReportDialog = (props: ComponentProps<typeof ReportDialogLazy>) => (
  <Suspense fallback={<ModalLoader />}>
    <ReportDialogLazy {...props} />
  </Suspense>
);
