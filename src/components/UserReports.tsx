import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { getUserReports, ContentReport } from "@/services/contentReports";
import { useToastNotifications } from "@/hooks/useToastNotifications";
import { format } from "date-fns";

export const UserReports = () => {
  const [reports, setReports] = useState<ContentReport[]>([]);
  const [loading, setLoading] = useState(true);
  const notifications = useToastNotifications();

  useEffect(() => {
    const fetchReports = async () => {
      try {
        const userReports = await getUserReports();
        setReports(userReports);
      } catch (error: any) {
        console.error("Error fetching reports:", error);
        notifications.reportsLoadFailed(error.message);
      } finally {
        setLoading(false);
      }
    };

    fetchReports();
  }, []);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'reviewed':
        return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'resolved':
        return 'bg-green-100 text-green-800 border-green-200';
      case 'dismissed':
        return 'bg-gray-100 text-gray-800 border-gray-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const formatReasonCode = (reasonCode: string) => {
    return reasonCode.split('_').map(word => 
      word.charAt(0).toUpperCase() + word.slice(1)
    ).join(' ');
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center py-8">
        <div className="text-muted-foreground">Loading reports...</div>
      </div>
    );
  }

  if (reports.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Your Content Reports</CardTitle>
          <CardDescription>
            You haven't submitted any content reports yet.
          </CardDescription>
        </CardHeader>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-2xl font-bold mb-2">Your Content Reports</h2>
        <p className="text-muted-foreground">
          Track the status of your submitted content reports.
        </p>
      </div>
      
      <div className="space-y-4">
        {reports.map((report) => (
          <Card key={report.id}>
            <CardHeader>
              <div className="flex justify-between items-start">
                <div className="flex-1">
                  <CardTitle className="text-lg">{report.story_title}</CardTitle>
                  <CardDescription>
                    Reported on {format(new Date(report.created_at), 'PPP')}
                  </CardDescription>
                </div>
                <Badge className={getStatusColor(report.status)}>
                  {report.status.charAt(0).toUpperCase() + report.status.slice(1)}
                </Badge>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div>
                  <span className="font-medium text-sm">Reason: </span>
                  <span className="text-sm">{formatReasonCode(report.report_reason)}</span>
                </div>
                
                {report.report_details && (
                  <div>
                    <span className="font-medium text-sm">Details: </span>
                    <p className="text-sm text-muted-foreground mt-1">
                      {report.report_details}
                    </p>
                  </div>
                )}
                
                <Separator />
                
                <div>
                  <span className="font-medium text-sm">Story Content:</span>
                  <p className="text-sm text-muted-foreground mt-1 line-clamp-3">
                    {report.story_content.substring(0, 200)}
                    {report.story_content.length > 200 && "..."}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
};