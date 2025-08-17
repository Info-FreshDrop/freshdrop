import React, { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { IOSScreen, IOSContent, IOSScrollView, IOSSection, IOSList, IOSListItem } from '@/components/ui/ios-layout';
import { IOSHeader } from '@/components/ui/ios-navigation';
import { IOSInput, IOSTextarea, IOSFormSection } from '@/components/ui/ios-form';
import { HapticButton, IOSPrimaryButton } from '@/components/ui/haptic-button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Edit, Plus, ArrowLeft } from 'lucide-react';

interface Service {
  id: string;
  name: string;
  title: string;
  description: string;
  base_price_cents: number;
  duration_hours: number;
  icon_name: string;
  display_order: number;
  price_display: string;
  is_active: boolean;
}

interface ServicesManagementProps {
  onBack: () => void;
}

export function ServicesManagement({ onBack }: ServicesManagementProps) {
  const { user, userRole } = useAuth();
  const { toast } = useToast();
  const [services, setServices] = useState<Service[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingService, setEditingService] = useState<Service | null>(null);
  const [showEditModal, setShowEditModal] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (userRole === 'owner') {
      loadServices();
    }
  }, [userRole]);

  const loadServices = async () => {
    try {
      const { data, error } = await supabase
        .from('services')
        .select('*')
        .order('display_order', { ascending: true });

      if (error) throw error;
      setServices(data || []);
    } catch (error) {
      console.error('Error loading services:', error);
      toast({
        title: "Error",
        description: "Failed to load services",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const handleEditService = (service: Service) => {
    setEditingService(service);
    setShowEditModal(true);
  };

  const handleSaveService = async () => {
    if (!editingService) return;

    try {
      setSaving(true);
      const { error } = await supabase
        .from('services')
        .update({
          title: editingService.title,
          description: editingService.description,
          base_price_cents: editingService.base_price_cents,
          duration_hours: editingService.duration_hours,
          is_active: editingService.is_active
        })
        .eq('id', editingService.id);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Service updated successfully"
      });

      setShowEditModal(false);
      setEditingService(null);
      await loadServices();
    } catch (error) {
      console.error('Error updating service:', error);
      toast({
        title: "Error",
        description: "Failed to update service",
        variant: "destructive"
      });
    } finally {
      setSaving(false);
    }
  };

  if (userRole !== 'owner') {
    return (
      <IOSScreen>
        <IOSHeader 
          title="Access Denied"
          leftButton={{
            text: "Back",
            onClick: onBack
          }}
        />
        <IOSContent>
          <div className="flex items-center justify-center h-64">
            <p className="ios-body text-muted-foreground">Owner access required</p>
          </div>
        </IOSContent>
      </IOSScreen>
    );
  }

  if (loading) {
    return (
      <IOSScreen>
        <IOSHeader 
          title="Services Management"
          leftButton={{
            text: "Back",
            onClick: onBack
          }}
        />
        <IOSContent>
          <div className="flex items-center justify-center h-64">
            <p className="ios-body text-muted-foreground">Loading...</p>
          </div>
        </IOSContent>
      </IOSScreen>
    );
  }

  return (
    <IOSScreen>
      <IOSHeader 
        title="Services Management"
        leftButton={{
          text: "Back",
          onClick: onBack
        }}
      />
      
      <IOSContent>
        <IOSScrollView>
          <IOSSection title="Service Pricing & Details">
            <p className="ios-caption text-muted-foreground mb-4">
              Manage your service offerings, pricing, and descriptions. Changes will be reflected immediately on the homepage.
            </p>
            
            <IOSList>
              {services.map((service) => (
                <IOSListItem
                  key={service.id}
                  interactive
                  onClick={() => handleEditService(service)}
                  leadingIcon={
                    <div className="w-8 h-8 bg-primary/10 rounded-lg flex items-center justify-center">
                      <span className="text-xs">📦</span>
                    </div>
                  }
                  trailingIcon={
                    <div className="flex items-center space-x-2">
                      <Badge variant={service.is_active ? "default" : "secondary"}>
                        {service.is_active ? "Active" : "Inactive"}
                      </Badge>
                      <Edit className="h-4 w-4 text-muted-foreground" />
                    </div>
                  }
                  subtitle={`${service.price_display} • ${service.duration_hours < 24 ? `${service.duration_hours}h` : `${Math.round(service.duration_hours / 24)}d`}`}
                >
                  {service.title}
                </IOSListItem>
              ))}
            </IOSList>
          </IOSSection>
        </IOSScrollView>
      </IOSContent>

      {/* Edit Service Modal */}
      <Dialog open={showEditModal} onOpenChange={setShowEditModal}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Edit Service</DialogTitle>
          </DialogHeader>
          
          {editingService && (
            <div className="space-y-4">
              <IOSFormSection title="Service Details">
                <IOSInput
                  label="Service Title"
                  value={editingService.title}
                  onChange={(e) => setEditingService({
                    ...editingService,
                    title: e.target.value
                  })}
                />
                
                <IOSTextarea
                  label="Description"
                  value={editingService.description}
                  onChange={(e) => setEditingService({
                    ...editingService,
                    description: e.target.value
                  })}
                />
              </IOSFormSection>

              <IOSFormSection title="Pricing & Duration">
                <IOSInput
                  label="Base Price (USD)"
                  type="number"
                  step="0.01"
                  value={editingService.base_price_cents / 100}
                  onChange={(e) => setEditingService({
                    ...editingService,
                    base_price_cents: Math.round(parseFloat(e.target.value) * 100)
                  })}
                />
                
                <IOSInput
                  label="Duration (hours)"
                  type="number"
                  value={editingService.duration_hours}
                  onChange={(e) => setEditingService({
                    ...editingService,
                    duration_hours: parseInt(e.target.value)
                  })}
                />
              </IOSFormSection>

              <div className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  id="is_active"
                  checked={editingService.is_active}
                  onChange={(e) => setEditingService({
                    ...editingService,
                    is_active: e.target.checked
                  })}
                  className="ios-checkbox"
                />
                <label htmlFor="is_active" className="ios-body">
                  Service is active and visible to customers
                </label>
              </div>

              <div className="flex space-x-3 pt-4">
                <HapticButton
                  variant="outline"
                  onClick={() => setShowEditModal(false)}
                  className="flex-1"
                >
                  Cancel
                </HapticButton>
                <IOSPrimaryButton
                  onClick={handleSaveService}
                  disabled={saving}
                  className="flex-1"
                >
                  {saving ? "Saving..." : "Save Changes"}
                </IOSPrimaryButton>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </IOSScreen>
  );
}