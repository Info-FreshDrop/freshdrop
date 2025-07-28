import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { 
  Megaphone, 
  Mail, 
  Gift, 
  TrendingUp,
  PlusCircle,
  BarChart3,
  Calendar,
  Target
} from "lucide-react";

export function MarketingDashboard() {
  const { signOut } = useAuth();

  return (
    <div className="min-h-screen bg-gradient-wave">
      <div className="container mx-auto px-4 py-8">
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl font-bold bg-gradient-primary bg-clip-text text-transparent">
              Marketing Dashboard
            </h1>
            <p className="text-muted-foreground">
              Manage campaigns, promotions, and communications
            </p>
          </div>
          <div className="flex items-center gap-4">
            <Badge variant="secondary" className="px-3 py-1">
              <Megaphone className="h-3 w-3 mr-1" />
              Marketing Access
            </Badge>
            <Button variant="outline" onClick={signOut}>
              Sign Out
            </Button>
          </div>
        </div>

        {/* Campaign Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <Card className="border-0 shadow-soft">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Active Campaigns</p>
                  <p className="text-2xl font-bold">5</p>
                </div>
                <Target className="h-8 w-8 text-primary" />
              </div>
            </CardContent>
          </Card>

          <Card className="border-0 shadow-soft">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Email Open Rate</p>
                  <p className="text-2xl font-bold">68%</p>
                </div>
                <Mail className="h-8 w-8 text-accent" />
              </div>
            </CardContent>
          </Card>

          <Card className="border-0 shadow-soft">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Promo Redemptions</p>
                  <p className="text-2xl font-bold">142</p>
                </div>
                <Gift className="h-8 w-8 text-secondary" />
              </div>
            </CardContent>
          </Card>

          <Card className="border-0 shadow-soft">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Conversion Rate</p>
                  <p className="text-2xl font-bold">12.4%</p>
                </div>
                <TrendingUp className="h-8 w-8 text-success" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Marketing Tools */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <Card className="border-0 shadow-soft">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Mail className="h-5 w-5 text-primary" />
                Email Campaigns
              </CardTitle>
              <CardDescription>
                Create and manage email marketing campaigns
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <Button variant="hero" className="w-full">
                  <PlusCircle className="h-4 w-4 mr-2" />
                  New Campaign
                </Button>
                <Button variant="outline" className="w-full">
                  View Templates
                </Button>
                <Button variant="outline" className="w-full">
                  Campaign Analytics
                </Button>
              </div>
            </CardContent>
          </Card>

          <Card className="border-0 shadow-soft">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Gift className="h-5 w-5 text-accent" />
                Promotions & Discounts
              </CardTitle>
              <CardDescription>
                Manage promo codes and special offers
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <Button variant="hero" className="w-full">
                  <PlusCircle className="h-4 w-4 mr-2" />
                  Create Promo Code
                </Button>
                <Button variant="outline" className="w-full">
                  Active Promotions
                </Button>
                <Button variant="outline" className="w-full">
                  Redemption Reports
                </Button>
              </div>
            </CardContent>
          </Card>

          <Card className="border-0 shadow-soft">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Megaphone className="h-5 w-5 text-secondary" />
                Push Notifications
              </CardTitle>
              <CardDescription>
                Send targeted app notifications
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <Button variant="hero" className="w-full">
                  Send Notification
                </Button>
                <Button variant="outline" className="w-full">
                  Scheduled Messages
                </Button>
                <Button variant="outline" className="w-full">
                  Notification History
                </Button>
              </div>
            </CardContent>
          </Card>

          <Card className="border-0 shadow-soft">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <BarChart3 className="h-5 w-5 text-primary" />
                Analytics & Reports
              </CardTitle>
              <CardDescription>
                Track campaign performance and ROI
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <Button variant="outline" className="w-full">
                  Campaign Performance
                </Button>
                <Button variant="outline" className="w-full">
                  Customer Engagement
                </Button>
                <Button variant="outline" className="w-full">
                  Revenue Attribution
                </Button>
              </div>
            </CardContent>
          </Card>

          <Card className="border-0 shadow-soft">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Calendar className="h-5 w-5 text-accent" />
                Content Calendar
              </CardTitle>
              <CardDescription>
                Plan and schedule marketing content
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <Button variant="outline" className="w-full">
                  View Calendar
                </Button>
                <Button variant="outline" className="w-full">
                  Schedule Content
                </Button>
                <Button variant="outline" className="w-full">
                  Content Library
                </Button>
              </div>
            </CardContent>
          </Card>

          <Card className="border-0 shadow-soft">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Target className="h-5 w-5 text-secondary" />
                Customer Segments
              </CardTitle>
              <CardDescription>
                Target specific customer groups
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <Button variant="outline" className="w-full">
                  Create Segment
                </Button>
                <Button variant="outline" className="w-full">
                  Active Segments
                </Button>
                <Button variant="outline" className="w-full">
                  Segment Analytics
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}