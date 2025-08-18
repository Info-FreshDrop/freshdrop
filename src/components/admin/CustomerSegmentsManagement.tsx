import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ArrowLeft, Users, Plus, Target, TrendingUp, BarChart3 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface CustomerSegmentsProps {
  onBack: () => void;
  initialView?: 'segments' | 'create' | 'analytics';
}

interface CustomerSegment {
  id: string;
  name: string;
  description: string | null;
  segment_type: string;
  conditions: any;
  customer_count: number;
  is_active: boolean;
  last_updated: string;
  created_at: string;
}

export function CustomerSegmentsManagement({ onBack, initialView = 'segments' }: CustomerSegmentsProps) {
  const [currentView, setCurrentView] = useState<'segments' | 'create' | 'analytics'>(initialView);
  const [segments, setSegments] = useState<CustomerSegment[]>([]);
  const [loading, setLoading] = useState(true);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    segment_type: 'behavioral',
    conditions: {
      orderCount: { min: 1, max: null },
      totalSpent: { min: 0, max: null },
      lastOrderDays: { min: 0, max: 30 }
    }
  });
  const { toast } = useToast();

  useEffect(() => {
    loadSegments();
  }, []);

  const loadSegments = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('customer_segments')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setSegments(data || []);
    } catch (error) {
      console.error('Error loading segments:', error);
      toast({
        title: "Error",
        description: "Failed to load customer segments",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (field: string, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleConditionChange = (field: string, subField: string, value: any) => {
    setFormData(prev => ({
      ...prev,
      conditions: {
        ...prev.conditions,
        [field]: {
          ...prev.conditions[field],
          [subField]: value === '' ? null : Number(value)
        }
      }
    }));
  };

  const calculateSegmentSize = async (conditions: any) => {
    // This would calculate the actual segment size based on conditions
    // For now, returning a mock count
    return Math.floor(Math.random() * 500) + 50;
  };

  const handleCreateSegment = async () => {
    if (!formData.name.trim()) {
      toast({
        title: "Error",
        description: "Segment name is required",
        variant: "destructive"
      });
      return;
    }

    try {
      const customerCount = await calculateSegmentSize(formData.conditions);
      
      const { error } = await supabase
        .from('customer_segments')
        .insert([{
          name: formData.name,
          description: formData.description || null,
          segment_type: formData.segment_type,
          conditions: formData.conditions,
          customer_count: customerCount,
          is_active: true
        }]);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Customer segment created successfully"
      });

      setFormData({
        name: '',
        description: '',
        segment_type: 'behavioral',
        conditions: {
          orderCount: { min: 1, max: null },
          totalSpent: { min: 0, max: null },
          lastOrderDays: { min: 0, max: 30 }
        }
      });

      setCurrentView('segments');
      loadSegments();
    } catch (error) {
      console.error('Error creating segment:', error);
      toast({
        title: "Error",
        description: "Failed to create customer segment",
        variant: "destructive"
      });
    }
  };

  const handleDeleteSegment = async (id: string) => {
    if (!confirm('Are you sure you want to delete this segment?')) return;

    try {
      const { error } = await supabase
        .from('customer_segments')
        .delete()
        .eq('id', id);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Segment deleted successfully"
      });

      loadSegments();
    } catch (error) {
      console.error('Error deleting segment:', error);
      toast({
        title: "Error",
        description: "Failed to delete segment",
        variant: "destructive"
      });
    }
  };

  const getSegmentTypeColor = (type: string) => {
    switch (type) {
      case 'behavioral': return 'default';
      case 'demographic': return 'secondary';
      case 'geographic': return 'outline';
      default: return 'outline';
    }
  };

  // Create Segment View
  if (currentView === 'create') {
    return (
      <div className="min-h-screen bg-gradient-wave">
        <div className="container mx-auto px-4 py-8">
          <div className="flex flex-col gap-4 mb-8">
            <div>
              <Button
                variant="ghost"
                onClick={() => setCurrentView('segments')}
                className="p-0 h-auto text-muted-foreground hover:text-foreground mb-4"
              >
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back to Segments
              </Button>
              <h1 className="text-3xl font-bold bg-gradient-primary bg-clip-text text-transparent">
                Create Customer Segment
              </h1>
              <p className="text-muted-foreground">
                Define a new customer segment for targeted marketing
              </p>
            </div>
          </div>

          <Card className="border-0 shadow-soft">
            <CardHeader>
              <CardTitle>Segment Details</CardTitle>
              <CardDescription>Configure your customer segment criteria</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="name">Segment Name</Label>
                  <Input
                    id="name"
                    value={formData.name}
                    onChange={(e) => handleInputChange('name', e.target.value)}
                    placeholder="e.g., High Value Customers"
                  />
                </div>
                <div>
                  <Label htmlFor="type">Segment Type</Label>
                  <Select value={formData.segment_type} onValueChange={(value) => handleInputChange('segment_type', value)}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="behavioral">Behavioral</SelectItem>
                      <SelectItem value="demographic">Demographic</SelectItem>
                      <SelectItem value="geographic">Geographic</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div>
                <Label htmlFor="description">Description (Optional)</Label>
                <Textarea
                  id="description"
                  value={formData.description}
                  onChange={(e) => handleInputChange('description', e.target.value)}
                  placeholder="Describe this customer segment..."
                  rows={2}
                />
              </div>

              <div className="space-y-4">
                <h3 className="text-lg font-semibold">Segment Conditions</h3>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label>Order Count</Label>
                    <div className="flex gap-2 items-center">
                      <Input
                        type="number"
                        placeholder="Min"
                        value={formData.conditions.orderCount.min || ''}
                        onChange={(e) => handleConditionChange('orderCount', 'min', e.target.value)}
                      />
                      <span className="text-muted-foreground">to</span>
                      <Input
                        type="number"
                        placeholder="Max"
                        value={formData.conditions.orderCount.max || ''}
                        onChange={(e) => handleConditionChange('orderCount', 'max', e.target.value)}
                      />
                    </div>
                  </div>

                  <div>
                    <Label>Total Spent ($)</Label>
                    <div className="flex gap-2 items-center">
                      <Input
                        type="number"
                        placeholder="Min"
                        value={formData.conditions.totalSpent.min || ''}
                        onChange={(e) => handleConditionChange('totalSpent', 'min', e.target.value)}
                      />
                      <span className="text-muted-foreground">to</span>
                      <Input
                        type="number"
                        placeholder="Max"
                        value={formData.conditions.totalSpent.max || ''}
                        onChange={(e) => handleConditionChange('totalSpent', 'max', e.target.value)}
                      />
                    </div>
                  </div>
                </div>

                <div>
                  <Label>Last Order (Days Ago)</Label>
                  <div className="flex gap-2 items-center max-w-md">
                    <Input
                      type="number"
                      placeholder="Min"
                      value={formData.conditions.lastOrderDays.min || ''}
                      onChange={(e) => handleConditionChange('lastOrderDays', 'min', e.target.value)}
                    />
                    <span className="text-muted-foreground">to</span>
                    <Input
                      type="number"
                      placeholder="Max"
                      value={formData.conditions.lastOrderDays.max || ''}
                      onChange={(e) => handleConditionChange('lastOrderDays', 'max', e.target.value)}
                    />
                  </div>
                </div>
              </div>

              <div className="flex gap-2">
                <Button onClick={handleCreateSegment}>Create Segment</Button>
                <Button variant="outline" onClick={() => setCurrentView('segments')}>Cancel</Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  // Analytics View
  if (currentView === 'analytics') {
    return (
      <div className="min-h-screen bg-gradient-wave">
        <div className="container mx-auto px-4 py-8">
          <div className="flex flex-col gap-4 mb-8">
            <div>
              <Button
                variant="ghost"
                onClick={() => setCurrentView('segments')}
                className="p-0 h-auto text-muted-foreground hover:text-foreground mb-4"
              >
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back to Segments
              </Button>
              <h1 className="text-3xl font-bold bg-gradient-primary bg-clip-text text-transparent">
                Segment Analytics
              </h1>
              <p className="text-muted-foreground">
                Analyze customer segment performance
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
            <Card className="border-0 shadow-soft">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">Total Segments</p>
                    <p className="text-2xl font-bold">{segments.length}</p>
                  </div>
                  <Target className="h-8 w-8 text-primary" />
                </div>
              </CardContent>
            </Card>

            <Card className="border-0 shadow-soft">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">Active Segments</p>
                    <p className="text-2xl font-bold">{segments.filter(s => s.is_active).length}</p>
                  </div>
                  <Users className="h-8 w-8 text-accent" />
                </div>
              </CardContent>
            </Card>

            <Card className="border-0 shadow-soft">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">Total Customers</p>
                    <p className="text-2xl font-bold">
                      {segments.reduce((sum, segment) => sum + segment.customer_count, 0).toLocaleString()}
                    </p>
                  </div>
                  <TrendingUp className="h-8 w-8 text-secondary" />
                </div>
              </CardContent>
            </Card>
          </div>

          <Card className="border-0 shadow-soft">
            <CardHeader>
              <CardTitle>Segment Performance</CardTitle>
              <CardDescription>Performance metrics by customer segment</CardDescription>
            </CardHeader>
            <CardContent>
              {segments.length === 0 ? (
                <p className="text-center text-muted-foreground py-8">No segments to analyze</p>
              ) : (
                <div className="space-y-4">
                  {segments.map((segment) => (
                    <div key={segment.id} className="flex items-center justify-between p-4 border rounded-lg">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <h4 className="font-medium">{segment.name}</h4>
                          <Badge variant={getSegmentTypeColor(segment.segment_type)}>
                            {segment.segment_type}
                          </Badge>
                          <Badge variant={segment.is_active ? 'default' : 'secondary'}>
                            {segment.is_active ? 'Active' : 'Inactive'}
                          </Badge>
                        </div>
                        {segment.description && (
                          <p className="text-sm text-muted-foreground mb-2">{segment.description}</p>
                        )}
                        <p className="text-xs text-muted-foreground">
                          Last updated: {new Date(segment.last_updated).toLocaleDateString()}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="text-lg font-bold">{segment.customer_count.toLocaleString()}</p>
                        <p className="text-xs text-muted-foreground">customers</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  // Main Segments View
  return (
    <div className="min-h-screen bg-gradient-wave">
      <div className="container mx-auto px-4 py-8">
        <div className="flex flex-col gap-4 mb-8">
          <div>
            <Button
              variant="ghost"
              onClick={onBack}
              className="p-0 h-auto text-muted-foreground hover:text-foreground mb-4"
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Marketing Dashboard
            </Button>
            <h1 className="text-3xl font-bold bg-gradient-primary bg-clip-text text-transparent">
              Customer Segments
            </h1>
            <p className="text-muted-foreground">
              Manage and target specific customer groups
            </p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => setCurrentView('analytics')}>
              <BarChart3 className="h-4 w-4 mr-2" />
              Analytics
            </Button>
            <Button onClick={() => setCurrentView('create')}>
              <Plus className="h-4 w-4 mr-2" />
              Create Segment
            </Button>
          </div>
        </div>

        <Card className="border-0 shadow-soft">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              Customer Segments ({segments.length})
            </CardTitle>
            <CardDescription>Manage your customer targeting groups</CardDescription>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="text-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
                <p className="text-sm text-muted-foreground mt-2">Loading segments...</p>
              </div>
            ) : segments.length === 0 ? (
              <div className="text-center py-8">
                <Users className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                <h3 className="text-lg font-medium mb-2">No customer segments</h3>
                <p className="text-muted-foreground mb-4">Create your first customer segment for targeted marketing</p>
                <Button onClick={() => setCurrentView('create')}>
                  <Plus className="h-4 w-4 mr-2" />
                  Create Segment
                </Button>
              </div>
            ) : (
              <div className="space-y-4">
                {segments.map((segment) => (
                  <div key={segment.id} className="flex items-center justify-between p-4 border rounded-lg">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <h4 className="font-medium">{segment.name}</h4>
                        <Badge variant={getSegmentTypeColor(segment.segment_type)}>
                          {segment.segment_type}
                        </Badge>
                        <Badge variant={segment.is_active ? 'default' : 'secondary'}>
                          {segment.is_active ? 'Active' : 'Inactive'}
                        </Badge>
                      </div>
                      {segment.description && (
                        <p className="text-sm text-muted-foreground mb-2">{segment.description}</p>
                      )}
                      <div className="flex gap-4 text-xs text-muted-foreground">
                        <span>Created: {new Date(segment.created_at).toLocaleDateString()}</span>
                        <span>Updated: {new Date(segment.last_updated).toLocaleDateString()}</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-4">
                      <div className="text-right">
                        <p className="text-lg font-bold">{segment.customer_count.toLocaleString()}</p>
                        <p className="text-xs text-muted-foreground">customers</p>
                      </div>
                      <Button
                        size="sm"
                        variant="destructive"
                        onClick={() => handleDeleteSegment(segment.id)}
                      >
                        Delete
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}