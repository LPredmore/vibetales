
import hostsConfig from '@/config/hosts.json';

export const ALLOWED_ORIGINS = hostsConfig.allowedOrigins;
export const PRODUCTION_HOST = hostsConfig.productionHost;

export const isAllowedDomain = (url: string): boolean => {
  return ALLOWED_ORIGINS.some(host => url.includes(host));
};

export const getCurrentDomain = (): string => {
  return window.location.origin;
};

export const isProductionDomain = (): boolean => {
  return getCurrentDomain().includes(PRODUCTION_HOST);
};
