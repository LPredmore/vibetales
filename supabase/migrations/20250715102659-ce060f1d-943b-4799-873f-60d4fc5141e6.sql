-- Create enum for report reasons
CREATE TYPE public.report_reason AS ENUM (
  'inappropriate_content',
  'factual_errors',
  'harmful_content',
  'spam_content',
  'copyright_violation',
  'other'
);

-- Create content_reports table
CREATE TABLE public.content_reports (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  story_title TEXT NOT NULL,
  story_content TEXT NOT NULL,
  report_reason report_reason NOT NULL,
  report_details TEXT,
  status TEXT NOT NULL DEFAULT 'pending',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.content_reports ENABLE ROW LEVEL SECURITY;

-- Create policies for content_reports
CREATE POLICY "Users can create their own reports" 
ON public.content_reports 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can view their own reports" 
ON public.content_reports 
FOR SELECT 
USING (auth.uid() = user_id);

-- Create report_reasons lookup table
CREATE TABLE public.report_reasons (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  reason_code report_reason NOT NULL UNIQUE,
  display_name TEXT NOT NULL,
  description TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on report_reasons (publicly readable)
ALTER TABLE public.report_reasons ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Report reasons are publicly readable"
ON public.report_reasons
FOR SELECT
USING (true);

-- Insert default report reasons
INSERT INTO public.report_reasons (reason_code, display_name, description) VALUES
('inappropriate_content', 'Inappropriate Content', 'Content that is offensive, explicit, or unsuitable'),
('factual_errors', 'Factual Errors', 'Story contains incorrect or misleading information'),
('harmful_content', 'Harmful Content', 'Content that could be harmful or dangerous'),
('spam_content', 'Spam Content', 'Repetitive or low-quality content'),
('copyright_violation', 'Copyright Violation', 'Content that may infringe on copyrights'),
('other', 'Other', 'Other issues not covered by the above categories');

-- Create trigger for automatic timestamp updates on content_reports
CREATE TRIGGER update_content_reports_updated_at
BEFORE UPDATE ON public.content_reports
FOR EACH ROW
EXECUTE FUNCTION public.update_modified_column();