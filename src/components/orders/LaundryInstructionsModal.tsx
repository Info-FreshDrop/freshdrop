import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { X, Package, MapPin, Shield, AlertTriangle, Clock, DollarSign, FileText } from "lucide-react";

interface LaundryInstructionsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onContinue: () => void;
}

export function LaundryInstructionsModal({ isOpen, onClose, onContinue }: LaundryInstructionsModalProps) {
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
            
            <div className="space-y-4">
              <div className="flex items-start gap-3">
                <Package className="h-5 w-5 text-primary mt-1 flex-shrink-0" />
                <p className="text-gray-700">
                  All laundry will need to be placed in a standard 13 gallon kitchen bag. 
                  If you have more than one bag, please make sure to select the appropriate 
                  amount of bags for pickup when you place your order.
                </p>
              </div>

              <div className="flex items-start gap-3">
                <MapPin className="h-5 w-5 text-primary mt-1 flex-shrink-0" />
                <p className="text-gray-700">
                  Please place your laundry bags out prior to your scheduled pickup time, 
                  in a covered area that is accessible to your laundry whip.
                </p>
              </div>

              <div className="flex items-start gap-3">
                <Shield className="h-5 w-5 text-primary mt-1 flex-shrink-0" />
                <p className="text-gray-700">
                  Dry clean laundry will be returned on hangers, and covered with plastic.
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
                  All 13 gallon bags have a weight limit of 17 pounds. Otherwise it 
                  will be charged as two bags.
                </p>
              </div>
            </div>
          </div>

          <div className="border-t pt-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <Clock className="h-4 w-4 text-primary" />
                  <span className="font-semibold">Hours:</span>
                </div>
                <p className="text-sm text-gray-600 ml-6">
                  MON-FRI: 9:00am - 11:00pm<br />
                  SAT-SUN: 10:00am - 10:00pm
                </p>
              </div>

              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <DollarSign className="h-4 w-4 text-primary" />
                  <span className="font-semibold">Payment:</span>
                </div>
                <p className="text-sm text-gray-600 ml-6">
                  Do not give cash to any laundry whips. All gratuities need to be 
                  made via the app or website only.
                </p>
              </div>
            </div>
          </div>

          <div className="border-t pt-6">
            <div className="flex items-start gap-3">
              <FileText className="h-5 w-5 text-primary mt-1 flex-shrink-0" />
              <p className="text-gray-700">
                Add any special instructions, if needed, to your order, under the 
                "Notes / Special Instructions" field.
              </p>
            </div>
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