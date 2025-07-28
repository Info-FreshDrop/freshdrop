import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { 
  Package, 
  Clock, 
  MapPin, 
  Camera,
  CheckCircle,
  ArrowLeft,
  Image as ImageIcon
} from "lucide-react";

interface Order {
  id: string;
  customer_id: string;
  pickup_type: string;
  service_type: string;
  status: string;
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
  pickup_photo_url: string | null;
  delivery_photo_url: string | null;
  step_photos: any;
  claimed_at: string | null;
  completed_at: string | null;
  created_at: string;
  profiles?: {
    first_name: string;
    last_name: string;
    phone: string;
  } | null;
}

interface OrderHistoryProps {
  onBack?: () => void;
}

export function OrderHistory({ onBack }: OrderHistoryProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedPhoto, setSelectedPhoto] = useState<string | null>(null);

  useEffect(() => {
    if (user) {
      loadOrderHistory();
    }
  }, [user]);

  const loadOrderHistory = async () => {
    try {
      const { data, error } = await supabase
        .from('orders')
        .select(`
          *,
          profiles!orders_customer_id_profiles_fkey(first_name, last_name, phone)
        `)
        .eq('customer_id', user?.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setOrders(data || []);
    } catch (error) {
      console.error('Error loading order history:', error);
      toast({
        title: "Error",
        description: "Failed to load order history.",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed':
        return 'bg-green-100 text-green-800';
      case 'in_progress':
      case 'washed':
        return 'bg-blue-100 text-blue-800';
      case 'claimed':
        return 'bg-yellow-100 text-yellow-800';
      case 'unclaimed':
        return 'bg-gray-100 text-gray-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const PhotoPreview = ({ src, alt, label }: { src: string; alt: string; label: string }) => (
    <div className="flex flex-col items-center">
      <div 
        className="relative w-16 h-16 rounded-lg overflow-hidden border cursor-pointer hover:opacity-80 transition-opacity"
        onClick={() => setSelectedPhoto(src)}
      >
        <img 
          src={src} 
          alt={alt}
          className="w-full h-full object-cover"
          onError={(e) => {
            e.currentTarget.style.display = 'none';
            e.currentTarget.nextElementSibling?.setAttribute('style', 'display: flex');
          }}
        />
        <div className="w-full h-full bg-muted flex items-center justify-center" style={{ display: 'none' }}>
          <ImageIcon className="h-6 w-6 text-muted-foreground" />
        </div>
      </div>
      <span className="text-xs text-muted-foreground mt-1">{label}</span>
    </div>
  );

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-wave flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading order history...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-wave">
      <div className="container mx-auto px-4 py-6">
        {/* Header */}
        <div className="flex items-center gap-4 mb-6">
          {onBack && (
            <Button variant="outline" size="icon" onClick={onBack}>
              <ArrowLeft className="h-4 w-4" />
            </Button>
          )}
          <div>
            <h1 className="text-2xl font-bold bg-gradient-primary bg-clip-text text-transparent">
              Order History
            </h1>
            <p className="text-muted-foreground">View your past orders and photos</p>
          </div>
        </div>

        {/* Orders List */}
        {orders.length === 0 ? (
          <Card className="p-8 text-center">
            <Package className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <h3 className="text-lg font-medium mb-2">No orders yet</h3>
            <p className="text-muted-foreground">Your order history will appear here once you place an order.</p>
          </Card>
        ) : (
          <div className="space-y-4">
            {orders.map((order) => {
              console.log('Order step_photos:', order.step_photos); // Debug log
              return (
              <Card key={order.id} className="hover:shadow-md transition-shadow">
                <CardHeader>
                  <div className="flex justify-between items-start">
                    <div>
                      <CardTitle className="text-lg">Order #{order.id.slice(0, 8)}</CardTitle>
                      <p className="text-sm text-muted-foreground">
                        Placed on {formatDate(order.created_at)}
                      </p>
                    </div>
                    <div className="text-right">
                      <Badge className={getStatusColor(order.status)}>
                        {order.status.replace('_', ' ').toUpperCase()}
                      </Badge>
                      {order.is_express && (
                        <Badge variant="destructive" className="ml-2">
                          EXPRESS
                        </Badge>
                      )}
                    </div>
                  </div>
                </CardHeader>
                
                <CardContent className="space-y-4">
                  {/* Order Details */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <h4 className="font-medium mb-2">Service Details</h4>
                      <div className="space-y-1 text-sm text-muted-foreground">
                        <p>Service: {order.service_type.replace('_', ' ')}</p>
                        <p>Type: {order.pickup_type}</p>
                        <p>Bags: {order.bag_count}</p>
                        <p>Total: ${(order.total_amount_cents / 100).toFixed(2)}</p>
                      </div>
                    </div>
                    
                    <div>
                      <h4 className="font-medium mb-2">Timeline</h4>
                      <div className="space-y-1 text-sm text-muted-foreground">
                        {order.claimed_at && (
                          <p>Claimed: {formatDate(order.claimed_at)}</p>
                        )}
                        {order.completed_at && (
                          <p>Completed: {formatDate(order.completed_at)}</p>
                        )}
                        {order.pickup_window_start && (
                          <p>
                            Pickup Window: {new Date(order.pickup_window_start).toLocaleTimeString([], { 
                              hour: '2-digit', 
                              minute: '2-digit' 
                            })} - {new Date(order.pickup_window_end!).toLocaleTimeString([], { 
                              hour: '2-digit', 
                              minute: '2-digit' 
                            })}
                          </p>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Addresses */}
                  {(order.pickup_address || order.delivery_address) && (
                    <div>
                      <h4 className="font-medium mb-2">Addresses</h4>
                      <div className="space-y-1 text-sm text-muted-foreground">
                        {order.pickup_address && (
                          <p className="flex items-center gap-2">
                            <MapPin className="h-3 w-3" />
                            Pickup: {order.pickup_address}
                          </p>
                        )}
                        {order.delivery_address && (
                          <p className="flex items-center gap-2">
                            <MapPin className="h-3 w-3" />
                            Delivery: {order.delivery_address}
                          </p>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Special Instructions */}
                  {order.special_instructions && (
                    <div>
                      <h4 className="font-medium mb-2">Special Instructions</h4>
                      <p className="text-sm text-muted-foreground bg-muted p-2 rounded">
                        {order.special_instructions}
                      </p>
                    </div>
                  )}

                  {/* Photos */}
                  {(order.pickup_photo_url || order.delivery_photo_url || order.step_photos) && (
                    <div>
                      <h4 className="font-medium mb-3 flex items-center gap-2">
                        <Camera className="h-4 w-4" />
                        Order Photos
                      </h4>
                      <div className="flex gap-4 flex-wrap">
                        {/* Priority photos first: Pickup and Drop-off */}
                        {order.pickup_photo_url && (
                          <PhotoPreview 
                            src={order.pickup_photo_url} 
                            alt="Pickup photo"
                            label="Pickup Photo"
                          />
                        )}
                        {order.step_photos?.step_12 && (
                          <PhotoPreview 
                            src={order.step_photos.step_12} 
                            alt="Drop-off confirmation photo"
                            label="Drop-off Photo"
                          />
                        )}
                        {order.delivery_photo_url && (
                          <PhotoPreview 
                            src={order.delivery_photo_url} 
                            alt="Delivery photo"
                            label="Delivery Photo"
                          />
                        )}
                        
                        {/* Process photos */}
                        {order.step_photos && Object.entries(order.step_photos)
                          .filter(([step]) => step !== 'step_12') // Exclude step_12 since we show it above
                          .sort(([a], [b]) => {
                            const stepA = parseInt(a.replace('step_', ''));
                            const stepB = parseInt(b.replace('step_', ''));
                            return stepA - stepB;
                          })
                          .map(([step, photoUrl]) => {
                            const stepNumber = step.replace('step_', '');
                            const getStepLabel = (stepNum: string) => {
                              switch (stepNum) {
                                case '1': return 'Pickup Photo';
                                case '2': return 'Pre-wash Photo';
                                case '3': return 'Washing Photo';
                                case '4': return 'Drying Photo';
                                case '5': return 'Folding Photo';
                                case '6': return 'Quality Check';
                                case '7': return 'Packaging Photo';
                                case '8': return 'Ready for Delivery';
                                case '9': return 'In Transit';
                                case '10': return 'Delivery Prep';
                                case '11': return 'Final Check';
                                default: return `Step ${stepNum}`;
                              }
                            };
                            
                            return (
                              <PhotoPreview 
                                key={step}
                                src={photoUrl as string} 
                                alt={`${getStepLabel(stepNumber)} photo`}
                                label={getStepLabel(stepNumber)}
                              />
                            );
                          })}
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
              );
            })}
          </div>
        )}

        {/* Photo Modal */}
        <Dialog open={!!selectedPhoto} onOpenChange={() => setSelectedPhoto(null)}>
          <DialogContent className="max-w-3xl">
            <DialogHeader>
              <DialogTitle>Order Photo</DialogTitle>
            </DialogHeader>
            {selectedPhoto && (
              <div className="flex justify-center">
                <img 
                  src={selectedPhoto} 
                  alt="Order photo"
                  className="max-w-full max-h-[70vh] object-contain rounded-lg"
                />
              </div>
            )}
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}