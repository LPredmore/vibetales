
import hostsConfig from '@/config/hosts.json';

export const ALLOWED_ORIGINS = hostsConfig.allowedOrigins;
export const PRODUCTION_HOST = hostsConfig.productionHost;

export const isAllowedDomain = (url: string): boolean => {
  // Handle protocol-agnostic domain checking
  const cleanUrl = url.replace(/^https?:\/\//, '').replace(/\/$/, '');
  return ALLOWED_ORIGINS.some(host => {
    const cleanHost = host.replace(/^https?:\/\//, '').replace(/\/$/, '');
    return cleanUrl === cleanHost || cleanUrl.includes(cleanHost);
  });
};

export const getCurrentDomain = (): string => {
  return window.location.origin;
};

export const isProductionDomain = (): boolean => {
  return getCurrentDomain().includes(PRODUCTION_HOST);
};
