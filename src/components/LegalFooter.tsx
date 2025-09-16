import { ExternalLink } from "lucide-react";

interface LegalFooterProps {
  className?: string;
}

export const LegalFooter = ({ className = "" }: LegalFooterProps) => {
  const handleLinkClick = (url: string) => {
    window.open(url, '_blank', 'noopener,noreferrer');
  };

  return (
    <div className={`flex flex-col sm:flex-row items-center justify-center gap-4 text-xs text-muted-foreground ${className}`}>
      <button
        onClick={() => handleLinkClick('https://bestselfs.com/terms')}
        className="flex items-center gap-1 hover:text-foreground transition-colors underline"
      >
        Terms of Service
        <ExternalLink className="h-3 w-3" />
      </button>
      <span className="hidden sm:inline">•</span>
      <button
        onClick={() => handleLinkClick('https://bestselfs.com/data')}
        className="flex items-center gap-1 hover:text-foreground transition-colors underline"
      >
        Privacy Policy
        <ExternalLink className="h-3 w-3" />
      </button>
    </div>
  );
};