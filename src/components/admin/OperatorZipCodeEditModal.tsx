import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { X } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface OperatorZipCodeEditModalProps {
  isOpen: boolean;
  onClose: () => void;
  operator: {
    id: string;
    user_id: string;
    zip_codes: string[];
    profiles?: {
      first_name: string;
      last_name: string;
    } | null;
  };
  onSuccess: () => void;
}

interface ServiceArea {
  id: string;
  zip_code: string;
}

export const OperatorZipCodeEditModal: React.FC<OperatorZipCodeEditModalProps> = ({
  isOpen,
  onClose,
  operator,
  onSuccess
}) => {
  const [availableZipCodes, setAvailableZipCodes] = useState<ServiceArea[]>([]);
  const [selectedZipCodes, setSelectedZipCodes] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    if (isOpen) {
      loadServiceAreas();
      setSelectedZipCodes([...operator.zip_codes]);
    }
  }, [isOpen, operator.zip_codes]);

  const loadServiceAreas = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('service_areas')
        .select('id, zip_code')
        .eq('is_active', true)
        .order('zip_code');

      if (error) throw error;
      setAvailableZipCodes(data || []);
    } catch (error) {
      console.error('Error loading service areas:', error);
      toast({
        title: "Error",
        description: "Failed to load available service areas",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const handleZipCodeChange = (zipCode: string, checked: boolean) => {
    setSelectedZipCodes(prev => 
      checked 
        ? [...prev, zipCode]
        : prev.filter(zc => zc !== zipCode)
    );
  };

  const removeZipCode = (zipCode: string) => {
    setSelectedZipCodes(prev => prev.filter(zc => zc !== zipCode));
  };

  const handleSave = async () => {
    if (selectedZipCodes.length === 0) {
      toast({
        title: "Error",
        description: "Please select at least one zip code",
        variant: "destructive"
      });
      return;
    }

    setSaving(true);
    try {
      const { error } = await supabase
        .from('washers')
        .update({ zip_codes: selectedZipCodes })
        .eq('id', operator.id);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Operator zip codes updated successfully"
      });

      onSuccess();
      onClose();
    } catch (error) {
      console.error('Error updating zip codes:', error);
      toast({
        title: "Error",
        description: "Failed to update zip codes",
        variant: "destructive"
      });
    } finally {
      setSaving(false);
    }
  };

  const operatorName = operator.profiles 
    ? `${operator.profiles.first_name} ${operator.profiles.last_name}`
    : 'Unknown Operator';

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Edit Service Areas</DialogTitle>
          <DialogDescription>
            Manage zip codes for {operatorName}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Current Selected Zip Codes */}
          <div>
            <h4 className="text-sm font-medium mb-2">Selected Zip Codes ({selectedZipCodes.length})</h4>
            <div className="flex flex-wrap gap-2 min-h-[40px] p-2 border rounded-md">
              {selectedZipCodes.map(zipCode => (
                <Badge key={zipCode} variant="default" className="flex items-center gap-1">
                  {zipCode}
                  <button
                    onClick={() => removeZipCode(zipCode)}
                    className="hover:bg-destructive rounded-full p-0.5"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </Badge>
              ))}
              {selectedZipCodes.length === 0 && (
                <span className="text-muted-foreground text-sm">No zip codes selected</span>
              )}
            </div>
          </div>

          {/* Available Zip Codes */}
          <div>
            <h4 className="text-sm font-medium mb-2">Available Service Areas</h4>
            {loading ? (
              <div className="text-center text-muted-foreground py-4">Loading...</div>
            ) : (
              <div className="max-h-48 overflow-y-auto border rounded-md p-2 space-y-2">
                {availableZipCodes.map(area => (
                  <div key={area.id} className="flex items-center space-x-2">
                    <Checkbox
                      id={`zip-${area.zip_code}`}
                      checked={selectedZipCodes.includes(area.zip_code)}
                      onCheckedChange={(checked) => 
                        handleZipCodeChange(area.zip_code, checked as boolean)
                      }
                    />
                    <label 
                      htmlFor={`zip-${area.zip_code}`}
                      className="text-sm cursor-pointer flex-1"
                    >
                      {area.zip_code}
                    </label>
                  </div>
                ))}
                {availableZipCodes.length === 0 && (
                  <div className="text-center text-muted-foreground py-4">
                    No service areas available
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={saving}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={saving || selectedZipCodes.length === 0}>
            {saving ? 'Saving...' : 'Save Changes'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};