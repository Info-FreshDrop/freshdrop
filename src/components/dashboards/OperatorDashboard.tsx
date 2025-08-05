import { useState, useEffect, useRef } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useCapacitor } from "@/hooks/useCapacitor";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { 
  Package, 
  Users, 
  MapPin, 
  Clock,
  CheckCircle,
  Circle,
  Phone,
  MessageSquare,
  Camera,
  AlertTriangle,
  DollarSign,
  Star,
  Truck,
  Upload,
  X,
  Navigation,
  ArrowLeft,
  Check,
  Settings,
  User,
  ExternalLink
} from "lucide-react";
import { ServiceAreaModal } from './ServiceAreaModal';
import { LiveOrderMap } from '../orders/LiveOrderMap';
import { OrdersOverviewMap } from '../orders/OrdersOverviewMap';
import { OperatorProfile } from '../customer/OperatorProfile';
import { OperatorZipCodeEditModal } from '../admin/OperatorZipCodeEditModal';
import { OrderMessaging } from '../customer/OrderMessaging';
import { useUnreadMessages } from '@/hooks/useUnreadMessages';
import { OperatorProfileSettings } from './OperatorProfileSettings';
import { ReviewsAndTips } from './ReviewsAndTips';

// Simple map component for navigation
function NavigationMap({ destination }: { destination?: string }) {
  if (!destination) {
    return (
      <div className="w-full h-48 bg-muted rounded-lg flex items-center justify-center">
        <div className="text-center">
          <MapPin className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
          <p className="text-sm text-muted-foreground">No destination address available</p>
        </div>
      </div>
    );
  }

  const googleMapsUrl = `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(destination)}`;
  const appleMapsUrl = `http://maps.apple.com/?daddr=${encodeURIComponent(destination)}`;

  return (
    <div className="w-full bg-muted rounded-lg p-4">
      <div className="flex items-center gap-2 mb-3">
        <MapPin className="h-5 w-5 text-primary" />
        <h5 className="font-medium">Navigation to Destination</h5>
      </div>
      <div className="space-y-3">
        <div className="text-sm">
          <p className="font-medium">📍 Destination:</p>
          <p className="text-muted-foreground">{destination}</p>
        </div>
        <div className="flex gap-2">
          <Button 
            variant="outline" 
            size="sm" 
            onClick={() => window.open(googleMapsUrl, '_blank')}
            className="flex-1"
          >
            <ExternalLink className="h-4 w-4 mr-1" />
            Google Maps
          </Button>
          <Button 
            variant="outline" 
            size="sm" 
            onClick={() => window.open(appleMapsUrl, '_blank')}
            className="flex-1"
          >
            <ExternalLink className="h-4 w-4 mr-1" />
            Apple Maps
          </Button>
        </div>
      </div>
    </div>
  );
}

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
  items: any;
  bag_count: number;
  total_amount_cents: number;
  claimed_at: string | null;
  completed_at: string | null;
  created_at: string;
  updated_at: string;
  discount_amount_cents: number | null;
  operator_payout_cents: number | null;
  business_cut_cents: number | null;
  step_photos: any;
  current_step: number | null;
  special_instructions: string | null;
  pickup_address: string | null;
  delivery_address: string | null;
  zip_code: string;
  washer_id: string | null;
  profiles?: {
    first_name: string;
    last_name: string;
    phone: string;
  } | null;
}

interface OperatorProfile {
  first_name: string;
  last_name: string;
  phone: string;
}

interface WasherData {
  id: string;
  user_id: string;
  zip_codes: string[];
  is_online: boolean;
  is_active: boolean;
  availability_schedule?: any;
  available_time_slots?: string[];
  max_orders_per_day?: number;
  service_radius_miles?: number;
  current_location?: {
    coordinates: [number, number];
  };
}

// Message Button Component with Unread Count
function OperatorMessageButton({ order, onClick }: { order: Order; onClick: () => void }) {
  const unreadCount = useUnreadMessages(order.id);
  
  return (
    <Button 
      variant="outline" 
      size="sm"
      className="relative"
      onClick={onClick}
    >
      <MessageSquare className="h-4 w-4 mr-1" />
      Message
      {unreadCount > 0 && (
        <div className="absolute -top-1 -right-1 w-4 h-4 bg-blue-500 text-white text-xs rounded-full flex items-center justify-center">
          {unreadCount}
        </div>
      )}
    </Button>
  );
}

export function OperatorDashboard() {
  const { user, signOut } = useAuth();
  const { toast } = useToast();
  const { getCurrentLocation } = useCapacitor();
  const [activeTab, setActiveTab] = useState("live-orders");
  const [selectedOrderForMessaging, setSelectedOrderForMessaging] = useState<Order | null>(null);
  const [availableOrders, setAvailableOrders] = useState<Order[]>([]);
  const [myOrders, setMyOrders] = useState<Order[]>([]);
  const [operatorProfile, setOperatorProfile] = useState<OperatorProfile | null>(null);
  const [washerData, setWasherData] = useState<WasherData | null>(null);
  const [loading, setLoading] = useState(true);
  const [confirmOrder, setConfirmOrder] = useState<Order | null>(null);
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [orderSteps, setOrderSteps] = useState<Record<string, number>>({});
  const [stepData, setStepData] = useState<Record<string, Record<string, any>>>({});
  const [showPhotoUpload, setShowPhotoUpload] = useState(false);
  const [photoStep, setPhotoStep] = useState<number | null>(null);
  const [uploading, setUploading] = useState(false);
  const [photoUploaded, setPhotoUploaded] = useState<Record<string, boolean>>({});
  const [bagCountInput, setBagCountInput] = useState<string>("");
  const [newZipCode, setNewZipCode] = useState<string>("");
  const [isAddingZipCode, setIsAddingZipCode] = useState(false);
  const [showServiceAreaModal, setShowServiceAreaModal] = useState(false);
  const [showLiveMap, setShowLiveMap] = useState(false);
  const [selectedMapOrder, setSelectedMapOrder] = useState<Order | null>(null);
  const [operatorLocation, setOperatorLocation] = useState<{ latitude: number; longitude: number } | null>(null);
  const [showZipCodeEdit, setShowZipCodeEdit] = useState(false);
  const [showProfileSettings, setShowProfileSettings] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (user) {
      loadDashboardData();
      getCurrentOperatorLocation();
    }
  }, [user]);

  const getCurrentOperatorLocation = async () => {
    try {
      const position = await getCurrentLocation();
      const newLocation = {
        latitude: position.latitude,
        longitude: position.longitude
      };
      setOperatorLocation(newLocation);
      
      // Store location in washer profile for persistence
      if (washerData?.id) {
        try {
          await supabase
            .from('washers')
            .update({
              // Note: current_location might need to be added to the database schema
              // For now, we'll just store it in state
            })
            .eq('id', washerData.id);
        } catch (error) {
          console.warn('Could not update location in database:', error);
        }
      }
      
      console.log('Operator location updated:', newLocation);
    } catch (error) {
      console.warn('Could not get operator location:', error);
      // Try to get location from stored data if available
      if (washerData?.current_location) {
        try {
          const coords = washerData.current_location.coordinates;
          if (coords && coords.length === 2) {
            setOperatorLocation({
              latitude: coords[1],
              longitude: coords[0]
            });
            console.log('Using stored operator location:', coords);
          }
        } catch (parseError) {
          console.warn('Could not parse stored location:', parseError);
        }
      }
    }
  };

  const loadDashboardData = async () => {
    try {
      // Load operator profile
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('first_name, last_name, phone')
        .eq('user_id', user?.id)
        .maybeSingle();

      if (profileError) {
        console.error('Error loading profile:', profileError);
      }
      setOperatorProfile(profile);

      // Load washer data
      const { data: washer, error: washerError } = await supabase
        .from('washers')
        .select('*')
        .eq('user_id', user?.id)
        .maybeSingle();

      if (washerError) {
        console.error('Error loading washer data:', washerError);
        setLoading(false);
        return;
      }

      if (!washer) {
        console.error('No washer data found for user');
        setLoading(false);
        return;
      }

      setWasherData(washer);
      console.log('Loaded washer data:', washer);

      // Load available orders - include both 'placed' and 'unclaimed' orders
      const { data: available, error: availableError } = await supabase
        .from('orders')
        .select(`
          *,
          profiles!orders_customer_id_profiles_fkey(first_name, last_name, phone),
          wash_temp_preference:laundry_preferences!orders_wash_temp_preference_id_fkey(name),
          dry_temp_preference:laundry_preferences!orders_dry_temp_preference_id_fkey(name),
          soap_preference:laundry_preferences!orders_soap_preference_id_fkey(name)
        `)
        .in('status', ['placed', 'unclaimed'])
        .in('zip_code', washer.zip_codes)
        .order('created_at', { ascending: true });

      if (availableError) {
        console.error('Error loading available orders:', availableError);
      }
      setAvailableOrders((available as any) || []);
      console.log('Loaded available orders:', (available as any) || []);

      // Load operator's claimed orders
      const { data: claimed, error: claimedError } = await supabase
        .from('orders')
        .select(`
          *,
          profiles!orders_customer_id_profiles_fkey(first_name, last_name, phone),
          wash_temp_preference:laundry_preferences!orders_wash_temp_preference_id_fkey(name),
          dry_temp_preference:laundry_preferences!orders_dry_temp_preference_id_fkey(name),
          soap_preference:laundry_preferences!orders_soap_preference_id_fkey(name)
        `)
        .eq('washer_id', washer.id)
        .in('status', ['claimed', 'in_progress', 'picked_up', 'washed', 'folded', 'completed'])
        .order('claimed_at', { ascending: true });

      if (claimedError) {
        console.error('Error loading claimed orders:', claimedError);
      }
      const claimedOrders = (claimed as any) || [];
      
      // Fix any orders that are stuck with current_step > 13
      for (const order of claimedOrders) {
        if (order.current_step > 13 && order.status !== 'completed') {
          console.log(`Fixing stuck order ${order.id} with step ${order.current_step}`);
          try {
            await supabase
              .from('orders')
              .update({
                status: 'completed',
                completed_at: new Date().toISOString(),
                current_step: 13
              })
              .eq('id', order.id);
            
            toast({
              title: "Order Fixed",
              description: `Order ${order.id.slice(0, 8)} was automatically marked as completed.`,
            });
          } catch (fixError) {
            console.error('Error fixing stuck order:', fixError);
          }
        }
      }
      
      // Reload orders after potential fixes
      const { data: updatedClaimed } = await supabase
        .from('orders')
        .select(`
          *,
          profiles!orders_customer_id_profiles_fkey(first_name, last_name, phone),
          wash_temp_preference:laundry_preferences!orders_wash_temp_preference_id_fkey(name),
          dry_temp_preference:laundry_preferences!orders_dry_temp_preference_id_fkey(name),
          soap_preference:laundry_preferences!orders_soap_preference_id_fkey(name)
        `)
        .eq('washer_id', washer.id)
        .in('status', ['claimed', 'in_progress', 'picked_up', 'washed', 'folded', 'completed'])
        .order('claimed_at', { ascending: true });
      
      setMyOrders((updatedClaimed as any) || []);

      setLoading(false);
    } catch (error) {
      console.error('Error loading dashboard:', error);
      setLoading(false);
    }
  };

  const getOrderProgressInfo = (order: Order) => {
    const currentStep = orderSteps[order.id] || order.current_step || 1;
    
    const progressMap: Record<string, { text: string; color: string; step: number }> = {
      'claimed': { text: 'Ready for pickup', color: 'text-blue-600', step: 1 },
      'in_progress': { text: 'In progress', color: 'text-orange-600', step: 6 },
      'picked_up': { text: 'Picked up, heading to wash', color: 'text-purple-600', step: 7 },
      'washed': { text: 'Washed, ready for folding', color: 'text-indigo-600', step: 9 },
      'folded': { text: 'Folded, ready for delivery', color: 'text-green-600', step: 11 },
      'completed': { text: 'Completed', color: 'text-green-700', step: 13 }
    };

    const info = progressMap[order.status] || { text: 'Unknown status', color: 'text-gray-600', step: 1 };
    return {
      progressText: info.text,
      progressColor: info.color,
      currentStep: Math.max(currentStep, info.step)
    };
  };

  const openLiveOrderMap = (order: Order) => {
    setSelectedMapOrder(order);
    setShowLiveMap(true);
  };

  const getDetailedStepInstruction = (stepIndex: number, order: Order) => {
    const customerName = `${order.profiles?.first_name || 'Customer'} ${order.profiles?.last_name || ''}`.trim();
    const totalBags = order.bag_count || 1;
    const washTempPref = (order as any).wash_temp_preference?.name || 'standard';
    const dryTempPref = (order as any).dry_temp_preference?.name || 'standard';
    
    switch (stepIndex) {
      case 0:
        return "Prepare for pickup - Bring clear bags, large waterproof labels, and a permanent marker";
      case 1:
        return `Use the map below to navigate to customer pickup location. The bag should be outside when you arrive.`;
      case 2:
        return "Locate the bags at the pickup location and proceed to the next step.";
      case 3:
        return `Label each bag with: "${customerName} - Bag X of ${totalBags} - Order #${order.id.slice(0, 8)} - DIRTY"`;
      case 4:
        return `Account and verify items - Expected bags: ${totalBags}. Enter the actual number of bags you picked up.`;
      case 5:
        return "Transport bags to your washing location safely.";
      case 6:
        return `Washing process - Customer preference: ${washTempPref} wash temperature`;
      case 7:
        return `Drying process - Customer preference: ${dryTempPref}`;
      case 8:
        return "Folding process - Fold clothes neatly according to customer preferences.";
      case 9:
        return "Quality check - Ensure all items are clean, properly folded, and ready for delivery.";
      case 10:
        return `Re-label bags for delivery with: "${customerName} - Bag X of ${totalBags} - Order #${order.id.slice(0, 8)} - CLEAN"`;
      case 11:
        return `Use the map below to navigate to delivery location (same as pickup). Deliver within 24 hours of pickup.`;
      case 12:
        return "Complete delivery - Ensure customer receives all bags and mark order as complete.";
      default:
        return "Complete this step";
    }
  };

  const getWorkflowSteps = () => [
    { 
      title: "Prepare for pickup", 
      description: "Bring clear bags, large waterproof labels, and a permanent marker", 
      requiresPhoto: false, 
      instructions: `📋 REQUIRED ITEMS TO BRING:
• Clear waterproof bags (for sorting and transport)
• Large waterproof labels (for bag identification)
• Permanent marker (for writing customer details)`
    },
    { 
      title: "Navigate to pickup location", 
      description: "Use the map below", 
      requiresPhoto: false, 
      instructions: `🗺️ Use the map below to navigate to customer pickup location. The bag should be outside when you arrive.`,
      showMap: true,
      destination: selectedOrder?.pickup_address
    },
    { 
      title: "Locate bags at pickup location", 
      description: "Find customer's laundry bags", 
      requiresPhoto: false, 
      instructions: `🔍 Locate the bags at the pickup location and proceed to the next step.`
    },
    { 
      title: "Label each bag with customer info", 
      description: "Apply waterproof identification labels", 
      requiresPhoto: true, 
      instructions: `🏷️ Label each bag with: "${selectedOrder?.profiles ? `${selectedOrder.profiles.first_name} ${selectedOrder.profiles.last_name}` : 'Customer Name'} - Bag X of ${selectedOrder?.bag_count || '?'} - Order #${selectedOrder?.id?.slice(0, 8) || 'Order ID'} - DIRTY"`
    },
    { 
      title: "Account and verify items", 
      description: "Count bags and verify against order", 
      requiresPhoto: false, 
      instructions: `🔢 Expected bags: ${selectedOrder?.bag_count || 'Unknown'}. Enter the actual number of bags you picked up.`,
      requiresBagCount: true
    },
    { 
      title: "Transport to washing location", 
      description: "Load and transport safely", 
      requiresPhoto: false, 
      instructions: `🚗 Transport bags to your washing location safely.`
    },
    { 
      title: "Washing process", 
      description: "Wash according to customer preferences", 
      requiresPhoto: false, 
      instructions: `🧽 Customer preference: ${(selectedOrder as any)?.wash_temp_preference?.name || 'standard'} wash temperature`
    },
    { 
      title: "Drying process", 
      description: "Dry according to customer preferences", 
      requiresPhoto: false, 
      instructions: `🌪️ Customer preference: ${(selectedOrder as any)?.dry_temp_preference?.name || 'standard'}`
    },
    { 
      title: "Folding process", 
      description: "Fold clothes neatly", 
      requiresPhoto: false, 
      instructions: `👔 Fold clothes neatly according to customer preferences.`
    },
    { 
      title: "Quality check", 
      description: "Ensure items are ready for delivery", 
      requiresPhoto: false, 
      instructions: `✅ Ensure all items are clean, properly folded, and ready for delivery.`
    },
    { 
      title: "Re-label bags for delivery", 
      description: "Apply clean delivery labels", 
      requiresPhoto: false, 
      instructions: `📦 Re-label bags with: "${selectedOrder?.profiles ? `${selectedOrder.profiles.first_name} ${selectedOrder.profiles.last_name}` : 'Customer Name'} - Bag X of ${selectedOrder?.bag_count || '?'} - Order #${selectedOrder?.id?.slice(0, 8) || 'Order ID'} - CLEAN"`
    },
    { 
      title: "Navigate to delivery location", 
      description: "Use the map below", 
      requiresPhoto: false, 
      instructions: `🗺️ Use the map below to navigate to delivery location (same as pickup). Deliver within 24 hours of pickup.`,
      showMap: true,
      destination: selectedOrder?.delivery_address || selectedOrder?.pickup_address
    },
    { 
      title: "Complete delivery", 
      description: "Deliver and document completion", 
      requiresPhoto: true, 
      instructions: `✅ Complete delivery - Ensure customer receives all bags and mark order as complete.`
    }
  ];

  const handleTakePhoto = (stepNumber: number) => {
    setPhotoStep(stepNumber);
    setShowPhotoUpload(true);
  };

  const handlePhotoUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file || !selectedOrder || !photoStep) return;

    console.log(`Uploading photo for step ${photoStep} for order ${selectedOrder.id}`);
    
    setUploading(true);
    try {
      // Create unique filename
      const timestamp = Date.now();
      const fileName = `order_${selectedOrder.id}_step_${photoStep}_${timestamp}.jpg`;

      // Upload to Supabase storage
      const { error: uploadError } = await supabase.storage
        .from('order-photos')
        .upload(fileName, file);

      if (uploadError) throw uploadError;

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from('order-photos')
        .getPublicUrl(fileName);

      // Update order with photo and step progress
      const currentStepPhotos = selectedOrder.step_photos || {};
      const updatedStepPhotos = {
        ...currentStepPhotos,
        [`step_${photoStep}`]: publicUrl
      };

      const isLastStep = photoStep >= 13; // Step 13 is the final step that requires a photo
      const updateData: any = {
        step_photos: updatedStepPhotos,
        current_step: Math.min(isLastStep ? 13 : photoStep + 1, 13)  // Never exceed step 13
      };
      
      // If this is the final step, mark order as completed
      if (isLastStep) {
        updateData.status = 'completed';
        updateData.completed_at = new Date().toISOString();
        console.log('This is the last step (photo upload) - marking order as completed:', updateData);
      }

      const { error: updateError } = await supabase
        .from('orders')
        .update(updateData)
        .eq('id', selectedOrder.id);

      if (updateError) throw updateError;

      console.log('Database update successful');

      // Send notifications for key milestones
      const nextStep = isLastStep ? 13 : photoStep + 1;
      if ([7, 8, 9, 10, 12, 13].includes(nextStep)) {
        try {
          let notificationStatus: string;
          
          if (nextStep === 7) {
            notificationStatus = 'picked_up';
          } else if (nextStep === 8) {
            notificationStatus = 'washing';
          } else if (nextStep === 9) {
            notificationStatus = 'drying';
          } else if (nextStep === 10) {
            notificationStatus = 'folded';
          } else if (nextStep === 12) {
            notificationStatus = 'delivered';
          } else if (nextStep === 13) {
            notificationStatus = 'completed';
          } else {
            notificationStatus = 'in_progress';
          }
          
          await supabase.functions.invoke('send-order-notifications', {
            body: {
              orderId: selectedOrder.id,
              customerId: selectedOrder.customer_id,
              status: notificationStatus,
              orderNumber: selectedOrder.id.slice(-8),
              currentStep: nextStep
            }
          });
        } catch (notificationError) {
          console.error('Failed to send notification:', notificationError);
        }
      }

      // Update local state
      setSelectedOrder({
        ...selectedOrder,
        step_photos: updatedStepPhotos,
        current_step: Math.min(isLastStep ? 13 : photoStep + 1, 13),  // Never exceed step 13
        status: isLastStep ? 'completed' : selectedOrder.status,
        completed_at: isLastStep ? new Date().toISOString() : selectedOrder.completed_at
      });

      toast({
        title: isLastStep ? "Order Completed!" : "Photo Uploaded",
        description: isLastStep 
          ? "Order has been successfully completed and delivered!" 
          : `Step ${photoStep} completed successfully!`
      });

      setShowPhotoUpload(false);
      setPhotoStep(null);
      
      // If order is completed, close the detailed view and refresh
      if (isLastStep) {
        console.log('Order completed - closing view and refreshing data');
        setSelectedOrder(null);
        
        // Force a data refresh
        setTimeout(() => {
          loadDashboardData();
        }, 1000);
      }
      
      loadDashboardData(); // Refresh data
    } catch (error) {
      console.error('Error uploading photo:', error);
      toast({
        title: "Upload Failed",
        description: "Failed to upload photo. Please try again.",
        variant: "destructive"
      });
    } finally {
      setUploading(false);
    }
  };

  const completeStep = async (stepNumber: number) => {
    if (!selectedOrder) return;

    console.log(`Completing step ${stepNumber} for order ${selectedOrder.id}`);
    
    try {
      const isLastStep = stepNumber >= 13; // Step 13 is the final step
      const updateData: any = {
        current_step: Math.min(stepNumber + 1, 13)  // Never exceed step 13
      };
      
      // If this is the final step, mark order as completed
      if (isLastStep) {
        updateData.status = 'completed';
        updateData.completed_at = new Date().toISOString();
        console.log('This is the last step - marking order as completed:', updateData);
      }

      const { error } = await supabase
        .from('orders')
        .update(updateData)
        .eq('id', selectedOrder.id);

      if (error) throw error;

      console.log('Database update successful');

      // Update local state
      setSelectedOrder({
        ...selectedOrder,
        current_step: Math.min(stepNumber + 1, 13),
        status: isLastStep ? 'completed' : selectedOrder.status,
        completed_at: isLastStep ? new Date().toISOString() : selectedOrder.completed_at
      });

      toast({
        title: isLastStep ? "Order Completed!" : "Step Completed",
        description: isLastStep 
          ? "Order has been successfully completed and delivered!" 
          : `Step ${stepNumber} completed successfully!`
      });

      // If order is completed, close the detailed view and refresh
      if (isLastStep) {
        console.log('Order completed - closing view and refreshing data');
        setSelectedOrder(null);
        
        // Force a data refresh
        setTimeout(() => {
          loadDashboardData();
        }, 1000);
      }

      loadDashboardData(); // Refresh data
    } catch (error) {
      console.error('Error completing step:', error);
      toast({
        title: "Error",
        description: "Failed to complete step. Please try again.",
        variant: "destructive"
      });
    }
  };

  const handleOnlineStatusToggle = async (online: boolean) => {
    if (!washerData) return;
    
    try {
      const { error } = await supabase
        .from('washers')
        .update({ is_online: online })
        .eq('id', washerData.id);

      if (error) throw error;

      setWasherData({ ...washerData, is_online: online });
      toast({
        title: online ? "You're now online" : "You're now offline",
        description: online ? "You can now receive new orders" : "New orders will not be assigned to you"
      });
    } catch (error) {
      console.error('Error updating online status:', error);
      toast({
        title: "Error",
        description: "Failed to update online status",
        variant: "destructive"
      });
    }
  };


  // Add the missing claim order function
  const handleClaimOrder = async () => {
    if (!confirmOrder || !washerData) {
      console.error('Missing confirmOrder or washerData:', { confirmOrder, washerData });
      return;
    }

    // Check if operator already has 5 active orders
    const activeOrdersCount = myOrders.filter(order => 
      !['completed', 'delivered'].includes(order.status)
    ).length;

    if (activeOrdersCount >= 5) {
      toast({
        title: "Order Limit Reached",
        description: "You can only have 5 active orders at a time. Please complete some orders first.",
        variant: "destructive",
      });
      setConfirmOrder(null);
      return;
    }

    console.log('Claiming order:', confirmOrder.id, 'for washer:', washerData.id);

    try {
      const { data, error } = await supabase
        .from('orders')
        .update({ 
          washer_id: washerData.id,
          status: 'claimed',
          claimed_at: new Date().toISOString()
        })
        .eq('id', confirmOrder.id)
        .select()
        .single();

      if (error) {
        console.error('Supabase error claiming order:', error);
        throw error;
      }

      console.log('Order claimed successfully:', data);

      // Send notification about order being claimed
      try {
        await supabase.functions.invoke('send-order-notifications', {
          body: {
            orderId: confirmOrder.id,
            customerId: confirmOrder.customer_id,
            status: 'claimed',
            orderNumber: confirmOrder.id.substring(0, 8).toUpperCase()
          }
        });
      } catch (notificationError) {
        console.error('Failed to send notification:', notificationError);
      }

      toast({
        title: "Order Claimed",
        description: `Order claimed successfully! You now have ${activeOrdersCount + 1}/5 active orders.`,
      });

      setConfirmOrder(null);
      loadDashboardData(); // Refresh the data
    } catch (error) {
      console.error('Error claiming order:', error);
      toast({
        title: "Error",
        description: "Failed to claim order. Please try again.",
        variant: "destructive",
      });
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!user || !washerData) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Card className="w-full max-w-md">
          <CardContent className="pt-6">
            <div className="text-center py-8">
              <h3 className="text-lg font-medium mb-2">Access Denied</h3>
              <p className="text-muted-foreground mb-4">You need operator privileges to access this dashboard.</p>
              <Button onClick={signOut} variant="outline">
                Sign Out
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-wave">
      <div className="container mx-auto px-4 py-8">
        <div className="mb-6">
          <Button
            variant="ghost"
            onClick={signOut}
            className="p-0 h-auto text-muted-foreground hover:text-foreground"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Exit Dashboard
          </Button>
        </div>
        
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl font-bold bg-gradient-primary bg-clip-text text-transparent">
              Operator Dashboard
            </h1>
            <p className="text-muted-foreground">
              Welcome back, {operatorProfile?.first_name}! Manage your orders and workflow.
            </p>
          </div>
          <div className="flex items-center gap-4">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowProfileSettings(true)}
              className="flex items-center gap-2"
            >
              <Settings className="h-4 w-4" />
              Settings
            </Button>
            <div className={`flex items-center gap-2 px-3 py-1 rounded-full ${
              washerData.is_online ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-700'
            }`}>
              <div className={`w-2 h-2 rounded-full ${washerData.is_online ? 'bg-green-500' : 'bg-gray-400'}`} />
              {washerData.is_online ? 'Online' : 'Offline'}
            </div>
          </div>
        </div>

        {/* Main Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="live-orders" className="flex items-center gap-2">
              <Package className="h-4 w-4" />
              Live Orders ({availableOrders.length})
            </TabsTrigger>
            <TabsTrigger value="my-orders" className="flex items-center gap-2">
              <Clock className="h-4 w-4" />
              My Orders ({myOrders.filter(order => !['completed', 'delivered'].includes(order.status)).length})
            </TabsTrigger>
            <TabsTrigger value="reviews-tips" className="flex items-center gap-2">
              <Star className="h-4 w-4" />
              Reviews & Tips
            </TabsTrigger>
            <TabsTrigger value="account" className="flex items-center gap-2">
              <Users className="h-4 w-4" />
              Account
            </TabsTrigger>
          </TabsList>

          {/* Live Orders Tab */}
          <TabsContent value="live-orders" className="space-y-4">
            <div className="text-center mb-4">
              <h2 className="text-lg font-semibold">Available Orders</h2>
              <p className="text-sm text-muted-foreground">Claim orders in your service area</p>
            </div>

            {availableOrders.length === 0 ? (
              <Card className="p-8 text-center">
                <Package className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                <h3 className="text-lg font-medium mb-2">No available orders</h3>
                <p className="text-muted-foreground">New orders in your area will appear here automatically.</p>
              </Card>
            ) : (
              <div className="space-y-4">
                {availableOrders.map((order) => (
                  <Card key={order.id} className="hover:shadow-md transition-shadow">
                    <CardContent className="p-4">
                      <div className="flex justify-between items-start mb-3">
                        <div>
                          <h4 className="font-semibold">Order #{order.id.slice(0, 8)}</h4>
                          <p className="text-sm text-muted-foreground">
                            {order.profiles?.first_name} {order.profiles?.last_name}
                          </p>
                          <p className="text-sm text-muted-foreground">
                            {order.service_type.replace('_', ' ')} • {order.bag_count} bags
                          </p>
                        </div>
                        <div className="text-right">
                          <Badge variant={order.is_express ? "destructive" : "secondary"}>
                            {order.is_express ? "Express" : "Standard"}
                          </Badge>
                          <p className="text-lg font-bold text-green-600">
                            ${(order.total_amount_cents / 100).toFixed(2)}
                          </p>
                        </div>
                      </div>
                      
                      <Button 
                        className="w-full" 
                        onClick={() => setConfirmOrder(order)}
                      >
                        <CheckCircle className="h-4 w-4 mr-2" />
                        Claim Order
                      </Button>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>

          {/* My Orders Tab */}
          <TabsContent value="my-orders" className="space-y-4">
            <div className="text-center mb-4">
              <h2 className="text-lg font-semibold">Your Orders</h2>
              <p className="text-sm text-muted-foreground">Track and manage your claimed orders</p>
            </div>

            {myOrders.length === 0 ? (
              <Card className="p-8 text-center">
                <Clock className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                <h3 className="text-lg font-medium mb-2">No orders</h3>
                <p className="text-muted-foreground">Claim orders from the Live Orders tab to see them here!</p>
              </Card>
            ) : (
              <div className="space-y-6">
                {(() => {
                  const activeOrders = myOrders.filter(order => 
                    !['completed', 'delivered'].includes(order.status)
                  );
                  const completedOrders = myOrders.filter(order => 
                    ['completed', 'delivered'].includes(order.status)
                  );

                  return (
                    <>
                      {/* Maps for active orders only */}
                      {activeOrders.length > 0 && (
                        <OrdersOverviewMap
                          orders={activeOrders}
                          currentLocation={operatorLocation}
                        />
                      )}
                      
                      {/* Active Orders Section */}
                      {activeOrders.length > 0 && (
                        <div>
                          <h3 className="text-lg font-semibold mb-3 flex items-center gap-2">
                            <Clock className="h-5 w-5 text-primary" />
                            Active Orders ({activeOrders.length})
                          </h3>
                          <div className="space-y-4">
                            {activeOrders.map((order) => {
                              const { progressText, progressColor, currentStep } = getOrderProgressInfo(order);
                              
                              return (
                                <Card 
                                  key={order.id} 
                                  className="hover:shadow-md transition-shadow"
                                >
                                  <CardContent className="p-4">
                                    <div className="flex justify-between items-start mb-3">
                                      <div>
                                        <h4 className="font-semibold">Order #{order.id.slice(0, 8)}</h4>
                                        <p className="text-sm text-muted-foreground">
                                          {order.profiles?.first_name} {order.profiles?.last_name}
                                        </p>
                                        <p className="text-sm text-muted-foreground">
                                          {order.service_type.replace('_', ' ')} • {order.bag_count} bags
                                        </p>
                                      </div>
                                      <div className="text-right">
                                        <Badge variant={order.is_express ? "destructive" : "secondary"}>
                                          {order.is_express ? "Express" : "Standard"}
                                        </Badge>
                                        <p className="text-xs text-muted-foreground mt-1">
                                          Due: {order.pickup_window_end && new Date(order.pickup_window_end).toLocaleTimeString([], { 
                                            hour: '2-digit', 
                                            minute: '2-digit' 
                                          })}
                                        </p>
                                      </div>
                                    </div>
                                    
                                    {/* Progress Information */}
                                    <div className="border-t pt-3">
                                      <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-2">
                                          <div className="w-2 h-2 rounded-full bg-current animate-pulse" />
                                          <span className={`text-sm font-medium ${progressColor}`}>
                                            {progressText}
                                          </span>
                                        </div>
                                        <span className="text-xs text-muted-foreground">
                                          Step {currentStep}/13
                                        </span>
                                      </div>
                                      
                                      {/* Progress bar */}
                                      <div className="w-full bg-muted rounded-full h-1.5 mt-2">
                                        <div 
                                          className="bg-primary h-1.5 rounded-full transition-all" 
                                          style={{ width: `${(currentStep / 13) * 100}%` }}
                                        />
                                      </div>
                                      
                                      {/* Action buttons */}
                                      <div className="flex gap-2 mt-3">
                                        <Button 
                                          size="sm" 
                                          onClick={() => setSelectedOrder(order)}
                                        >
                                          View Workflow
                                        </Button>
                                        <Button 
                                          variant="outline" 
                                          size="sm"
                                          onClick={() => openLiveOrderMap(order)}
                                        >
                                          <MapPin className="h-4 w-4 mr-1" />
                                          Map
                                        </Button>
                                        <OperatorMessageButton 
                                          order={order}
                                          onClick={() => setSelectedOrderForMessaging(order)}
                                        />
                                      </div>
                                    </div>
                                  </CardContent>
                                </Card>
                              );
                            })}
                          </div>
                        </div>
                      )}

                      {/* Completed Orders Section */}
                      {completedOrders.length > 0 && (
                        <div className="mt-8">
                          <h3 className="text-lg font-semibold mb-3 flex items-center gap-2">
                            <CheckCircle className="h-5 w-5 text-green-600" />
                            Completed Orders ({completedOrders.length})
                          </h3>
                          <div className="space-y-3">
                            {completedOrders.map((order) => (
                              <Card 
                                key={order.id} 
                                className="bg-green-50 border-green-200"
                              >
                                <CardContent className="p-4">
                                  <div className="flex justify-between items-center">
                                    <div>
                                      <h4 className="font-medium">Order #{order.id.slice(0, 8)}</h4>
                                      <p className="text-sm text-muted-foreground">
                                        {order.profiles?.first_name} {order.profiles?.last_name}
                                      </p>
                                      <p className="text-sm text-muted-foreground">
                                        {order.service_type.replace('_', ' ')} • {order.bag_count} bags
                                      </p>
                                    </div>
                                    <div className="text-right">
                                      <Badge variant="outline" className="text-green-600 border-green-600">
                                        {order.status === 'completed' ? 'Completed' : 'Delivered'}
                                      </Badge>
                                      <p className="text-xs text-muted-foreground mt-1">
                                        {order.completed_at && new Date(order.completed_at).toLocaleDateString()}
                                      </p>
                                      <p className="text-sm font-medium text-green-600">
                                        ${(order.total_amount_cents / 100).toFixed(2)}
                                      </p>
                                    </div>
                                  </div>
                                </CardContent>
                              </Card>
                            ))}
                          </div>
                        </div>
                      )}
                    </>
                  );
                })()}
              </div>
            )}
          </TabsContent>

          {/* Reviews & Tips Tab */}
          <TabsContent value="reviews-tips" className="space-y-4">
            <div className="text-center mb-4">
              <h2 className="text-lg font-semibold">Reviews & Tips</h2>
              <p className="text-sm text-muted-foreground">See customer feedback and tips you've received</p>
            </div>
            
            {washerData && (
              <ReviewsAndTips washerId={washerData.id} />
            )}
          </TabsContent>

          <TabsContent value="account" className="space-y-4">
            <div className="space-y-6">
              {/* Profile Information */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <User className="h-5 w-5" />
                    Profile Information
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-sm font-medium text-muted-foreground">Name</p>
                      <p className="font-medium">
                        {operatorProfile ? `${operatorProfile.first_name} ${operatorProfile.last_name}` : 'Not available'}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-muted-foreground">Phone</p>
                      <p className="font-medium">{operatorProfile?.phone || 'Not available'}</p>
                    </div>
                  </div>
                  
                  {/* Status Toggle */}
                  <div className="flex items-center justify-between py-2 border-t">
                    <div>
                      <p className="font-medium">Online Status</p>
                      <p className="text-sm text-muted-foreground">
                        Set yourself as {washerData?.is_online ? 'online' : 'offline'} for new orders
                      </p>
                    </div>
                    <Switch
                      checked={washerData?.is_online || false}
                      onCheckedChange={handleOnlineStatusToggle}
                    />
                  </div>
                </CardContent>
              </Card>

              {/* Service Areas Management */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <MapPin className="h-5 w-5" />
                    My Service Areas
                  </CardTitle>
                  <CardDescription>
                    Manage the zip codes where you provide laundry services
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="flex flex-wrap gap-2">
                      {washerData?.zip_codes.map((zipCode) => (
                        <Badge key={zipCode} variant="secondary">
                          {zipCode}
                        </Badge>
                      ))}
                      {(!washerData?.zip_codes || washerData.zip_codes.length === 0) && (
                        <p className="text-sm text-muted-foreground">No service areas assigned</p>
                      )}
                    </div>
                    
                    <Button 
                      onClick={() => setShowZipCodeEdit(true)}
                      size="sm"
                      className="mt-2"
                    >
                      <Settings className="h-4 w-4 mr-2" />
                      Edit Service Areas
                    </Button>
                  </div>
                </CardContent>
              </Card>
              
              {/* Performance Stats */}
              <Card>
                <CardHeader>
                  <CardTitle>Performance Stats</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="text-center p-4 bg-green-50 rounded-lg">
                      <p className="text-2xl font-bold text-green-600">
                        {myOrders.filter(o => o.status === 'completed').length}
                      </p>
                      <p className="text-sm text-muted-foreground">Orders Completed</p>
                    </div>
                    <div className="text-center p-4 bg-blue-50 rounded-lg">
                      <p className="text-2xl font-bold text-blue-600">
                        {myOrders.filter(o => !['completed', 'delivered'].includes(o.status)).length}
                      </p>
                      <p className="text-sm text-muted-foreground">Active Orders</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        </Tabs>

        {/* Claim Order Confirmation Dialog */}
        <Dialog open={!!confirmOrder} onOpenChange={() => setConfirmOrder(null)}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Claim Order</DialogTitle>
              <DialogDescription>
                Are you sure you want to claim this order? You'll be responsible for completing all steps.
              </DialogDescription>
            </DialogHeader>
            {confirmOrder && (
              <div className="py-4">
                <h4 className="font-semibold mb-2">Order Details:</h4>
                <p><strong>Customer:</strong> {confirmOrder.profiles?.first_name} {confirmOrder.profiles?.last_name}</p>
                <p><strong>Service:</strong> {confirmOrder.service_type.replace('_', ' ')}</p>
                <p><strong>Bags:</strong> {confirmOrder.bag_count}</p>
                <p><strong>Total:</strong> ${(confirmOrder.total_amount_cents / 100).toFixed(2)}</p>
                <p><strong>Type:</strong> {confirmOrder.is_express ? 'Express' : 'Standard'}</p>
              </div>
            )}
            <DialogFooter>
              <Button variant="outline" onClick={() => setConfirmOrder(null)}>
                Cancel
              </Button>
              <Button onClick={handleClaimOrder}>
                Claim Order
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Order Workflow Dialog - 13 Steps */}
        <Dialog open={!!selectedOrder} onOpenChange={() => setSelectedOrder(null)}>
          <DialogContent className="max-w-5xl max-h-[85vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>13-Step Order Workflow</DialogTitle>
              <DialogDescription>
                Complete each step in order and take photos when required
              </DialogDescription>
            </DialogHeader>
            {selectedOrder && (
              <div className="space-y-6">
                {/* Order Details */}
                <div className="bg-muted/50 p-4 rounded-lg">
                  <h4 className="font-semibold mb-3">Order Information</h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-3">
                      <div>
                        <p className="text-sm font-medium text-muted-foreground">Customer</p>
                        <p className="font-medium">{selectedOrder.profiles?.first_name} {selectedOrder.profiles?.last_name}</p>
                      </div>
                      <div>
                        <p className="text-sm font-medium text-muted-foreground">Phone</p>
                        <p className="font-medium">{selectedOrder.profiles?.phone}</p>
                      </div>
                      <div>
                        <p className="text-sm font-medium text-muted-foreground">Service Type</p>
                        <p className="font-medium">{selectedOrder.service_type.replace('_', ' ')}</p>
                      </div>
                      <div>
                        <p className="text-sm font-medium text-muted-foreground">Bags</p>
                        <p className="font-medium">{selectedOrder.bag_count} bag{selectedOrder.bag_count > 1 ? 's' : ''}</p>
                      </div>
                    </div>
                    <div className="space-y-3">
                      <div>
                        <p className="text-sm font-medium text-muted-foreground">Total Amount</p>
                        <p className="font-medium text-green-600">${(selectedOrder.total_amount_cents / 100).toFixed(2)}</p>
                      </div>
                      <div>
                        <p className="text-sm font-medium text-muted-foreground">Service Level</p>
                        <Badge variant={selectedOrder.is_express ? "destructive" : "secondary"}>
                          {selectedOrder.is_express ? "Express" : "Standard"}
                        </Badge>
                      </div>
                      <div>
                        <p className="text-sm font-medium text-muted-foreground">Pickup Window</p>
                        <p className="font-medium">
                          {selectedOrder.pickup_window_start && selectedOrder.pickup_window_end ? 
                            `${new Date(selectedOrder.pickup_window_start).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} - ${new Date(selectedOrder.pickup_window_end).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}` 
                            : 'Not specified'}
                        </p>
                      </div>
                    </div>
                  </div>
                  
                  {/* Quick Actions */}
                  <div className="mt-4 pt-3 border-t">
                    <OperatorMessageButton 
                      order={selectedOrder}
                      onClick={() => {
                        console.log('Message Customer clicked for order:', selectedOrder.id);
                        setSelectedOrderForMessaging(selectedOrder);
                      }}
                    />
                  </div>
                  
                  {/* Addresses */}
                  <div className="mt-4 pt-3 border-t space-y-3">
                    <h5 className="font-medium">Addresses</h5>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {selectedOrder.pickup_address && (
                        <div>
                          <p className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                            <MapPin className="h-3 w-3" />
                            Pickup Address
                          </p>
                          <p className="font-medium">{selectedOrder.pickup_address}</p>
                        </div>
                      )}
                      {selectedOrder.delivery_address && (
                        <div>
                          <p className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                            <MapPin className="h-3 w-3" />
                            Delivery Address
                          </p>
                          <p className="font-medium">{selectedOrder.delivery_address}</p>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Special Instructions */}
                  {selectedOrder.special_instructions && (
                    <div className="mt-4 pt-3 border-t">
                      <p className="text-sm font-medium text-muted-foreground mb-2">Special Instructions</p>
                      <div className="bg-yellow-50 border border-yellow-200 rounded p-3">
                        <p className="text-sm font-medium text-yellow-800">{selectedOrder.special_instructions}</p>
                      </div>
                    </div>
                  )}

                  {/* Wash Preferences */}
                  <div className="mt-4 pt-3 border-t">
                    <h5 className="font-medium mb-3">Wash Preferences</h5>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                      <div>
                        <p className="text-muted-foreground">Soap Type</p>
                        <p className="font-medium">{(selectedOrder as any)?.soap_preference?.name || 'Standard Detergent'}</p>
                      </div>
                      <div>
                        <p className="text-muted-foreground">Wash Temperature</p>
                        <p className="font-medium">{(selectedOrder as any)?.wash_temp_preference?.name || 'Standard'}</p>
                      </div>
                      <div>
                        <p className="text-muted-foreground">Dry Temperature</p>
                        <p className="font-medium">{(selectedOrder as any)?.dry_temp_preference?.name || 'Standard'}</p>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Workflow Steps */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <h4 className="font-semibold">13-Step Workflow Progress</h4>
                    <Badge variant="outline">
                      Step {selectedOrder.current_step || 1} of 13
                    </Badge>
                  </div>
                  
                  {/* Progress Bar */}
                  <div className="w-full bg-muted rounded-full h-2">
                    <div 
                      className="bg-primary h-2 rounded-full transition-all" 
                      style={{ width: `${((selectedOrder.current_step || 1) / 13) * 100}%` }}
                    />
                  </div>

                  {/* Individual Steps */}
                  <div className="grid grid-cols-1 gap-3">
                    {getWorkflowSteps().map((step, index) => {
                      const stepNumber = index + 1;
                      const currentStep = selectedOrder.current_step || 1;
                      const isCompleted = stepNumber < currentStep;
                      const isCurrent = stepNumber === currentStep;
                      const stepPhoto = selectedOrder.step_photos?.[`step_${stepNumber}`];
                      
                      return (
                        <div 
                          key={stepNumber}
                          className={`border rounded-lg p-4 ${
                            isCompleted ? 'bg-green-50 border-green-200' : 
                            isCurrent ? 'bg-blue-50 border-blue-200' : 
                            'bg-muted/30'
                          }`}
                        >
                          <div className="flex items-center justify-between mb-2">
                            <div className="flex items-center gap-3">
                              <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
                                isCompleted ? 'bg-green-500 text-white' :
                                isCurrent ? 'bg-blue-500 text-white' :
                                'bg-muted text-muted-foreground'
                              }`}>
                                {isCompleted ? <Check className="h-4 w-4" /> : stepNumber}
                              </div>
                              <div>
                                <h5 className="font-medium">{step.title}</h5>
                                <p className="text-sm text-muted-foreground">{step.description}</p>
                              </div>
                            </div>
                            <div className="flex items-center gap-2">
                              {step.requiresPhoto && (
                                <>
                                  {stepPhoto ? (
                                    <div className="flex items-center gap-2">
                                      <div className="w-10 h-10 rounded overflow-hidden border">
                                        <img 
                                          src={stepPhoto} 
                                          alt={`Step ${stepNumber} photo`}
                                          className="w-full h-full object-cover"
                                        />
                                      </div>
                                      <CheckCircle className="h-4 w-4 text-green-500" />
                                    </div>
                                  ) : isCurrent ? (
                                    <Button 
                                      size="sm" 
                                      onClick={() => handleTakePhoto(stepNumber)}
                                      disabled={uploading}
                                    >
                                      <Camera className="h-4 w-4 mr-1" />
                                      {uploading ? 'Uploading...' : 'Take Photo'}
                                    </Button>
                                  ) : (
                                    <div className="flex items-center gap-1 text-muted-foreground">
                                      <Camera className="h-4 w-4" />
                                      <span className="text-xs">Photo Required</span>
                                    </div>
                                  )}
                                </>
                              )}
                              {!step.requiresPhoto && isCurrent && (
                                <>
                                  {(step as any).requiresBagCount ? (
                                    <div className="flex items-center gap-2">
                                      <Input
                                        type="number"
                                        placeholder="Bag count"
                                        value={bagCountInput}
                                        onChange={(e) => setBagCountInput(e.target.value)}
                                        className="w-24"
                                        min="1"
                                      />
                                      <Button 
                                        size="sm" 
                                        onClick={() => {
                                          if (bagCountInput && parseInt(bagCountInput) > 0) {
                                            completeStep(stepNumber);
                                            setBagCountInput("");
                                          }
                                        }}
                                        disabled={!bagCountInput || parseInt(bagCountInput) <= 0}
                                      >
                                        Complete Step
                                      </Button>
                                    </div>
                                  ) : (
                                    <Button 
                                      size="sm" 
                                      onClick={() => completeStep(stepNumber)}
                                    >
                                      Complete Step
                                    </Button>
                                  )}
                                </>
                              )}
                              {isCompleted && (
                                <CheckCircle className="h-4 w-4 text-green-500" />
                              )}
                            </div>
                          </div>
                          
                          {step.instructions && isCurrent && (
                            <div className="mt-3 p-3 bg-blue-100 rounded text-sm space-y-3">
                              <div>
                                <p><strong>Instructions:</strong></p>
                                <pre className="whitespace-pre-wrap text-sm mt-1">{step.instructions}</pre>
                              </div>
                              {(step as any).showMap && (
                                <NavigationMap destination={(step as any).destination} />
                              )}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            )}
            <DialogFooter>
              <Button variant="outline" onClick={() => setSelectedOrder(null)}>
                Close
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Photo Upload Dialog */}
        <Dialog open={showPhotoUpload} onOpenChange={setShowPhotoUpload}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Take Step Photo</DialogTitle>
              <DialogDescription>
                Take a photo for step {photoStep}
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                capture="environment"
                className="hidden"
                onChange={handlePhotoUpload}
              />
              <Button 
                onClick={() => fileInputRef.current?.click()}
                disabled={uploading}
                className="w-full"
              >
                <Camera className="h-4 w-4 mr-2" />
                {uploading ? 'Uploading Photo...' : 'Take Photo'}
              </Button>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowPhotoUpload(false)}>
                Cancel
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Live Order Map Modal */}
        {selectedMapOrder && (
          <LiveOrderMap
            isOpen={showLiveMap}
            onClose={() => {
              setShowLiveMap(false);
              setSelectedMapOrder(null);
            }}
            order={selectedMapOrder}
            operatorLocation={operatorLocation}
          />
        )}

        {/* Zip Code Edit Modal */}
        {showZipCodeEdit && washerData && (
          <OperatorZipCodeEditModal
            isOpen={showZipCodeEdit}
            onClose={() => setShowZipCodeEdit(false)}
            operator={{
              id: washerData.id,
              user_id: washerData.user_id,
              zip_codes: washerData.zip_codes,
              profiles: operatorProfile
            }}
            onSuccess={() => {
              loadDashboardData();
              toast({
                title: "Success",
                description: "Service areas updated successfully"
              });
            }}
          />
        )}

        {/* Order Messaging Modal */}
        {selectedOrderForMessaging && (
          <OrderMessaging
            orderId={selectedOrderForMessaging.id}
            operatorId={selectedOrderForMessaging.customer_id}
            operatorName={`${selectedOrderForMessaging.profiles?.first_name || ''} ${selectedOrderForMessaging.profiles?.last_name || ''}`.trim() || 'Customer'}
            isOpen={!!selectedOrderForMessaging}
            onClose={() => setSelectedOrderForMessaging(null)}
          />
        )}

        {/* Profile Settings Modal */}
        <OperatorProfileSettings
          isOpen={showProfileSettings}
          onClose={() => setShowProfileSettings(false)}
          onSave={loadDashboardData}
        />
      </div>
    </div>
  );
}