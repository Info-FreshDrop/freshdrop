import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { X, Package, MapPin, AlertTriangle, FileText } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

interface LaundryInstructionsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onContinue: () => void;
}

export function LaundryInstructionsModal({ isOpen, onClose, onContinue }: LaundryInstructionsModalProps) {
  const [bagSizes, setBagSizes] = useState<any[]>([]);

  useEffect(() => {
    loadBagSizes();
  }, []);

  const loadBagSizes = async () => {
    try {
      const { data, error } = await supabase
        .from('bag_sizes')
        .select('*')
        .eq('is_active', true)
        .order('display_order', { ascending: true });

      if (error) throw error;
      setBagSizes(data || []);
    } catch (error) {
      console.error('Error loading bag sizes:', error);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader className="bg-gradient-primary text-white p-6 -m-6 mb-6">
          <div className="flex items-center justify-between">
            <DialogTitle className="text-xl font-semibold text-white">
              Important Information
            </DialogTitle>
            <Button
              variant="ghost"
              size="sm"
              onClick={onClose}
              className="text-white hover:bg-white/20"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        </DialogHeader>

        <div className="space-y-6">
          <div>
            <h2 className="text-2xl font-bold mb-4">How To Set Out Your Laundry</h2>
            
            <p className="text-gray-700 mb-6">
              Look, we get it. You appreciate FreshDrop's convenient, high-quality laundry service so much that you want to stuff everything you own into your bags so it comes back washed, folded and returned by your favorite operator. Trust us, we've all been there.
            </p>

            <p className="text-gray-700 mb-6">
              The way we see it, if you would put it in your washer or dryer, it's likely that it can go in your FreshDrop bag—with a few exceptions depending on your personal laundering style. Want to get your first order just right? We got you! Check out the following guidelines before you place your order and you'll be living in laundry-free luxury in no time!
            </p>
            
            <div className="space-y-4">
              <div className="flex items-start gap-3">
                <Package className="h-5 w-5 text-primary mt-1 flex-shrink-0" />
                <div className="text-gray-700">
                  <p className="mb-2">
                    All laundry will need to be placed in one of our available bag sizes:
                  </p>
                  <ul className="list-disc list-inside ml-4 space-y-1">
                    {bagSizes.map((bagSize) => (
                      <li key={bagSize.id}>
                        <strong>{bagSize.name}{bagSize.capacity_gallons && ` (${bagSize.capacity_gallons}-gallon)`}: ${(bagSize.price_cents / 100).toFixed(2)}</strong>
                        {bagSize.description && ` - ${bagSize.description}`}
                      </li>
                    ))}
                  </ul>
                  <p className="mt-2">
                    If you have multiple bags, please make sure to select the appropriate 
                    bag sizes and quantities when placing your order.
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <MapPin className="h-5 w-5 text-primary mt-1 flex-shrink-0" />
                <p className="text-gray-700">
                  Please place your laundry bags out prior to your scheduled pickup time, 
                  in a covered area that is accessible to your operator.
                </p>
              </div>

              <div className="flex items-start gap-3">
                <MapPin className="h-5 w-5 text-primary mt-1 flex-shrink-0" />
                <p className="text-gray-700">
                  Once complete, laundry will be left and returned where it was picked up.
                </p>
              </div>

              <div className="flex items-start gap-3">
                <AlertTriangle className="h-5 w-5 text-amber-500 mt-1 flex-shrink-0" />
                <p className="text-gray-700">
                  All 13 gallon bags or Fresh Drop bags have a weight limit of 17 pounds. Otherwise it 
                  will be charged as two bags.
                </p>
              </div>

              <div className="flex items-start gap-3">
                <Package className="h-5 w-5 text-primary mt-1 flex-shrink-0" />
                <p className="text-gray-700">
                  <strong>Important:</strong> One bag is processed as one single load, regardless of the contents. 
                  If you need to separate your laundry into different loads (e.g., whites and darks, or items 
                  requiring different washing instructions), you would need to use multiple bags and place an 
                  order for the correct amount of bags.
                </p>
              </div>
            </div>
          </div>

          <div className="border-t pt-6">
            <h3 className="text-lg font-semibold mb-4">Overstuffed Bags</h3>
            <p className="text-gray-700 mb-4">
              We believe in quality over quantity. Though it may feel like you're getting more bang for your buck stuffing your bag, it isn't doing you or your operator any favors. An overstuffed bag equals an overstuffed washing machine, which means your clothes won't be washed properly.
            </p>
            <p className="text-gray-700">
              If an operator determines your bag is overstuffed, they reserve the right to refuse pickup. Your order will be canceled and your account charged a $2.99 service fee. Give your clothes some breathing room!
            </p>
          </div>

          <div className="border-t pt-6">
            <h3 className="text-lg font-semibold mb-4">Items We Cannot Accept</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-sm text-gray-700">
              <ul className="space-y-1">
                <li>• Pillows & Comforters</li>
                <li>• Curtains & Area rugs</li>
                <li>• Sleeping bags</li>
                <li>• Dog beds</li>
                <li>• Wedding dresses</li>
                <li>• Costumes</li>
              </ul>
              <ul className="space-y-1">
                <li>• Hats & Headwear</li>
                <li>• Shoes</li>
                <li>• Commercial linens</li>
                <li>• Specialty care items</li>
                <li>• Restaurant linens</li>
                <li>• Sofa covers</li>
              </ul>
            </div>
          </div>

          <div className="border-t pt-6">
            <h3 className="text-lg font-semibold mb-4">Contaminated Items</h3>
            <p className="text-gray-700 mb-3">
              We cannot accept items contaminated with:
            </p>
            <div className="text-sm text-gray-700 space-y-1">
              <p>• Bodily fluids (blood, urine, etc.) • Excessive pet hair • Smoke odors</p>
              <p>• Moisture from wet items • Bedbugs or lice • Poison ivy/oak oils</p>
              <p>• Cooking or motor grease • Chemical residue • Excessively soiled items</p>
            </div>
          </div>

          <div className="border-t pt-6">
            <div className="flex items-start gap-3">
              <FileText className="h-5 w-5 text-primary mt-1 flex-shrink-0" />
              <p className="text-gray-700">
                Add any special instructions, if needed, to your order, under the 
                "Notes / Special Instructions" field. If you'd like items returned on hangers, 
                please note this and provide your own hangers.
              </p>
            </div>
          </div>

          <div className="bg-blue-50 p-4 rounded-lg border-t">
            <p className="text-gray-700 text-center italic">
              Once you get the hang of how it works, you'll be less worried about what can and can't go in your bag and more worried about what to do with all this free time you just gave yourself!
            </p>
          </div>

          <div className="flex gap-3 pt-6 border-t">
            <Button
              variant="outline"
              onClick={onClose}
              className="flex-1"
            >
              Cancel
            </Button>
            <Button
              onClick={onContinue}
              className="flex-1"
            >
              I Understand, Continue
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}