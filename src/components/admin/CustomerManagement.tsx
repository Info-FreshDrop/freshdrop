import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Search, Users, Mail, Phone, Calendar, Gift, MessageSquare, Eye, AlertTriangle } from "lucide-react";
import { LoadingSpinner } from "@/components/LoadingSpinner";

interface Customer {
  id: string;
  user_id: string;
  first_name: string | null;
  last_name: string | null;
  phone: string | null;
  email: string | null;
  birthday: string | null;
  opt_in_email: boolean;
  opt_in_sms: boolean;
  created_at: string;
  total_orders: number;
  last_order_date: string | null;
}

interface SupportTicket {
  id: string;
  subject: string;
  status: string;
  priority: string;
  created_at: string;
  customer_id: string;
  profiles?: {
    first_name: string;
    last_name: string;
  };
}

interface CustomerManagementProps {
  onBack: () => void;
}

export const CustomerManagement = ({ onBack }: CustomerManagementProps) => {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [supportTickets, setSupportTickets] = useState<SupportTicket[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [activeTab, setActiveTab] = useState('customers');
  const { toast } = useToast();

  useEffect(() => {
    loadData();
    
    // Set up real-time subscription for profile updates
    const channel = supabase
      .channel('customer-profiles')
      .on('postgres_changes', 
        { event: 'INSERT', schema: 'public', table: 'profiles' },
        () => loadData()
      )
      .on('postgres_changes', 
        { event: 'UPDATE', schema: 'public', table: 'profiles' },
        () => loadData()
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      
      // Query profiles for customers with order counts
      const { data: customerData, error } = await supabase
        .from('profiles')
        .select(`
          id,
          user_id,
          first_name,
          last_name,
          phone,
          email,
          birthday,
          opt_in_email,
          opt_in_sms,
          created_at
        `)
        .order('created_at', { ascending: false });

      if (error) {
        console.error("Error loading customers:", error);
        toast({
          title: "Error",
          description: "Failed to load customers",
          variant: "destructive",
        });
        return;
      }

      // Get order statistics for each customer
      const customerIds = customerData?.map(c => c.user_id) || [];
      const { data: orderStats, error: orderError } = await supabase
        .from('orders')
        .select('customer_id, created_at')
        .in('customer_id', customerIds);

      if (orderError) {
        console.error("Error loading order stats:", orderError);
      }

      // Process customer data with order statistics
      const processedCustomers: Customer[] = (customerData || []).map(customer => {
        const customerOrders = (orderStats || []).filter(order => order.customer_id === customer.user_id);
        const lastOrder = customerOrders.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())[0];

        return {
          id: customer.id,
          user_id: customer.user_id,
          first_name: customer.first_name,
          last_name: customer.last_name,
          phone: customer.phone,
          email: customer.email,
          birthday: customer.birthday,
          opt_in_email: customer.opt_in_email || false,
          opt_in_sms: customer.opt_in_sms || false,
          created_at: customer.created_at,
          total_orders: customerOrders.length,
          last_order_date: lastOrder?.created_at || null,
        };
      });

      setCustomers(processedCustomers);

      // Load support tickets
      const { data: ticketsData, error: ticketsError } = await supabase
        .from('support_tickets')
        .select(`
          id,
          subject,
          status,
          priority,
          created_at,
          customer_id,
          profiles(first_name, last_name)
        `)
        .order('created_at', { ascending: false })
        .limit(100);

      if (ticketsError) {
        console.error("Error loading support tickets:", ticketsError);
        // Don't throw here, just log the error as tickets are secondary
      } else {
        setSupportTickets((ticketsData as any) || []);
      }

    } catch (error) {
      console.error("Error loading data:", error);
      toast({
        title: "Error",
        description: "Failed to load data",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const filteredCustomers = customers.filter(customer => {
    const fullName = `${customer.first_name || ''} ${customer.last_name || ''}`.toLowerCase();
    const phone = customer.phone?.toLowerCase() || '';
    const email = customer.email?.toLowerCase() || '';
    const search = searchTerm.toLowerCase();
    
    return fullName.includes(search) || phone.includes(search) || email.includes(search);
  });

  const filteredSupportTickets = supportTickets.filter(ticket => {
    const customerName = `${ticket.profiles?.first_name || ''} ${ticket.profiles?.last_name || ''}`.toLowerCase();
    const subject = ticket.subject.toLowerCase();
    const search = searchTerm.toLowerCase();
    
    return customerName.includes(search) || subject.includes(search) || ticket.id.includes(search);
  });

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString();
  };

  const getCustomerName = (customer: Customer) => {
    if (!customer.first_name && !customer.last_name) return 'No name provided';
    return `${customer.first_name || ''} ${customer.last_name || ''}`.trim();
  };

  const getTicketStatusColor = (status: string) => {
    switch (status) {
      case 'open': return 'bg-red-100 text-red-800';
      case 'in_progress': return 'bg-yellow-100 text-yellow-800';
      case 'resolved': return 'bg-green-100 text-green-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getTicketPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high': return 'bg-red-100 text-red-800';
      case 'medium': return 'bg-yellow-100 text-yellow-800';
      case 'low': return 'bg-green-100 text-green-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  if (loading) {
    return <LoadingSpinner />;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="outline" onClick={onBack}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Dashboard
        </Button>
        <div className="flex items-center gap-2">
          <Users className="h-5 w-5" />
          <h1 className="text-2xl font-bold">Customer Management</h1>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="customers" className="flex items-center gap-2">
            <Users className="h-4 w-4" />
            Customers ({customers.length})
          </TabsTrigger>
          <TabsTrigger value="support" className="flex items-center gap-2">
            <MessageSquare className="h-4 w-4" />
            Support Tickets ({supportTickets.length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="customers" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <span>Customer List ({filteredCustomers.length} customers)</span>
                <div className="flex items-center gap-2">
                  <Search className="h-4 w-4" />
                  <Input
                    placeholder="Search by name, phone, or email..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-64"
                  />
                </div>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Customer Name</TableHead>
                    <TableHead>Customer ID</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Phone</TableHead>
                    <TableHead>Birthday</TableHead>
                    <TableHead>Preferences</TableHead>
                    <TableHead>Registration Date</TableHead>
                    <TableHead>Total Orders</TableHead>
                    <TableHead>Last Order</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredCustomers.map((customer) => (
                    <TableRow key={customer.id}>
                      <TableCell className="font-medium">
                        {getCustomerName(customer)}
                      </TableCell>
                      <TableCell className="font-mono text-sm">
                        {customer.user_id}
                      </TableCell>
                      <TableCell>
                        {customer.email ? (
                          <div className="flex items-center gap-2">
                            <Mail className="h-3 w-3" />
                            <span className="text-sm">{customer.email}</span>
                          </div>
                        ) : (
                          <span className="text-muted-foreground">No email</span>
                        )}
                      </TableCell>
                      <TableCell>
                        {customer.phone ? (
                          <div className="flex items-center gap-2">
                            <Phone className="h-3 w-3" />
                            {customer.phone}
                          </div>
                        ) : (
                          <span className="text-muted-foreground">No phone</span>
                        )}
                      </TableCell>
                      <TableCell>
                        {customer.birthday ? (
                          <div className="flex items-center gap-2">
                            <Gift className="h-3 w-3" />
                            {formatDate(customer.birthday)}
                          </div>
                        ) : (
                          <span className="text-muted-foreground">No birthday</span>
                        )}
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-1">
                          {customer.opt_in_email && (
                            <div className="flex items-center gap-1 bg-blue-100 text-blue-800 px-2 py-1 rounded-full text-xs">
                              <Mail className="h-3 w-3" />
                              Email
                            </div>
                          )}
                          {customer.opt_in_sms && (
                            <div className="flex items-center gap-1 bg-green-100 text-green-800 px-2 py-1 rounded-full text-xs">
                              <MessageSquare className="h-3 w-3" />
                              SMS
                            </div>
                          )}
                          {!customer.opt_in_email && !customer.opt_in_sms && (
                            <span className="text-muted-foreground text-xs">None</span>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Calendar className="h-3 w-3" />
                          {formatDate(customer.created_at)}
                        </div>
                      </TableCell>
                      <TableCell>
                        <span className="bg-blue-100 text-blue-800 px-2 py-1 rounded-full text-xs">
                          {customer.total_orders}
                        </span>
                      </TableCell>
                      <TableCell>
                        {customer.last_order_date ? (
                          formatDate(customer.last_order_date)
                        ) : (
                          <span className="text-muted-foreground">No orders</span>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                  {filteredCustomers.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={9} className="text-center py-8 text-muted-foreground">
                        {searchTerm ? 'No customers found matching your search.' : 'No customers found.'}
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="support" className="space-y-6">
          <Card className="border-0 shadow-soft">
            <CardContent className="p-4">
              <div className="flex items-center gap-2">
                <Search className="h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search tickets by customer name, subject, or ID..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="flex-1"
                />
              </div>
            </CardContent>
          </Card>

          <div className="space-y-4">
            {filteredSupportTickets.map((ticket) => (
              <Card key={ticket.id} className="border-0 shadow-soft">
                <CardContent className="p-6">
                  <div className="flex justify-between items-start">
                    <div className="space-y-2">
                      <div className="flex items-center gap-3">
                        <h3 className="font-semibold">{ticket.subject}</h3>
                        <Badge className={getTicketStatusColor(ticket.status)}>
                          {ticket.status}
                        </Badge>
                        <Badge className={getTicketPriorityColor(ticket.priority)}>
                          {ticket.priority} priority
                        </Badge>
                      </div>
                      
                      <div className="text-sm text-muted-foreground">
                        <p>Customer: {ticket.profiles?.first_name} {ticket.profiles?.last_name}</p>
                        <p>Created: {formatDate(ticket.created_at)}</p>
                        <p>Ticket ID: #{ticket.id.slice(-8)}</p>
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                      >
                        <Eye className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          {filteredSupportTickets.length === 0 && (
            <Card className="border-0 shadow-soft">
              <CardContent className="p-12 text-center">
                <AlertTriangle className="h-16 w-16 mx-auto mb-4 text-muted-foreground opacity-50" />
                <h3 className="text-xl font-semibold mb-2">No Support Tickets Found</h3>
                <p className="text-muted-foreground">
                  {searchTerm ? 'Try adjusting your search criteria.' : 'No support tickets have been created yet.'}
                </p>
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
};