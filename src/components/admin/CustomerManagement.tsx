import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ArrowLeft, Search, Users, Mail, Phone, Calendar } from "lucide-react";
import { LoadingSpinner } from "@/components/LoadingSpinner";

interface Customer {
  id: string;
  user_id: string;
  first_name: string | null;
  last_name: string | null;
  phone: string | null;
  created_at: string;
  total_orders: number;
  last_order_date: string | null;
}

interface CustomerManagementProps {
  onBack: () => void;
}

export const CustomerManagement = ({ onBack }: CustomerManagementProps) => {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const { toast } = useToast();

  useEffect(() => {
    loadCustomers();
  }, []);

  const loadCustomers = async () => {
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
          created_at: customer.created_at,
          total_orders: customerOrders.length,
          last_order_date: lastOrder?.created_at || null,
        };
      });

      setCustomers(processedCustomers);
    } catch (error) {
      console.error("Error loading customers:", error);
      toast({
        title: "Error",
        description: "Failed to load customers",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const filteredCustomers = customers.filter(customer => {
    const fullName = `${customer.first_name || ''} ${customer.last_name || ''}`.toLowerCase();
    const phone = customer.phone?.toLowerCase() || '';
    const search = searchTerm.toLowerCase();
    
    return fullName.includes(search) || phone.includes(search);
  });

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString();
  };

  const getCustomerName = (customer: Customer) => {
    if (!customer.first_name && !customer.last_name) return 'No name provided';
    return `${customer.first_name || ''} ${customer.last_name || ''}`.trim();
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

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span>Customer List ({filteredCustomers.length} customers)</span>
            <div className="flex items-center gap-2">
              <Search className="h-4 w-4" />
              <Input
                placeholder="Search by name or phone..."
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
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <Mail className="h-3 w-3" />
                      <span className="text-xs">Email not accessible (Auth protected)</span>
                    </div>
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
                  <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                    {searchTerm ? 'No customers found matching your search.' : 'No customers found.'}
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
};