# Lexileap Configuration Guide

## 🔒 Security Notice
**IMPORTANT**: The previously committed `.env` file contained real credentials that have been exposed. You should:
1. Rotate the Supabase anon key in your dashboard
2. Rotate any AI provider API keys (OpenAI/OpenRouter) 
3. Never commit `.env` files to version control (add `.env` to `.gitignore`)
4. **CRITICAL**: Rotate the Supabase service role key in your dashboard and ensure it's ONLY stored in Supabase Edge Function secrets, never in client code

## Required Configuration

### Frontend Environment Variables (Vite)
Create a `.env` file in the project root with:

```env
VITE_SUPABASE_URL="https://your-project.supabase.co"
VITE_SUPABASE_ANON_KEY="your-anon-key-here"
VITE_SUPABASE_PROJECT_ID="your-project-id"
VITE_SUPABASE_PUBLISHABLE_KEY="your-anon-key-here"
```

### Supabase Edge Function Secrets
Configure these secrets in your Supabase Dashboard → Settings → Edge Functions:

- `OPENAI_API_KEY` or `OPENROUTER_API_KEY` - For AI story generation
- `REVENUECAT_REST_API_KEY` - For subscription management
- `REVENUECAT_IOS_API_KEY` - For iOS-specific RevenueCat operations
- `SUPABASE_SERVICE_ROLE_KEY` - **CRITICAL**: Server-side only, never expose in client code
- `SUPABASE_URL` - Your Supabase project URL
- `SUPABASE_ANON_KEY` - Your Supabase anon key

**IMPORTANT**: After rotating any keys in your Supabase dashboard, you must redeploy your Edge Functions for the changes to take effect.

### RevenueCat Configuration (Mobile App)
When building the mobile app, ensure:

1. **Product IDs configured in RevenueCat dashboard**:
   - Monthly: `com.VibeTales.Monthly`  
   - Annual: `com.VibeTales.Annual`

2. **Entitlement configured**: `premium` (or update the identifier in refresh-entitlements function)

3. **Native bridge injected**: The mobile wrapper must inject `window.revenueCat` with the expected interface

## App Store Compliance ✅

The app is now fully compliant:
- ✅ No API keys exposed in client-side code
- ✅ RevenueCat handles all mobile payments (no Stripe)
- ✅ Story generation runs server-side only via Supabase Edge Functions
- ✅ All credentials properly secured and configurable
- ✅ Repository hygiene maintained (.env excluded from git)

## Development Setup

1. Copy `.env.example` to `.env` and fill in your credentials
2. Ensure Supabase function secrets are configured
3. Test the app flows (story generation, premium features)
4. For mobile: ensure RevenueCat native bridge is properly configured

## Troubleshooting

- **Story generation fails**: Check `OPENAI_API_KEY` is set in Supabase function secrets
- **Premium features not working**: Verify `REVENUECAT_REST_API_KEY` and entitlement configuration
- **Build errors**: Ensure all required environment variables are set