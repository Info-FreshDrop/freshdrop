import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Plus, Edit, Trash2, Star, Shield, Award, CheckCircle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

const iconOptions = [
  { value: 'Shield', label: 'Shield', icon: Shield },
  { value: 'Award', label: 'Award', icon: Award },
  { value: 'CheckCircle', label: 'Check Circle', icon: CheckCircle },
  { value: 'Star', label: 'Star', icon: Star },
];

export function TrustContentManagement() {
  const [operators, setOperators] = useState([]);
  const [trustMetrics, setTrustMetrics] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedOperator, setSelectedOperator] = useState(null);
  const [selectedMetric, setSelectedMetric] = useState(null);
  const [isOperatorDialogOpen, setIsOperatorDialogOpen] = useState(false);
  const [isMetricDialogOpen, setIsMetricDialogOpen] = useState(false);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      // Fetch featured operators
      const { data: operatorsData, error: operatorsError } = await supabase
        .from('featured_operators')
        .select('*')
        .order('display_order', { ascending: true });

      if (operatorsError) throw operatorsError;

      // Fetch trust metrics
      const { data: metricsData, error: metricsError } = await supabase
        .from('trust_metrics')
        .select('*')
        .order('display_order', { ascending: true });

      if (metricsError) throw metricsError;

      setOperators(operatorsData || []);
      setTrustMetrics(metricsData || []);
    } catch (error) {
      console.error('Error fetching data:', error);
      toast.error('Failed to load trust content');
    } finally {
      setLoading(false);
    }
  };

  const handleOperatorSubmit = async (formData) => {
    try {
      if (selectedOperator) {
        // Update existing operator
        const { error } = await supabase
          .from('featured_operators')
          .update(formData)
          .eq('id', selectedOperator.id);

        if (error) throw error;
        toast.success('Operator updated successfully');
      } else {
        // Create new operator
        const { error } = await supabase
          .from('featured_operators')
          .insert([formData]);

        if (error) throw error;
        toast.success('Operator created successfully');
      }

      setIsOperatorDialogOpen(false);
      setSelectedOperator(null);
      fetchData();
    } catch (error) {
      console.error('Error saving operator:', error);
      toast.error('Failed to save operator');
    }
  };

  const handleMetricSubmit = async (formData) => {
    try {
      if (selectedMetric) {
        // Update existing metric
        const { error } = await supabase
          .from('trust_metrics')
          .update(formData)
          .eq('id', selectedMetric.id);

        if (error) throw error;
        toast.success('Trust metric updated successfully');
      } else {
        // Create new metric
        const { error } = await supabase
          .from('trust_metrics')
          .insert([formData]);

        if (error) throw error;
        toast.success('Trust metric created successfully');
      }

      setIsMetricDialogOpen(false);
      setSelectedMetric(null);
      fetchData();
    } catch (error) {
      console.error('Error saving metric:', error);
      toast.error('Failed to save trust metric');
    }
  };

  const handleDeleteOperator = async (id) => {
    if (!confirm('Are you sure you want to delete this operator?')) return;

    try {
      const { error } = await supabase
        .from('featured_operators')
        .delete()
        .eq('id', id);

      if (error) throw error;
      toast.success('Operator deleted successfully');
      fetchData();
    } catch (error) {
      console.error('Error deleting operator:', error);
      toast.error('Failed to delete operator');
    }
  };

  const handleDeleteMetric = async (id) => {
    if (!confirm('Are you sure you want to delete this trust metric?')) return;

    try {
      const { error } = await supabase
        .from('trust_metrics')
        .delete()
        .eq('id', id);

      if (error) throw error;
      toast.success('Trust metric deleted successfully');
      fetchData();
    } catch (error) {
      console.error('Error deleting metric:', error);
      toast.error('Failed to delete trust metric');
    }
  };

  if (loading) {
    return <div className="p-6 text-center">Loading trust content...</div>;
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold">Trust Content Management</h2>
      </div>

      <Tabs defaultValue="operators" className="space-y-6">
        <TabsList>
          <TabsTrigger value="operators">Featured Operators</TabsTrigger>
          <TabsTrigger value="metrics">Trust Metrics</TabsTrigger>
        </TabsList>

        <TabsContent value="operators" className="space-y-4">
          <div className="flex justify-between items-center">
            <h3 className="text-lg font-semibold">Featured Operators ({operators.length})</h3>
            <Dialog open={isOperatorDialogOpen} onOpenChange={setIsOperatorDialogOpen}>
              <DialogTrigger asChild>
                <Button 
                  onClick={() => setSelectedOperator(null)}
                  className="flex items-center gap-2"
                >
                  <Plus className="h-4 w-4" />
                  Add Operator
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-2xl">
                <DialogHeader>
                  <DialogTitle>
                    {selectedOperator ? 'Edit Operator' : 'Add New Operator'}
                  </DialogTitle>
                </DialogHeader>
                <OperatorForm 
                  operator={selectedOperator} 
                  onSubmit={handleOperatorSubmit}
                />
              </DialogContent>
            </Dialog>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {operators.map((operator) => (
              <Card key={operator.id} className="overflow-hidden">
                <div className="relative">
                  <img 
                    src={operator.image_url || "https://images.unsplash.com/photo-1519389950473-47ba0277781c?w=300&h=200&fit=crop&crop=face"}
                    alt={operator.name}
                    className="w-full h-32 object-cover"
                  />
                  <div className="absolute top-2 right-2 flex gap-1">
                    {operator.is_featured && (
                      <Badge variant="secondary" className="text-xs">Featured</Badge>
                    )}
                    {operator.is_verified && (
                      <Badge variant="default" className="text-xs bg-green-500">Verified</Badge>
                    )}
                  </div>
                </div>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm">{operator.name}</CardTitle>
                  <div className="text-xs text-muted-foreground space-y-1">
                    <div>Experience: {operator.experience}</div>
                    <div>Rating: {operator.rating}/5</div>
                    <div>Orders: {operator.completed_orders}</div>
                  </div>
                </CardHeader>
                <CardContent className="pt-0">
                  <div className="flex flex-wrap gap-1 mb-3">
                    {operator.specialties?.map((specialty, index) => (
                      <Badge key={index} variant="outline" className="text-xs">
                        {specialty}
                      </Badge>
                    ))}
                  </div>
                  <div className="flex gap-2">
                    <Button 
                      size="sm" 
                      variant="outline"
                      onClick={() => {
                        setSelectedOperator(operator);
                        setIsOperatorDialogOpen(true);
                      }}
                    >
                      <Edit className="h-3 w-3" />
                    </Button>
                    <Button 
                      size="sm" 
                      variant="destructive"
                      onClick={() => handleDeleteOperator(operator.id)}
                    >
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="metrics" className="space-y-4">
          <div className="flex justify-between items-center">
            <h3 className="text-lg font-semibold">Trust Metrics ({trustMetrics.length})</h3>
            <Dialog open={isMetricDialogOpen} onOpenChange={setIsMetricDialogOpen}>
              <DialogTrigger asChild>
                <Button 
                  onClick={() => setSelectedMetric(null)}
                  className="flex items-center gap-2"
                >
                  <Plus className="h-4 w-4" />
                  Add Metric
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>
                    {selectedMetric ? 'Edit Trust Metric' : 'Add New Trust Metric'}
                  </DialogTitle>
                </DialogHeader>
                <MetricForm 
                  metric={selectedMetric} 
                  onSubmit={handleMetricSubmit}
                />
              </DialogContent>
            </Dialog>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {trustMetrics.map((metric) => {
              const IconComponent = iconOptions.find(opt => opt.value === metric.icon_name)?.icon || CheckCircle;
              return (
                <Card key={metric.id}>
                  <CardHeader className="text-center pb-2">
                    <div className="flex justify-center mb-2">
                      <div className="p-2 rounded-full bg-primary/10">
                        <IconComponent className="h-6 w-6 text-primary" />
                      </div>
                    </div>
                    <div className="text-2xl font-bold text-primary">{metric.value}</div>
                    <CardTitle className="text-sm">{metric.title}</CardTitle>
                  </CardHeader>
                  <CardContent className="pt-0">
                    <p className="text-xs text-muted-foreground text-center mb-3">
                      {metric.description}
                    </p>
                    <div className="flex gap-2 justify-center">
                      <Button 
                        size="sm" 
                        variant="outline"
                        onClick={() => {
                          setSelectedMetric(metric);
                          setIsMetricDialogOpen(true);
                        }}
                      >
                        <Edit className="h-3 w-3" />
                      </Button>
                      <Button 
                        size="sm" 
                        variant="destructive"
                        onClick={() => handleDeleteMetric(metric.id)}
                      >
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}

function OperatorForm({ operator, onSubmit }) {
  const [formData, setFormData] = useState({
    name: operator?.name || '',
    image_url: operator?.image_url || '',
    experience: operator?.experience || '',
    rating: operator?.rating || 4.0,
    completed_orders: operator?.completed_orders || 0,
    specialties: operator?.specialties || [],
    is_verified: operator?.is_verified ?? true,
    is_featured: operator?.is_featured ?? true,
    display_order: operator?.display_order || 0,
  });

  const [newSpecialty, setNewSpecialty] = useState('');

  const handleSubmit = (e) => {
    e.preventDefault();
    onSubmit(formData);
  };

  const addSpecialty = () => {
    if (newSpecialty.trim() && !formData.specialties.includes(newSpecialty.trim())) {
      setFormData(prev => ({
        ...prev,
        specialties: [...prev.specialties, newSpecialty.trim()]
      }));
      setNewSpecialty('');
    }
  };

  const removeSpecialty = (specialty) => {
    setFormData(prev => ({
      ...prev,
      specialties: prev.specialties.filter(s => s !== specialty)
    }));
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label htmlFor="name">Name</Label>
          <Input
            id="name"
            value={formData.name}
            onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
            required
          />
        </div>
        <div>
          <Label htmlFor="experience">Experience</Label>
          <Input
            id="experience"
            value={formData.experience}
            onChange={(e) => setFormData(prev => ({ ...prev, experience: e.target.value }))}
            placeholder="e.g., 3 years"
            required
          />
        </div>
      </div>

      <div>
        <Label htmlFor="image_url">Image URL</Label>
        <Input
          id="image_url"
          value={formData.image_url}
          onChange={(e) => setFormData(prev => ({ ...prev, image_url: e.target.value }))}
          placeholder="https://..."
        />
      </div>

      <div className="grid grid-cols-3 gap-4">
        <div>
          <Label htmlFor="rating">Rating</Label>
          <Input
            id="rating"
            type="number"
            min="1"
            max="5"
            step="0.1"
            value={formData.rating}
            onChange={(e) => setFormData(prev => ({ ...prev, rating: parseFloat(e.target.value) }))}
            required
          />
        </div>
        <div>
          <Label htmlFor="completed_orders">Completed Orders</Label>
          <Input
            id="completed_orders"
            type="number"
            min="0"
            value={formData.completed_orders}
            onChange={(e) => setFormData(prev => ({ ...prev, completed_orders: parseInt(e.target.value) }))}
            required
          />
        </div>
        <div>
          <Label htmlFor="display_order">Display Order</Label>
          <Input
            id="display_order"
            type="number"
            min="0"
            value={formData.display_order}
            onChange={(e) => setFormData(prev => ({ ...prev, display_order: parseInt(e.target.value) }))}
          />
        </div>
      </div>

      <div>
        <Label>Specialties</Label>
        <div className="flex gap-2 mb-2">
          <Input
            value={newSpecialty}
            onChange={(e) => setNewSpecialty(e.target.value)}
            placeholder="Add specialty"
            onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addSpecialty())}
          />
          <Button type="button" onClick={addSpecialty}>Add</Button>
        </div>
        <div className="flex flex-wrap gap-1">
          {formData.specialties.map((specialty, index) => (
            <Badge key={index} variant="secondary" className="cursor-pointer" onClick={() => removeSpecialty(specialty)}>
              {specialty} ×
            </Badge>
          ))}
        </div>
      </div>

      <div className="flex gap-4">
        <div className="flex items-center space-x-2">
          <Switch
            id="is_verified"
            checked={formData.is_verified}
            onCheckedChange={(checked) => setFormData(prev => ({ ...prev, is_verified: checked }))}
          />
          <Label htmlFor="is_verified">Verified</Label>
        </div>
        <div className="flex items-center space-x-2">
          <Switch
            id="is_featured"
            checked={formData.is_featured}
            onCheckedChange={(checked) => setFormData(prev => ({ ...prev, is_featured: checked }))}
          />
          <Label htmlFor="is_featured">Featured</Label>
        </div>
      </div>

      <Button type="submit" className="w-full">
        {operator ? 'Update Operator' : 'Create Operator'}
      </Button>
    </form>
  );
}

function MetricForm({ metric, onSubmit }) {
  const [formData, setFormData] = useState({
    title: metric?.title || '',
    description: metric?.description || '',
    value: metric?.value || '',
    icon_name: metric?.icon_name || 'CheckCircle',
    display_order: metric?.display_order || 0,
    is_active: metric?.is_active ?? true,
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    onSubmit(formData);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <Label htmlFor="title">Title</Label>
        <Input
          id="title"
          value={formData.title}
          onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
          required
        />
      </div>

      <div>
        <Label htmlFor="value">Value</Label>
        <Input
          id="value"
          value={formData.value}
          onChange={(e) => setFormData(prev => ({ ...prev, value: e.target.value }))}
          placeholder="e.g., 100%, 4.9/5, 15,000+"
          required
        />
      </div>

      <div>
        <Label htmlFor="description">Description</Label>
        <Textarea
          id="description"
          value={formData.description}
          onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
          required
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label htmlFor="icon_name">Icon</Label>
          <Select
            value={formData.icon_name}
            onValueChange={(value) => setFormData(prev => ({ ...prev, icon_name: value }))}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {iconOptions.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  <div className="flex items-center gap-2">
                    <option.icon className="h-4 w-4" />
                    {option.label}
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label htmlFor="display_order">Display Order</Label>
          <Input
            id="display_order"
            type="number"
            min="0"
            value={formData.display_order}
            onChange={(e) => setFormData(prev => ({ ...prev, display_order: parseInt(e.target.value) }))}
          />
        </div>
      </div>

      <div className="flex items-center space-x-2">
        <Switch
          id="is_active"
          checked={formData.is_active}
          onCheckedChange={(checked) => setFormData(prev => ({ ...prev, is_active: checked }))}
        />
        <Label htmlFor="is_active">Active</Label>
      </div>

      <Button type="submit" className="w-full">
        {metric ? 'Update Metric' : 'Create Metric'}
      </Button>
    </form>
  );
}