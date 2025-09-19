// Types for Supabase Edge Functions
import type { SupabaseClient as SupabaseClientBase } from '@supabase/supabase-js';
import type { Database } from '@/integrations/supabase/types';

export interface SupabaseRequest {
  method: string;
  url: string;
  headers: Headers;
  json: () => Promise<unknown>;
}

export type SupabaseClient = SupabaseClientBase<Database>;

interface RevenueCatEntitlement {
  expires_date: string | null;
  [key: string]: unknown;
}

export interface StoryGenerationRequest {
  character?: string;
  plot?: string;
  setting?: string;
  theme?: string;
  lesson?: string;
  readingLevel: string;
  interestLevel: string;
  sightWords: string[];
  userId: string;
}

export interface StoryGenerationResponse {
  success: boolean;
  story?: string;
  error?: string;
  remainingGenerations?: number;
}

export interface RefreshEntitlementsRequest {
  userId?: string;
}

export interface RefreshEntitlementsResponse {
  success: boolean;
  entitlements?: Record<string, RevenueCatEntitlement>;
  error?: string;
}

export interface RevenueCatWebhookData {
  event_type: string;
  api_version: string;
  app_user_id: string;
  product_id: string;
  entitlement_ids?: string[];
  transaction_id?: string;
  original_transaction_id?: string;
  purchase_date?: string;
}

export interface DatabaseUser {
  id: string;
  email?: string;
  name?: string;
  daily_stories_used: number;
  trial_started_at?: string;
  trial_used: boolean;
  has_premium?: boolean;
}

export interface DatabaseProfile {
  id: string;
  user_id: string;
  revenue_cat_user_id?: string;
  has_premium: boolean;
  premium_expires_at?: string;
  created_at: string;
  updated_at: string;
}