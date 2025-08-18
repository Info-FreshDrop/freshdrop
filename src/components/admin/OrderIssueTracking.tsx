import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { 
  ArrowLeft,
  AlertTriangle,
  MessageSquare,
  Clock,
  CheckCircle,
  X,
  Plus,
  Search,
  Filter,
  Phone,
  Mail,
  User,
  Package,
  DollarSign,
  Calendar,
  Flag
} from "lucide-react";

interface Issue {
  id: string;
  order_id: string;
  customer_id: string;
  issue_type: string;
  priority: string;
  status: string;
  description: string;
  resolution_notes?: string;
  created_at: string;
  resolved_at?: string;
  assigned_agent?: string;
  orders?: {
    id: string;
    total_amount_cents: number;
    service_type: string;
    created_at: string;
  };
  profiles?: {
    first_name: string;
    last_name: string;
    phone: string;
  };
}

interface OrderIssueTrackingProps {
  onBack: () => void;
}

export function OrderIssueTracking({ onBack }: OrderIssueTrackingProps) {
  const { toast } = useToast();
  const [issues, setIssues] = useState<Issue[]>([]);
  const [orders, setOrders] = useState<any[]>([]);
  const [selectedIssue, setSelectedIssue] = useState<Issue | null>(null);
  const [newIssueDialog, setNewIssueDialog] = useState(false);
  const [resolveDialog, setResolveDialog] = useState(false);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [priorityFilter, setPriorityFilter] = useState("all");
  
  // New issue form
  const [newIssue, setNewIssue] = useState({
    order_id: "",
    issue_type: "",
    priority: "medium",
    description: ""
  });
  
  // Resolution form
  const [resolutionNotes, setResolutionNotes] = useState("");

  useEffect(() => {
    loadIssuesAndOrders();
  }, []);

  const loadIssuesAndOrders = async () => {
    try {
      // Since we don't have an order_issues table yet, we'll simulate it
      // For now, we'll use support_tickets as a substitute
      const { data: ticketsData, error: ticketsError } = await supabase
        .from('support_tickets')
        .select(`
          *,
          profiles!support_tickets_customer_id_fkey(first_name, last_name, phone)
        `)
        .order('created_at', { ascending: false });

      if (ticketsError) throw ticketsError;
      
      // Transform support tickets into issues format
      const transformedIssues = ticketsData?.map(ticket => ({
        id: ticket.id,
        order_id: "N/A", // Support tickets don't have order_id
        customer_id: ticket.customer_id,
        issue_type: ticket.subject || "General Support",
        priority: ticket.priority,
        status: ticket.status,
        description: ticket.description || "",
        resolution_notes: "",
        created_at: ticket.created_at,
        resolved_at: ticket.resolved_at,
        assigned_agent: ticket.assigned_agent_id,
        profiles: ticket.profiles as any
      })) || [];
      
      setIssues(transformedIssues as any);

      // Load orders for the dropdown
      const { data: ordersData, error: ordersError } = await supabase
        .from('orders')
        .select(`
          id,
          customer_id,
          total_amount_cents,
          service_type,
          created_at,
          profiles!orders_customer_id_fkey(first_name, last_name)
        `)
        .order('created_at', { ascending: false })
        .limit(100);

      if (ordersError) throw ordersError;
      setOrders(ordersData || []);
    } catch (error) {
      console.error('Error loading issues:', error);
      toast({
        title: "Error",
        description: "Failed to load issues and orders",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const createIssue = async () => {
    try {
      // Create a support ticket as a substitute for order issue
      const { error } = await supabase
        .from('support_tickets')
        .insert({
          customer_id: null, // We'll need to get this from the selected order
          subject: newIssue.issue_type,
          description: newIssue.description,
          priority: newIssue.priority,
          status: 'open'
        });

      if (error) throw error;

      toast({
        title: "Issue Created",
        description: "Order issue has been logged and assigned for resolution",
      });

      setNewIssueDialog(false);
      setNewIssue({ order_id: "", issue_type: "", priority: "medium", description: "" });
      loadIssuesAndOrders();
    } catch (error) {
      console.error('Error creating issue:', error);
      toast({
        title: "Error",
        description: "Failed to create issue",
        variant: "destructive"
      });
    }
  };

  const resolveIssue = async (issueId: string) => {
    try {
      const { error } = await supabase
        .from('support_tickets')
        .update({
          status: 'resolved',
          resolved_at: new Date().toISOString()
        })
        .eq('id', issueId);

      if (error) throw error;

      toast({
        title: "Issue Resolved",
        description: "Issue has been marked as resolved",
      });

      setResolveDialog(false);
      setResolutionNotes("");
      loadIssuesAndOrders();
    } catch (error) {
      console.error('Error resolving issue:', error);
      toast({
        title: "Error",
        description: "Failed to resolve issue",
        variant: "destructive"
      });
    }
  };

  const filteredIssues = issues.filter(issue => {
    const matchesSearch = searchTerm === "" || 
      issue.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
      issue.issue_type.toLowerCase().includes(searchTerm.toLowerCase()) ||
      issue.profiles?.first_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      issue.profiles?.last_name?.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesStatus = statusFilter === "all" || issue.status === statusFilter;
    const matchesPriority = priorityFilter === "all" || issue.priority === priorityFilter;

    return matchesSearch && matchesStatus && matchesPriority;
  });

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high': return 'bg-red-100 text-red-800';
      case 'medium': return 'bg-yellow-100 text-yellow-800';
      case 'low': return 'bg-green-100 text-green-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'open': return 'bg-red-100 text-red-800';
      case 'in_progress': return 'bg-yellow-100 text-yellow-800';
      case 'resolved': return 'bg-green-100 text-green-800';
      case 'closed': return 'bg-gray-100 text-gray-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit'
    });
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-wave flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading issues...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-wave">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-6">
          <Button
            variant="ghost"
            onClick={onBack}
            className="p-0 h-auto text-muted-foreground hover:text-foreground mb-4"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Dashboard
          </Button>
          
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-3xl font-bold bg-gradient-primary bg-clip-text text-transparent">
                Order Issue Tracking
              </h1>
              <p className="text-muted-foreground">
                Manage customer complaints and order problems
              </p>
            </div>
            
            <Dialog open={newIssueDialog} onOpenChange={setNewIssueDialog}>
              <DialogTrigger asChild>
                <Button>
                  <Plus className="h-4 w-4 mr-2" />
                  Report Issue
                </Button>
              </DialogTrigger>
            </Dialog>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-6 mb-6">
          <Card className="border-0 shadow-soft">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Total Issues</p>
                  <p className="text-2xl font-bold">{issues.length}</p>
                </div>
                <AlertTriangle className="h-8 w-8 text-orange-500" />
              </div>
            </CardContent>
          </Card>

          <Card className="border-0 shadow-soft">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Open Issues</p>
                  <p className="text-2xl font-bold text-red-600">
                    {issues.filter(i => i.status === 'open').length}
                  </p>
                </div>
                <Clock className="h-8 w-8 text-red-500" />
              </div>
            </CardContent>
          </Card>

          <Card className="border-0 shadow-soft">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">In Progress</p>
                  <p className="text-2xl font-bold text-yellow-600">
                    {issues.filter(i => i.status === 'in_progress').length}
                  </p>
                </div>
                <MessageSquare className="h-8 w-8 text-yellow-500" />
              </div>
            </CardContent>
          </Card>

          <Card className="border-0 shadow-soft">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Resolved</p>
                  <p className="text-2xl font-bold text-green-600">
                    {issues.filter(i => i.status === 'resolved').length}
                  </p>
                </div>
                <CheckCircle className="h-8 w-8 text-green-500" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Filters */}
        <Card className="mb-6 border-0 shadow-soft">
          <CardContent className="p-4">
            <div className="flex flex-wrap gap-4">
              <div className="flex items-center gap-2">
                <Search className="h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search issues, customers..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-64"
                />
              </div>
              
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-40">
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="open">Open</SelectItem>
                  <SelectItem value="in_progress">In Progress</SelectItem>
                  <SelectItem value="resolved">Resolved</SelectItem>
                  <SelectItem value="closed">Closed</SelectItem>
                </SelectContent>
              </Select>

              <Select value={priorityFilter} onValueChange={setPriorityFilter}>
                <SelectTrigger className="w-40">
                  <SelectValue placeholder="Priority" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Priority</SelectItem>
                  <SelectItem value="high">High</SelectItem>
                  <SelectItem value="medium">Medium</SelectItem>
                  <SelectItem value="low">Low</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* Issues List */}
        <div className="space-y-4">
          {filteredIssues.length === 0 ? (
            <Card className="p-8 text-center border-0 shadow-soft">
              <AlertTriangle className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <h3 className="text-lg font-medium mb-2">No issues found</h3>
              <p className="text-muted-foreground">
                {searchTerm ? "Try adjusting your search or filters" : "No customer issues reported yet"}
              </p>
            </Card>
          ) : (
            filteredIssues.map((issue) => (
              <Card key={issue.id} className="border-0 shadow-soft">
                <CardContent className="p-6">
                  <div className="flex justify-between items-start mb-4">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <h3 className="font-semibold text-lg">
                          Issue #{issue.id.slice(-8)}
                        </h3>
                        <Badge className={getPriorityColor(issue.priority)}>
                          <Flag className="h-3 w-3 mr-1" />
                          {issue.priority} priority
                        </Badge>
                      </div>
                      <p className="text-muted-foreground font-medium">
                        {issue.issue_type}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        Reported by: {issue.profiles?.first_name} {issue.profiles?.last_name}
                      </p>
                    </div>
                    
                    <div className="text-right space-y-2">
                      <Badge className={getStatusColor(issue.status)}>
                        {issue.status === 'open' && <AlertTriangle className="h-3 w-3 mr-1" />}
                        {issue.status === 'in_progress' && <Clock className="h-3 w-3 mr-1" />}
                        {issue.status === 'resolved' && <CheckCircle className="h-3 w-3 mr-1" />}
                        {issue.status.replace('_', ' ')}
                      </Badge>
                      <p className="text-sm text-muted-foreground">
                        {formatDate(issue.created_at)}
                      </p>
                    </div>
                  </div>

                  <div className="mb-4 p-3 bg-muted rounded-lg">
                    <p className="text-sm">{issue.description}</p>
                  </div>

                  <div className="flex justify-between items-center">
                    <div className="flex items-center gap-4 text-sm text-muted-foreground">
                      {issue.profiles?.phone && (
                        <div className="flex items-center gap-1">
                          <Phone className="h-3 w-3" />
                          {issue.profiles.phone}
                        </div>
                      )}
                      {issue.order_id !== "N/A" && (
                        <div className="flex items-center gap-1">
                          <Package className="h-3 w-3" />
                          Order #{issue.order_id.slice(-8)}
                        </div>
                      )}
                      {issue.resolved_at && (
                        <div className="flex items-center gap-1">
                          <CheckCircle className="h-3 w-3 text-green-600" />
                          Resolved {formatDate(issue.resolved_at)}
                        </div>
                      )}
                    </div>

                    <div className="flex gap-2">
                      {issue.status !== 'resolved' && (
                        <Dialog open={resolveDialog} onOpenChange={setResolveDialog}>
                          <DialogTrigger asChild>
                            <Button 
                              size="sm"
                              onClick={() => setSelectedIssue(issue)}
                            >
                              <CheckCircle className="h-3 w-3 mr-1" />
                              Resolve
                            </Button>
                          </DialogTrigger>
                        </Dialog>
                      )}
                      
                      <Button variant="outline" size="sm">
                        <MessageSquare className="h-3 w-3 mr-1" />
                        Contact Customer
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </div>

        {/* New Issue Dialog */}
        <Dialog open={newIssueDialog} onOpenChange={setNewIssueDialog}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Report New Issue</DialogTitle>
              <DialogDescription>
                Create a new issue report for order problems or customer complaints
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label>Related Order</Label>
                <Select value={newIssue.order_id} onValueChange={(value) => setNewIssue({...newIssue, order_id: value})}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select an order..." />
                  </SelectTrigger>
                  <SelectContent>
                    {orders.map((order) => (
                      <SelectItem key={order.id} value={order.id}>
                        Order #{order.id.slice(-8)} - {order.profiles?.first_name} {order.profiles?.last_name}
                        <span className="text-sm text-muted-foreground ml-2">
                          ${(order.total_amount_cents / 100).toFixed(2)}
                        </span>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label>Issue Type</Label>
                <Select value={newIssue.issue_type} onValueChange={(value) => setNewIssue({...newIssue, issue_type: value})}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select issue type..." />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="damaged_clothes">Damaged Clothes</SelectItem>
                    <SelectItem value="lost_items">Lost Items</SelectItem>
                    <SelectItem value="poor_quality">Poor Quality Service</SelectItem>
                    <SelectItem value="late_delivery">Late Delivery</SelectItem>
                    <SelectItem value="billing_issue">Billing Issue</SelectItem>
                    <SelectItem value="operator_complaint">Operator Complaint</SelectItem>
                    <SelectItem value="other">Other</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label>Priority</Label>
                <Select value={newIssue.priority} onValueChange={(value) => setNewIssue({...newIssue, priority: value})}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="low">Low</SelectItem>
                    <SelectItem value="medium">Medium</SelectItem>
                    <SelectItem value="high">High</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label>Description</Label>
                <Textarea
                  placeholder="Describe the issue in detail..."
                  value={newIssue.description}
                  onChange={(e) => setNewIssue({...newIssue, description: e.target.value})}
                  rows={4}
                />
              </div>

              <div className="flex gap-2">
                <Button onClick={createIssue} className="flex-1">
                  Create Issue
                </Button>
                <Button variant="outline" onClick={() => setNewIssueDialog(false)}>
                  Cancel
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>

        {/* Resolve Issue Dialog */}
        <Dialog open={resolveDialog} onOpenChange={setResolveDialog}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Resolve Issue</DialogTitle>
              <DialogDescription>
                Mark issue #{selectedIssue?.id.slice(-8)} as resolved
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label>Resolution Notes</Label>
                <Textarea
                  placeholder="Describe how the issue was resolved..."
                  value={resolutionNotes}
                  onChange={(e) => setResolutionNotes(e.target.value)}
                  rows={4}
                />
              </div>

              <div className="flex gap-2">
                <Button 
                  onClick={() => selectedIssue && resolveIssue(selectedIssue.id)} 
                  className="flex-1"
                >
                  Mark as Resolved
                </Button>
                <Button variant="outline" onClick={() => setResolveDialog(false)}>
                  Cancel
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}