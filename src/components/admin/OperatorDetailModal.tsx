import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { 
  User, 
  Mail, 
  Phone, 
  MapPin, 
  Building2, 
  FileText, 
  CreditCard, 
  Calendar,
  DollarSign,
  CheckCircle,
  X,
  Clock,
  Star
} from "lucide-react";

interface OperatorDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  operator: any;
  stats: any;
}

export const OperatorDetailModal = ({ isOpen, onClose, operator, stats }: OperatorDetailModalProps) => {
  const formatCurrency = (cents: number) => {
    return `$${(cents / 100).toFixed(2)}`;
  };

  const formatDate = (dateString: string) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleDateString();
  };

  const formatAddress = (address: any) => {
    if (!address || typeof address !== 'object') return 'N/A';
    return `${address.street}, ${address.city}, ${address.state} ${address.zip_code}`;
  };

  const formatBankAccount = (bankInfo: any) => {
    if (!bankInfo || typeof bankInfo !== 'object') return 'Not provided';
    return `${bankInfo.account_type?.toUpperCase()} ending in ${bankInfo.account_number?.slice(-4)}`;
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <User className="h-5 w-5" />
            {operator.profiles?.first_name} {operator.profiles?.last_name}
          </DialogTitle>
          <DialogDescription>
            Complete operator information and contractor details
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Performance Overview */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Performance Overview</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                <div className="bg-muted/50 rounded-lg p-4">
                  <div className="flex items-center gap-2 mb-1">
                    <FileText className="w-4 h-4 text-blue-600" />
                    <span className="text-xs font-medium">Orders</span>
                  </div>
                  <div className="text-xl font-bold">
                    {stats?.completed_orders || 0}
                  </div>
                </div>
                <div className="bg-muted/50 rounded-lg p-4">
                  <div className="flex items-center gap-2 mb-1">
                    <DollarSign className="w-4 h-4 text-green-600" />
                    <span className="text-xs font-medium">Total Earned</span>
                  </div>
                  <div className="text-xl font-bold">
                    ${((stats?.total_earnings || 0) / 100).toFixed(0)}
                  </div>
                </div>
                <div className="bg-muted/50 rounded-lg p-4">
                  <div className="flex items-center gap-2 mb-1">
                    <Clock className="w-4 h-4 text-orange-600" />
                    <span className="text-xs font-medium">Pending</span>
                  </div>
                  <div className="text-xl font-bold">
                    ${((stats?.pending_payout || 0) / 100).toFixed(0)}
                  </div>
                </div>
                <div className="bg-muted/50 rounded-lg p-4">
                  <div className="flex items-center gap-2 mb-1">
                    <CheckCircle className="w-4 h-4 text-green-700" />
                    <span className="text-xs font-medium">Paid Out</span>
                  </div>
                  <div className="text-xl font-bold">
                    ${((stats?.paid_payout || 0) / 100).toFixed(0)}
                  </div>
                </div>
                <div className="bg-muted/50 rounded-lg p-4">
                  <div className="flex items-center gap-2 mb-1">
                    <Star className="w-4 h-4 text-yellow-600" />
                    <span className="text-xs font-medium">Rating</span>
                  </div>
                  <div className="text-xl font-bold">
                    {stats?.average_rating || 0}/5
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Personal Information */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <User className="w-4 h-4" />
                  Personal Information
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 gap-3">
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">Name</label>
                    <p className="text-sm">{operator.profiles?.first_name} {operator.profiles?.last_name}</p>
                  </div>
                  
                  {operator.profiles?.email && (
                    <div>
                      <label className="text-sm font-medium text-muted-foreground">Email</label>
                      <div className="flex items-center gap-2">
                        <Mail className="w-3 h-3 text-muted-foreground" />
                        <p className="text-sm">{operator.profiles.email}</p>
                      </div>
                    </div>
                  )}
                  
                  {operator.profiles?.phone && (
                    <div>
                      <label className="text-sm font-medium text-muted-foreground">Phone</label>
                      <div className="flex items-center gap-2">
                        <Phone className="w-3 h-3 text-muted-foreground" />
                        <p className="text-sm">{operator.profiles.phone}</p>
                      </div>
                    </div>
                  )}

                  <div>
                    <label className="text-sm font-medium text-muted-foreground">Member Since</label>
                    <div className="flex items-center gap-2">
                      <Calendar className="w-3 h-3 text-muted-foreground" />
                      <p className="text-sm">{formatDate(operator.created_at)}</p>
                    </div>
                  </div>

                  <div>
                    <label className="text-sm font-medium text-muted-foreground">Status</label>
                    <div className="flex items-center gap-2">
                      <Badge 
                        variant={operator.approval_status === 'approved' ? 'default' : 'secondary'}
                        className="text-xs"
                      >
                        {operator.approval_status}
                      </Badge>
                      {operator.is_active && (
                        <Badge variant="outline" className="text-xs">
                          Active
                        </Badge>
                      )}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Service Information */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <MapPin className="w-4 h-4" />
                  Service Information
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Service Areas</label>
                  <div className="flex flex-wrap gap-1 mt-1">
                    {operator.zip_codes?.map((zip: string) => (
                      <Badge key={zip} variant="outline" className="text-xs">
                        {zip}
                      </Badge>
                    ))}
                  </div>
                </div>
                
                {operator.service_radius_miles && (
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">Service Radius</label>
                    <p className="text-sm">{operator.service_radius_miles} miles</p>
                  </div>
                )}

                <div>
                  <label className="text-sm font-medium text-muted-foreground">Banking Status</label>
                  <div className="flex items-center gap-2">
                    {operator.ach_verified ? (
                      <CheckCircle className="w-3 h-3 text-green-600" />
                    ) : (
                      <X className="w-3 h-3 text-red-600" />
                    )}
                    <span className="text-sm">
                      {operator.ach_verified ? 'Verified' : 'Pending Verification'}
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Tax & Business Information */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Building2 className="w-4 h-4" />
                Tax & Business Information
              </CardTitle>
              <CardDescription>
                1099 Contractor Details
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">Business Name</label>
                    <p className="text-sm">{operator.profiles?.business_name || 'Individual Contractor'}</p>
                  </div>
                  
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">Tax ID</label>
                    <p className="text-sm font-mono">
                      {operator.profiles?.tax_id ? 
                        `***-**-${operator.profiles.tax_id.slice(-4)}` : 
                        'Not provided'
                      }
                    </p>
                  </div>
                  
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">Tax Address</label>
                    <p className="text-sm">{formatAddress(operator.profiles?.tax_address)}</p>
                  </div>
                  
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">Contractor Status</label>
                    <div className="flex items-center gap-2">
                      {operator.profiles?.is_contractor ? (
                        <CheckCircle className="w-3 h-3 text-green-600" />
                      ) : (
                        <X className="w-3 h-3 text-red-600" />
                      )}
                      <span className="text-sm">
                        {operator.profiles?.is_contractor ? '1099 Contractor' : 'Not Setup'}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="space-y-4">
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">W-9 Status</label>
                    <div className="flex items-center gap-2">
                      {operator.profiles?.w9_completed ? (
                        <CheckCircle className="w-3 h-3 text-green-600" />
                      ) : (
                        <X className="w-3 h-3 text-red-600" />
                      )}
                      <span className="text-sm">
                        {operator.profiles?.w9_completed ? 'Completed' : 'Pending'}
                      </span>
                    </div>
                  </div>
                  
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">Banking Information</label>
                    <p className="text-sm">{formatBankAccount(operator.bank_account_info)}</p>
                  </div>
                  
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">Contractor Since</label>
                    <p className="text-sm">{formatDate(operator.profiles?.contractor_start_date)}</p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Availability Schedule */}
          {operator.availability_schedule && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Calendar className="w-4 h-4" />
                  Availability Schedule
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {Object.entries(operator.availability_schedule || {}).map(([day, schedule]: [string, any]) => (
                    <div key={day} className="space-y-2">
                      <label className="text-sm font-medium capitalize">{day}</label>
                      {schedule?.enabled ? (
                        <div className="text-sm">
                          <div>Start: {schedule.start_time || 'Not set'}</div>
                          <div>End: {schedule.end_time || 'Not set'}</div>
                        </div>
                      ) : (
                        <p className="text-sm text-muted-foreground">Unavailable</p>
                      )}
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};