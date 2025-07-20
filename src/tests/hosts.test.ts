
import hostsConfig from '@/config/hosts.json';
import { ALLOWED_ORIGINS, PRODUCTION_HOST } from '@/utils/domainConfig';

describe('Domain Configuration', () => {
  test('only storybridgeapp host is allowed', () => {
    expect(hostsConfig.allowedOrigins).toEqual(['storybridgeapp.lovable.app']);
  });

  test('production host is correctly set', () => {
    expect(PRODUCTION_HOST).toBe('storybridgeapp.lovable.app');
  });

  test('allowed origins contains only approved domains', () => {
    expect(ALLOWED_ORIGINS).toHaveLength(1);
    expect(ALLOWED_ORIGINS[0]).toBe('storybridgeapp.lovable.app');
  });

  test('no legacy domains are present', () => {
    const legacyDomains = [
      'lexileap.lovable.app',
      'storybridge.lovable.app'
    ];
    
    legacyDomains.forEach(domain => {
      expect(ALLOWED_ORIGINS).not.toContain(domain);
    });
  });
});
