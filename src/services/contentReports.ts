import { supabase } from "@/integrations/supabase/client";
import { getCurrentUser } from "@/utils/supabaseHelpers";

export interface ContentReport {
  id: string;
  user_id: string;
  story_title: string;
  story_content: string;
  report_reason: string;
  report_details?: string;
  status: string;
  created_at: string;
  updated_at: string;
}

export interface ReportReason {
  id: string;
  reason_code: string;
  display_name: string;
  description?: string;
}

export const submitContentReport = async (
  storyTitle: string,
  storyContent: string,
  reportReason: string,
  reportDetails?: string
): Promise<void> => {
  const user = await getCurrentUser();

  const { error } = await supabase
    .from("content_reports")
    .insert({
      user_id: user.id,
      story_title: storyTitle,
      story_content: storyContent,
      report_reason: reportReason as any,
      report_details: reportDetails,
      status: 'pending'
    });

  if (error) {
    console.error("Error submitting content report:", error);
    throw new Error("Failed to submit content report");
  }
};

export const getUserReports = async (): Promise<ContentReport[]> => {
  const user = await getCurrentUser();

  const { data, error } = await supabase
    .from("content_reports")
    .select("*")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false });

  if (error) {
    console.error("Error fetching user reports:", error);
    throw new Error("Failed to fetch reports");
  }

  return data || [];
};

export const getReportReasons = async (): Promise<ReportReason[]> => {
  const { data, error } = await supabase
    .from("report_reasons")
    .select("*")
    .order("display_name");

  if (error) {
    console.error("Error fetching report reasons:", error);
    throw new Error("Failed to fetch report reasons");
  }

  return data || [];
};