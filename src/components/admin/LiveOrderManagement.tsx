import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { 
  ArrowLeft,
  Package, 
  Clock, 
  CheckCircle,
  AlertTriangle,
  MapPin,
  Phone,
  User,
  DollarSign,
  Filter,
  Search,
  UserCheck,
  RefreshCw,
  MessageSquare,
  Eye,
  Edit,
  Truck
} from "lucide-react";

interface Order {
  id: string;
  customer_id: string;
  pickup_type: string;
  service_type: string;
  status: string;
  locker_id: string | null;
  is_express: boolean;
  pickup_window_start: string | null;
  pickup_window_end: string | null;
  delivery_window_start: string | null;
  delivery_window_end: string | null;
  bag_count: number;
  total_amount_cents: number;
  special_instructions: string | null;
  pickup_address: string | null;
  delivery_address: string | null;
  zip_code: string;
  washer_id: string | null;
  claimed_at: string | null;
  completed_at: string | null;
  created_at: string;
  profiles?: {
    first_name: string;
    last_name: string;
    phone: string;
  } | null;
  washers?: {
    user_id: string;
    profiles: {
      first_name: string;
      last_name: string;
      phone: string;
    };
  } | null;
}

interface LiveOrderManagementProps {
  onBack: () => void;
}

export function LiveOrderManagement({ onBack }: LiveOrderManagementProps) {
  const { toast } = useToast();
  const [orders, setOrders] = useState<Order[]>([]);
  const [operators, setOperators] = useState<any[]>([]);
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [activeTab, setActiveTab] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [serviceFilter, setServiceFilter] = useState("all");
  const [searchTerm, setSearchTerm] = useState("");
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [assignDialogOpen, setAssignDialogOpen] = useState(false);
  const [selectedOperator, setSelectedOperator] = useState("");
  const [newNote, setNewNote] = useState("");

  useEffect(() => {
    loadOrdersAndOperators();
    
    // Set up real-time subscriptions
    const channel = supabase
      .channel('live-orders')
      .on('postgres_changes', 
        { event: 'INSERT', schema: 'public', table: 'orders' },
        () => loadOrdersAndOperators()
      )
      .on('postgres_changes', 
        { event: 'UPDATE', schema: 'public', table: 'orders' },
        () => loadOrdersAndOperators()
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const loadOrdersAndOperators = async () => {
    try {
      // Load all orders with customer and operator info
      const { data: ordersData, error: ordersError } = await supabase
        .from('orders')
        .select(`
          *,
          profiles!orders_customer_id_fkey(first_name, last_name, phone),
          washers!orders_washer_id_fkey(
            user_id,
            profiles!washers_user_id_fkey(first_name, last_name, phone)
          )
        `)
        .order('created_at', { ascending: false });

      if (ordersError) throw ordersError;
      setOrders((ordersData as any) || []);

      // Load all operators
      const { data: operatorsData, error: operatorsError } = await supabase
        .from('washers')
        .select(`
          id,
          is_online,
          zip_codes,
          profiles!washers_user_id_fkey(first_name, last_name, phone)
        `)
        .eq('is_active', true)
        .eq('approval_status', 'approved');

      if (operatorsError) throw operatorsError;
      setOperators(operatorsData || []);
    } catch (error) {
      console.error('Error loading data:', error);
      toast({
        title: "Error",
        description: "Failed to load orders and operators",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const filteredOrders = orders.filter(order => {
    const matchesTab = activeTab === "all" || 
      (activeTab === "new" && order.status === "unclaimed") ||
      (activeTab === "active" && ["claimed", "in_progress", "washed"].includes(order.status)) ||
      (activeTab === "completed" && order.status === "completed") ||
      (activeTab === "issues" && order.status === "cancelled");

    const matchesStatus = statusFilter === "all" || order.status === statusFilter;
    const matchesService = serviceFilter === "all" || order.service_type === serviceFilter;
    const matchesSearch = searchTerm === "" || 
      order.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
      order.profiles?.first_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      order.profiles?.last_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      order.zip_code.includes(searchTerm);

    return matchesTab && matchesStatus && matchesService && matchesSearch;
  });

  const assignOperator = async (orderId: string, operatorId: string) => {
    try {
      const { error } = await supabase
        .from('orders')
        .update({
          washer_id: operatorId,
          status: 'claimed',
          claimed_at: new Date().toISOString()
        })
        .eq('id', orderId);

      if (error) throw error;

      // Send notification about operator assignment
      const order = orders.find(o => o.id === orderId);
      if (order) {
        try {
          await supabase.functions.invoke('send-order-notifications', {
            body: {
              orderId: order.id,
              customerId: order.customer_id,
              status: 'claimed',
              orderNumber: order.id.substring(0, 8).toUpperCase()
            }
          });
        } catch (notificationError) {
          console.error('Failed to send notification:', notificationError);
        }
      }

      toast({
        title: "Operator Assigned",
        description: "Order has been assigned to the selected operator",
      });

      setAssignDialogOpen(false);
      setSelectedOperator("");
      loadOrdersAndOperators();
    } catch (error) {
      console.error('Error assigning operator:', error);
      toast({
        title: "Error",
        description: "Failed to assign operator",
        variant: "destructive"
      });
    }
  };

  const updateOrderStatus = async (orderId: string, newStatus: string) => {
    try {
      const updateData: any = { status: newStatus };
      if (newStatus === 'completed') {
        updateData.completed_at = new Date().toISOString();
      }

      const { error } = await supabase
        .from('orders')
        .update(updateData)
        .eq('id', orderId);

      if (error) throw error;

      // Send notification about status change
      const order = orders.find(o => o.id === orderId);
      if (order) {
        try {
          await supabase.functions.invoke('send-order-notifications', {
            body: {
              orderId: order.id,
              customerId: order.customer_id,
              status: newStatus,
              orderNumber: order.id.substring(0, 8).toUpperCase()
            }
          });
        } catch (notificationError) {
          console.error('Failed to send notification:', notificationError);
        }
      }

      toast({
        title: "Status Updated",
        description: `Order status changed to ${newStatus}`,
      });

      loadOrdersAndOperators();
    } catch (error) {
      console.error('Error updating status:', error);
      toast({
        title: "Error",
        description: "Failed to update order status",
        variant: "destructive"
      });
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'unclaimed': return 'bg-yellow-100 text-yellow-800';
      case 'claimed': return 'bg-blue-100 text-blue-800';
      case 'in_progress': return 'bg-purple-100 text-purple-800';
      case 'washed': return 'bg-indigo-100 text-indigo-800';
      case 'completed': return 'bg-green-100 text-green-800';
      case 'cancelled': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'unclaimed': return <Clock className="h-4 w-4" />;
      case 'claimed': return <UserCheck className="h-4 w-4" />;
      case 'in_progress': return <RefreshCw className="h-4 w-4" />;
      case 'washed': return <CheckCircle className="h-4 w-4" />;
      case 'completed': return <CheckCircle className="h-4 w-4" />;
      case 'cancelled': return <AlertTriangle className="h-4 w-4" />;
      default: return <Package className="h-4 w-4" />;
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
          <RefreshCw className="h-8 w-8 animate-spin mx-auto mb-4 text-primary" />
          <p className="text-muted-foreground">Loading orders...</p>
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
                Live Order Management
              </h1>
              <p className="text-muted-foreground">
                Real-time order tracking and operator assignment
              </p>
            </div>
            <Button onClick={loadOrdersAndOperators} variant="outline">
              <RefreshCw className="h-4 w-4 mr-2" />
              Refresh
            </Button>
          </div>
        </div>

        {/* Filters */}
        <Card className="mb-6 border-0 shadow-soft">
          <CardContent className="p-4">
            <div className="flex flex-wrap gap-4">
              <div className="flex items-center gap-2">
                <Search className="h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search orders, customers, or zip codes..."
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
                  <SelectItem value="unclaimed">Unclaimed</SelectItem>
                  <SelectItem value="claimed">Claimed</SelectItem>
                  <SelectItem value="in_progress">In Progress</SelectItem>
                  <SelectItem value="washed">Washed</SelectItem>
                  <SelectItem value="completed">Completed</SelectItem>
                  <SelectItem value="cancelled">Cancelled</SelectItem>
                </SelectContent>
              </Select>

              <Select value={serviceFilter} onValueChange={setServiceFilter}>
                <SelectTrigger className="w-40">
                  <SelectValue placeholder="Service" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Services</SelectItem>
                  <SelectItem value="wash_fold">Wash & Fold</SelectItem>
                  <SelectItem value="wash_hang_dry">Wash & Hang Dry</SelectItem>
                  <SelectItem value="express">Express</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* Order Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="grid w-full grid-cols-5">
            <TabsTrigger value="all">
              All Orders ({orders.length})
            </TabsTrigger>
            <TabsTrigger value="new">
              New ({orders.filter(o => o.status === 'unclaimed').length})
            </TabsTrigger>
            <TabsTrigger value="active">
              Active ({orders.filter(o => ['claimed', 'in_progress', 'washed'].includes(o.status)).length})
            </TabsTrigger>
            <TabsTrigger value="completed">
              Completed ({orders.filter(o => o.status === 'completed').length})
            </TabsTrigger>
            <TabsTrigger value="issues">
              Issues ({orders.filter(o => o.status === 'cancelled').length})
            </TabsTrigger>
          </TabsList>

          <TabsContent value={activeTab} className="space-y-4">
            {filteredOrders.length === 0 ? (
              <Card className="p-8 text-center border-0 shadow-soft">
                <Package className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                <h3 className="text-lg font-medium mb-2">No orders found</h3>
                <p className="text-muted-foreground">
                  {searchTerm ? "Try adjusting your search or filters" : "Orders will appear here when customers place them"}
                </p>
              </Card>
            ) : (
              <div className="space-y-4">
                {filteredOrders.map((order) => (
                  <Card key={order.id} className="border-0 shadow-soft">
                    <CardContent className="p-6">
                      <div className="flex justify-between items-start mb-4">
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <h3 className="font-semibold text-lg">
                              Order #{order.id.slice(-8)}
                            </h3>
                            {order.is_express && (
                              <Badge variant="secondary">Express</Badge>
                            )}
                          </div>
                          <p className="text-muted-foreground">
                            {order.profiles?.first_name} {order.profiles?.last_name}
                          </p>
                          <div className="flex items-center gap-4 text-sm text-muted-foreground">
                            <div className="flex items-center gap-1">
                              <Phone className="h-3 w-3" />
                              {order.profiles?.phone}
                            </div>
                            <div className="flex items-center gap-1">
                              <MapPin className="h-3 w-3" />
                              {order.zip_code}
                            </div>
                            <div className="flex items-center gap-1">
                              <Clock className="h-3 w-3" />
                              {formatDate(order.created_at)}
                            </div>
                          </div>
                        </div>
                        
                        <div className="text-right space-y-2">
                          <Badge className={getStatusColor(order.status)}>
                            {getStatusIcon(order.status)}
                            <span className="ml-1 capitalize">
                              {order.status.replace('_', ' ')}
                            </span>
                          </Badge>
                          <p className="text-lg font-bold text-green-600">
                            ${(order.total_amount_cents / 100).toFixed(2)}
                          </p>
                        </div>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                        <div>
                          <p className="text-sm font-medium text-muted-foreground">Service</p>
                          <p className="capitalize">{order.service_type.replace('_', ' ')}</p>
                          <p className="text-sm text-muted-foreground">{order.bag_count} bags</p>
                        </div>
                        
                        <div>
                          <p className="text-sm font-medium text-muted-foreground">Pickup Type</p>
                          <p className="capitalize">{order.pickup_type.replace('_', ' ')}</p>
                          {order.pickup_address && (
                            <p className="text-sm text-muted-foreground">{order.pickup_address}</p>
                          )}
                        </div>
                        
                        <div>
                          <p className="text-sm font-medium text-muted-foreground">Operator</p>
                          {order.washers ? (
                            <div>
                              <p>{order.washers.profiles.first_name} {order.washers.profiles.last_name}</p>
                              <p className="text-sm text-muted-foreground">{order.washers.profiles.phone}</p>
                            </div>
                          ) : (
                            <p className="text-muted-foreground">Unassigned</p>
                          )}
                        </div>
                      </div>

                      {order.special_instructions && (
                        <div className="mb-4 p-3 bg-muted rounded-lg">
                          <p className="text-sm font-medium mb-1">Special Instructions</p>
                          <p className="text-sm text-muted-foreground">{order.special_instructions}</p>
                        </div>
                      )}

                      {/* Action Buttons */}
                      <div className="flex gap-2 flex-wrap">
                        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
                          <DialogTrigger asChild>
                            <Button 
                              variant="outline" 
                              size="sm"
                              onClick={() => setSelectedOrder(order)}
                            >
                              <Eye className="h-3 w-3 mr-1" />
                              View Details
                            </Button>
                          </DialogTrigger>
                        </Dialog>

                        {order.status === 'unclaimed' && (
                          <Dialog open={assignDialogOpen} onOpenChange={setAssignDialogOpen}>
                            <DialogTrigger asChild>
                              <Button 
                                size="sm"
                                onClick={() => setSelectedOrder(order)}
                              >
                                <UserCheck className="h-3 w-3 mr-1" />
                                Assign Operator
                              </Button>
                            </DialogTrigger>
                          </Dialog>
                        )}

                        {order.status === 'claimed' && (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => updateOrderStatus(order.id, 'in_progress')}
                          >
                            Mark In Progress
                          </Button>
                        )}

                        {order.status === 'in_progress' && (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => updateOrderStatus(order.id, 'washed')}
                          >
                            Mark Washed
                          </Button>
                        )}

                        {order.status === 'washed' && (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => updateOrderStatus(order.id, 'completed')}
                          >
                            Mark Completed
                          </Button>
                        )}

                        <Button variant="outline" size="sm">
                          <MessageSquare className="h-3 w-3 mr-1" />
                          Contact Customer
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>

        {/* Order Details Dialog */}
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Order Details</DialogTitle>
              <DialogDescription>
                Complete information for order #{selectedOrder?.id.slice(-8)}
              </DialogDescription>
            </DialogHeader>
            {selectedOrder && (
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>Customer</Label>
                    <p className="font-medium">
                      {selectedOrder.profiles?.first_name} {selectedOrder.profiles?.last_name}
                    </p>
                    <p className="text-sm text-muted-foreground">{selectedOrder.profiles?.phone}</p>
                  </div>
                  <div>
                    <Label>Status</Label>
                    <Badge className={getStatusColor(selectedOrder.status)}>
                      {selectedOrder.status.replace('_', ' ')}
                    </Badge>
                  </div>
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>Service Type</Label>
                    <p className="capitalize">{selectedOrder.service_type.replace('_', ' ')}</p>
                  </div>
                  <div>
                    <Label>Total Amount</Label>
                    <p className="font-bold text-green-600">
                      ${(selectedOrder.total_amount_cents / 100).toFixed(2)}
                    </p>
                  </div>
                </div>

                {selectedOrder.pickup_address && (
                  <div>
                    <Label>Pickup Address</Label>
                    <p>{selectedOrder.pickup_address}</p>
                  </div>
                )}

                {selectedOrder.delivery_address && (
                  <div>
                    <Label>Delivery Address</Label>
                    <p>{selectedOrder.delivery_address}</p>
                  </div>
                )}

                {selectedOrder.special_instructions && (
                  <div>
                    <Label>Special Instructions</Label>
                    <p className="p-3 bg-muted rounded">{selectedOrder.special_instructions}</p>
                  </div>
                )}

                <div>
                  <Label>Order Timeline</Label>
                  <div className="space-y-2 mt-2">
                    <div className="flex items-center gap-2 text-sm">
                      <div className="w-2 h-2 rounded-full bg-green-600"></div>
                      <span>Order Placed: {formatDate(selectedOrder.created_at)}</span>
                    </div>
                    {selectedOrder.claimed_at && (
                      <div className="flex items-center gap-2 text-sm">
                        <div className="w-2 h-2 rounded-full bg-blue-600"></div>
                        <span>Order Claimed: {formatDate(selectedOrder.claimed_at)}</span>
                      </div>
                    )}
                    {selectedOrder.completed_at && (
                      <div className="flex items-center gap-2 text-sm">
                        <div className="w-2 h-2 rounded-full bg-green-600"></div>
                        <span>Order Completed: {formatDate(selectedOrder.completed_at)}</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}
          </DialogContent>
        </Dialog>

        {/* Assign Operator Dialog */}
        <Dialog open={assignDialogOpen} onOpenChange={setAssignDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Assign Operator</DialogTitle>
              <DialogDescription>
                Select an operator to assign to order #{selectedOrder?.id.slice(-8)}
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label>Available Operators</Label>
                <Select value={selectedOperator} onValueChange={setSelectedOperator}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select an operator..." />
                  </SelectTrigger>
                  <SelectContent>
                    {operators.map((operator) => (
                      <SelectItem key={operator.id} value={operator.id}>
                        <div className="flex items-center gap-2">
                          <div className={`w-2 h-2 rounded-full ${operator.is_online ? 'bg-green-500' : 'bg-gray-400'}`}></div>
                          {operator.profiles.first_name} {operator.profiles.last_name}
                          <span className="text-sm text-muted-foreground">
                            ({operator.zip_codes?.join(', ')})
                          </span>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              
              <div className="flex gap-2">
                <Button 
                  onClick={() => selectedOrder && assignOperator(selectedOrder.id, selectedOperator)}
                  disabled={!selectedOperator}
                  className="flex-1"
                >
                  Assign Operator
                </Button>
                <Button variant="outline" onClick={() => setAssignDialogOpen(false)}>
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