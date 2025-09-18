import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { submitContentReport, getReportReasons, ReportReason, ReportReasonType } from "@/services/contentReports";

interface ReportDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  storyTitle: string;
  storyContent: string;
}

export const ReportDialog = ({ open, onOpenChange, storyTitle, storyContent }: ReportDialogProps) => {
  const [reportReason, setReportReason] = useState<ReportReasonType | "">("");
  const [reportDetails, setReportDetails] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [reportReasons, setReportReasons] = useState<ReportReason[]>([]);

  useEffect(() => {
    const fetchReasons = async () => {
      try {
        const reasons = await getReportReasons();
        setReportReasons(reasons);
      } catch (error) {
        console.error("Error fetching report reasons:", error);
      }
    };

    if (open) {
      fetchReasons();
    }
  }, [open]);

  const handleSubmit = async () => {
    if (!reportReason) {
      toast.error("Please select a reason for reporting");
      return;
    }

    setIsSubmitting(true);
    try {
      await submitContentReport(storyTitle, storyContent, reportReason as ReportReasonType, reportDetails);
      toast.success("Content report submitted successfully");
      onOpenChange(false);
      setReportReason("");
      setReportDetails("");
    } catch (error: unknown) {
      console.error("Error submitting report:", error);
      toast.error((error as Error)?.message || "Failed to submit report");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Report Content</DialogTitle>
          <DialogDescription>
            Help us improve by reporting inappropriate or problematic content. Your report will be reviewed by our team.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="grid gap-2">
            <Label htmlFor="reason">Reason for reporting</Label>
            <Select value={reportReason} onValueChange={(value) => setReportReason(value as ReportReasonType)}>
              <SelectTrigger>
                <SelectValue placeholder="Select a reason" />
              </SelectTrigger>
              <SelectContent>
                {reportReasons.map((reason) => (
                  <SelectItem key={reason.id} value={reason.reason_code}>
                    {reason.display_name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="grid gap-2">
            <Label htmlFor="details">Additional details (optional)</Label>
            <Textarea
              id="details"
              placeholder="Please provide any additional context or details about the issue..."
              value={reportDetails}
              onChange={(e) => setReportDetails(e.target.value)}
              className="min-h-[80px]"
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isSubmitting}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={isSubmitting}>
            {isSubmitting ? "Submitting..." : "Submit Report"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};