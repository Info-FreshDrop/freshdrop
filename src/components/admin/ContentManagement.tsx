import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Save, RefreshCw, Type, Settings, Clock, Package, Star, Users, ShoppingBag, Image, Palette } from "lucide-react";

interface ContentItem {
  id: string;
  section_key: string;
  content_text: string;
  content_type: string;
  is_active: boolean;
  updated_at: string;
}

interface OrderContent {
  id: string;
  content_key: string;
  content_text: string;
  content_type: string;
  is_active: boolean;
}

interface AppSetting {
  id: string;
  setting_key: string;
  setting_value: any;
  description?: string;
}

interface TrustMetric {
  id: string;
  title: string;
  value: string;
  description: string;
  icon_name: string;
  display_order: number;
  is_active: boolean;
}

interface Testimonial {
  id: string;
  customer_name: string;
  customer_initial: string;
  testimonial_text: string;
  image_url?: string;
  display_order: number;
  is_featured: boolean;
}

interface FeaturedOperator {
  id: string;
  name: string;
  image_url?: string;
  experience: string;
  specialties: string[];
  rating: number;
  completed_orders: number;
  is_featured: boolean;
  display_order: number;
}

interface ClothesItem {
  id: string;
  name: string;
  category: string;
  description?: string;
  price_cents: number;
  image_url?: string;
  is_in_stock: boolean;
  is_active: boolean;
}

interface LaundryPreference {
  id: string;
  name: string;
  category: string;
  description?: string;
  price_cents: number;
  is_default: boolean;
  is_active: boolean;
}

export function ContentManagement() {
  const [homepageContent, setHomepageContent] = useState<ContentItem[]>([]);
  const [orderContent, setOrderContent] = useState<OrderContent[]>([]);
  const [appSettings, setAppSettings] = useState<AppSetting[]>([]);
  const [trustMetrics, setTrustMetrics] = useState<TrustMetric[]>([]);
  const [testimonials, setTestimonials] = useState<Testimonial[]>([]);
  const [featuredOperators, setFeaturedOperators] = useState<FeaturedOperator[]>([]);
  const [clothesItems, setClothesItems] = useState<ClothesItem[]>([]);
  const [laundryPreferences, setLaundryPreferences] = useState<LaundryPreference[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [editingItem, setEditingItem] = useState<any>(null);
  const [editingType, setEditingType] = useState<string>("");
  const [newContent, setNewContent] = useState("");
  const { toast } = useToast();

  useEffect(() => {
    loadContent();
    
    // Set up real-time subscriptions
    const homepageChannel = supabase
      .channel('homepage-content-changes')
      .on('postgres_changes', 
        { event: '*', schema: 'public', table: 'homepage_content' },
        () => loadHomepageContent()
      )
      .subscribe();

    const orderChannel = supabase
      .channel('order-content-changes')
      .on('postgres_changes', 
        { event: '*', schema: 'public', table: 'order_content' },
        () => loadOrderContent()
      )
      .subscribe();

    return () => {
      supabase.removeChannel(homepageChannel);
      supabase.removeChannel(orderChannel);
    };
  }, []);

  const loadContent = async () => {
    setLoading(true);
    await Promise.all([
      loadHomepageContent(),
      loadOrderContent(),
      loadAppSettings(),
      loadTrustMetrics(),
      loadTestimonials(),
      loadFeaturedOperators(),
      loadClothesItems(),
      loadLaundryPreferences()
    ]);
    setLoading(false);
  };

  const loadHomepageContent = async () => {
    const { data, error } = await supabase
      .from('homepage_content')
      .select('*')
      .order('section_key');

    if (error) {
      console.error('Error loading homepage content:', error);
      toast({
        title: "Error loading content",
        description: "Failed to load homepage content",
        variant: "destructive",
      });
      return;
    }

    setHomepageContent(data || []);
  };

  const loadOrderContent = async () => {
    const { data, error } = await supabase
      .from('order_content')
      .select('*')
      .order('content_key');

    if (error) {
      console.error('Error loading order content:', error);
      toast({
        title: "Error loading order content",
        description: "Failed to load order flow content",
        variant: "destructive",
      });
      return;
    }

    setOrderContent(data || []);
  };

  const loadAppSettings = async () => {
    const { data, error } = await supabase
      .from('app_settings')
      .select('*')
      .order('setting_key');

    if (error) {
      console.error('Error loading app settings:', error);
      return;
    }
    setAppSettings(data || []);
  };

  const loadTrustMetrics = async () => {
    const { data, error } = await supabase
      .from('trust_metrics')
      .select('*')
      .order('display_order');

    if (error) {
      console.error('Error loading trust metrics:', error);
      return;
    }
    setTrustMetrics(data || []);
  };

  const loadTestimonials = async () => {
    const { data, error } = await supabase
      .from('customer_testimonials')
      .select('*')
      .order('display_order');

    if (error) {
      console.error('Error loading testimonials:', error);
      return;
    }
    setTestimonials(data || []);
  };

  const loadFeaturedOperators = async () => {
    const { data, error } = await supabase
      .from('featured_operators')
      .select('*')
      .order('display_order');

    if (error) {
      console.error('Error loading featured operators:', error);
      return;
    }
    setFeaturedOperators(data || []);
  };

  const loadClothesItems = async () => {
    const { data, error } = await supabase
      .from('clothes_items')
      .select('*')
      .order('category', { ascending: true })
      .order('name');

    if (error) {
      console.error('Error loading clothes items:', error);
      return;
    }
    setClothesItems(data || []);
  };

  const loadLaundryPreferences = async () => {
    const { data, error } = await supabase
      .from('laundry_preferences')
      .select('*')
      .order('category', { ascending: true })
      .order('name');

    if (error) {
      console.error('Error loading laundry preferences:', error);
      return;
    }
    setLaundryPreferences(data || []);
  };

  const updateHomepageContent = async (item: ContentItem) => {
    setSaving(true);
    const { error } = await supabase
      .from('homepage_content')
      .update({ 
        content_text: newContent || item.content_text,
        updated_at: new Date().toISOString()
      })
      .eq('id', item.id);

    if (error) {
      toast({
        title: "Error updating content",
        description: error.message,
        variant: "destructive",
      });
    } else {
      toast({
        title: "Content updated",
        description: "Changes are now live for all customers",
      });
      setEditingItem(null);
      setNewContent("");
      loadHomepageContent();
    }
    setSaving(false);
  };

  const toggleContentActive = async (item: ContentItem) => {
    const { error } = await supabase
      .from('homepage_content')
      .update({ is_active: !item.is_active })
      .eq('id', item.id);

    if (error) {
      toast({
        title: "Error updating content",
        description: error.message,
        variant: "destructive",
      });
    } else {
      loadHomepageContent();
    }
  };

  const contentSections = {
    hero: homepageContent.filter(item => item.section_key.startsWith('hero')),
    services: homepageContent.filter(item => item.section_key.startsWith('services')),
    how_it_works: homepageContent.filter(item => item.section_key.startsWith('how_it_works')),
    trust: homepageContent.filter(item => item.section_key.startsWith('trust')),
    team: homepageContent.filter(item => item.section_key.startsWith('team')),
    other: homepageContent.filter(item => !['hero', 'services', 'how_it_works', 'trust', 'team'].some(prefix => item.section_key.startsWith(prefix)))
  };

  const renderContentEditor = (item: ContentItem) => (
    <Card key={item.id} className="mb-4">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-sm font-medium">
              {item.section_key.replace(/_/g, ' ').toUpperCase()}
            </CardTitle>
            <p className="text-xs text-muted-foreground">
              Last updated: {new Date(item.updated_at).toLocaleString()}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Switch
              checked={item.is_active}
              onCheckedChange={() => toggleContentActive(item)}
            />
            <Badge variant={item.is_active ? "default" : "secondary"}>
              {item.is_active ? "Active" : "Inactive"}
            </Badge>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {editingItem?.id === item.id ? (
          <div className="space-y-3">
            <Textarea
              value={newContent}
              onChange={(e) => setNewContent(e.target.value)}
              placeholder="Edit content..."
              className="min-h-[100px]"
            />
            <div className="flex gap-2">
              <Button 
                onClick={() => updateHomepageContent(item)}
                disabled={saving}
                size="sm"
              >
                <Save className="w-4 h-4 mr-2" />
                {saving ? "Saving..." : "Save Changes"}
              </Button>
              <Button 
                variant="outline" 
                onClick={() => {
                  setEditingItem(null);
                  setNewContent("");
                }}
                size="sm"
              >
                Cancel
              </Button>
            </div>
          </div>
        ) : (
          <div className="space-y-3">
            <p className="text-sm bg-muted p-3 rounded">
              {item.content_text}
            </p>
            <Button 
              variant="outline" 
              size="sm"
              onClick={() => {
                setEditingItem(item);
                setNewContent(item.content_text);
              }}
            >
              <Type className="w-4 h-4 mr-2" />
              Edit Text
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <RefreshCw className="w-6 h-6 animate-spin mr-2" />
        Loading content...
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Content Management</h2>
          <p className="text-muted-foreground">
            Edit website content that updates in real-time for all customers
          </p>
        </div>
        <Button onClick={loadContent} variant="outline">
          <RefreshCw className="w-4 h-4 mr-2" />
          Refresh
        </Button>
      </div>

      <Tabs defaultValue="homepage" className="space-y-4">
        <TabsList className="grid w-full grid-cols-3 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-8 gap-0.5 h-auto">
          <TabsTrigger value="homepage" className="text-xs px-2 py-1">Home</TabsTrigger>
          <TabsTrigger value="order-flow" className="text-xs px-2 py-1">Order</TabsTrigger>
          <TabsTrigger value="trust" className="text-xs px-2 py-1">Trust</TabsTrigger>
          <TabsTrigger value="testimonials" className="text-xs px-2 py-1">Reviews</TabsTrigger>
          <TabsTrigger value="operators" className="text-xs px-2 py-1">Ops</TabsTrigger>
          <TabsTrigger value="shop" className="text-xs px-2 py-1">Shop</TabsTrigger>
          <TabsTrigger value="preferences" className="text-xs px-2 py-1">Prefs</TabsTrigger>
          <TabsTrigger value="settings" className="text-xs px-2 py-1">Settings</TabsTrigger>
        </TabsList>

        <TabsContent value="homepage" className="space-y-6">
          <div className="grid gap-6 md:grid-cols-2">
            <div>
              <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                <Type className="w-5 h-5" />
                Hero Section
              </h3>
              {contentSections.hero.map(renderContentEditor)}
            </div>

            <div>
              <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                <Package className="w-5 h-5" />
                Services Section
              </h3>
              {contentSections.services.map(renderContentEditor)}
            </div>

            <div>
              <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                <Settings className="w-5 h-5" />
                How It Works
              </h3>
              {contentSections.how_it_works.map(renderContentEditor)}
            </div>

            <div>
              <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                <Badge className="w-5 h-5" />
                Trust & Team
              </h3>
              {[...contentSections.trust, ...contentSections.team].map(renderContentEditor)}
            </div>
          </div>

          {contentSections.other.length > 0 && (
            <div>
              <h3 className="text-lg font-semibold mb-4">Other Content</h3>
              {contentSections.other.map(renderContentEditor)}
            </div>
          )}
        </TabsContent>

        <TabsContent value="order-flow">
          <div className="space-y-4">
            <h3 className="text-lg font-semibold">Order Flow Content</h3>
            {orderContent.map((item) => (
              <Card key={item.id}>
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-sm font-medium">
                      {item.content_key.replace(/_/g, ' ').toUpperCase()}
                    </CardTitle>
                    <Switch
                      checked={item.is_active}
                      onCheckedChange={async () => {
                        const { error } = await supabase
                          .from('order_content')
                          .update({ is_active: !item.is_active })
                          .eq('id', item.id);
                        if (!error) loadOrderContent();
                      }}
                    />
                  </div>
                </CardHeader>
                <CardContent>
                  {editingItem?.id === item.id && editingType === 'order' ? (
                    <div className="space-y-3">
                      <Textarea
                        value={newContent}
                        onChange={(e) => setNewContent(e.target.value)}
                        className="min-h-[100px]"
                      />
                      <div className="flex gap-2">
                        <Button 
                          onClick={async () => {
                            setSaving(true);
                            const { error } = await supabase
                              .from('order_content')
                              .update({ content_text: newContent })
                              .eq('id', item.id);
                            if (!error) {
                              toast({ title: "Content updated" });
                              loadOrderContent();
                              setEditingItem(null);
                              setNewContent("");
                            }
                            setSaving(false);
                          }}
                          disabled={saving}
                          size="sm"
                        >
                          Save
                        </Button>
                        <Button variant="outline" onClick={() => setEditingItem(null)} size="sm">
                          Cancel
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      <p className="text-sm bg-muted p-3 rounded">{item.content_text}</p>
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={() => {
                          setEditingItem(item);
                          setEditingType('order');
                          setNewContent(item.content_text);
                        }}
                      >
                        Edit Text
                      </Button>
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="trust">
          <div className="space-y-4">
            <h3 className="text-lg font-semibold flex items-center gap-2">
              <Star className="w-5 h-5" />
              Trust Metrics
            </h3>
            {trustMetrics.map((metric) => (
              <Card key={metric.id}>
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-sm font-medium">{metric.title}</CardTitle>
                    <Switch
                      checked={metric.is_active}
                      onCheckedChange={async () => {
                        const { error } = await supabase
                          .from('trust_metrics')
                          .update({ is_active: !metric.is_active })
                          .eq('id', metric.id);
                        if (!error) loadTrustMetrics();
                      }}
                    />
                  </div>
                </CardHeader>
                <CardContent className="space-y-2">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label>Value</Label>
                      <Input 
                        value={metric.value}
                        onChange={async (e) => {
                          const { error } = await supabase
                            .from('trust_metrics')
                            .update({ value: e.target.value })
                            .eq('id', metric.id);
                          if (!error) loadTrustMetrics();
                        }}
                      />
                    </div>
                    <div>
                      <Label>Icon Name</Label>
                      <Input 
                        value={metric.icon_name}
                        onChange={async (e) => {
                          const { error } = await supabase
                            .from('trust_metrics')
                            .update({ icon_name: e.target.value })
                            .eq('id', metric.id);
                          if (!error) loadTrustMetrics();
                        }}
                      />
                    </div>
                  </div>
                  <div>
                    <Label>Description</Label>
                    <Textarea 
                      value={metric.description}
                      onChange={async (e) => {
                        const { error } = await supabase
                          .from('trust_metrics')
                          .update({ description: e.target.value })
                          .eq('id', metric.id);
                        if (!error) loadTrustMetrics();
                      }}
                    />
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="testimonials">
          <div className="space-y-4">
            <h3 className="text-lg font-semibold flex items-center gap-2">
              <Users className="w-5 h-5" />
              Customer Testimonials
            </h3>
            {testimonials.map((testimonial) => (
              <Card key={testimonial.id}>
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-sm font-medium">{testimonial.customer_name}</CardTitle>
                    <Switch
                      checked={testimonial.is_featured}
                      onCheckedChange={async () => {
                        const { error } = await supabase
                          .from('customer_testimonials')
                          .update({ is_featured: !testimonial.is_featured })
                          .eq('id', testimonial.id);
                        if (!error) loadTestimonials();
                      }}
                    />
                  </div>
                </CardHeader>
                <CardContent className="space-y-2">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label>Customer Name</Label>
                      <Input 
                        value={testimonial.customer_name}
                        onChange={async (e) => {
                          const { error } = await supabase
                            .from('customer_testimonials')
                            .update({ customer_name: e.target.value })
                            .eq('id', testimonial.id);
                          if (!error) loadTestimonials();
                        }}
                      />
                    </div>
                    <div>
                      <Label>Initial</Label>
                      <Input 
                        value={testimonial.customer_initial}
                        onChange={async (e) => {
                          const { error } = await supabase
                            .from('customer_testimonials')
                            .update({ customer_initial: e.target.value })
                            .eq('id', testimonial.id);
                          if (!error) loadTestimonials();
                        }}
                      />
                    </div>
                  </div>
                  <div>
                    <Label>Testimonial Text</Label>
                    <Textarea 
                      value={testimonial.testimonial_text}
                      onChange={async (e) => {
                        const { error } = await supabase
                          .from('customer_testimonials')
                          .update({ testimonial_text: e.target.value })
                          .eq('id', testimonial.id);
                        if (!error) loadTestimonials();
                      }}
                    />
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="operators">
          <div className="space-y-4">
            <h3 className="text-lg font-semibold flex items-center gap-2">
              <Users className="w-5 h-5" />
              Featured Operators
            </h3>
            {featuredOperators.map((operator) => (
              <Card key={operator.id}>
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-sm font-medium">{operator.name}</CardTitle>
                    <Switch
                      checked={operator.is_featured}
                      onCheckedChange={async () => {
                        const { error } = await supabase
                          .from('featured_operators')
                          .update({ is_featured: !operator.is_featured })
                          .eq('id', operator.id);
                        if (!error) loadFeaturedOperators();
                      }}
                    />
                  </div>
                </CardHeader>
                <CardContent className="space-y-2">
                  <div className="grid grid-cols-3 gap-4">
                    <div>
                      <Label>Name</Label>
                      <Input 
                        value={operator.name}
                        onChange={async (e) => {
                          const { error } = await supabase
                            .from('featured_operators')
                            .update({ name: e.target.value })
                            .eq('id', operator.id);
                          if (!error) loadFeaturedOperators();
                        }}
                      />
                    </div>
                    <div>
                      <Label>Rating</Label>
                      <Input 
                        type="number"
                        step="0.1"
                        min="0"
                        max="5"
                        value={operator.rating}
                        onChange={async (e) => {
                          const { error } = await supabase
                            .from('featured_operators')
                            .update({ rating: parseFloat(e.target.value) })
                            .eq('id', operator.id);
                          if (!error) loadFeaturedOperators();
                        }}
                      />
                    </div>
                    <div>
                      <Label>Completed Orders</Label>
                      <Input 
                        type="number"
                        value={operator.completed_orders}
                        onChange={async (e) => {
                          const { error } = await supabase
                            .from('featured_operators')
                            .update({ completed_orders: parseInt(e.target.value) })
                            .eq('id', operator.id);
                          if (!error) loadFeaturedOperators();
                        }}
                      />
                    </div>
                  </div>
                  <div>
                    <Label>Experience</Label>
                    <Textarea 
                      value={operator.experience}
                      onChange={async (e) => {
                        const { error } = await supabase
                          .from('featured_operators')
                          .update({ experience: e.target.value })
                          .eq('id', operator.id);
                        if (!error) loadFeaturedOperators();
                      }}
                    />
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="shop">
          <div className="space-y-4">
            <h3 className="text-lg font-semibold flex items-center gap-2">
              <ShoppingBag className="w-5 h-5" />
              Shop Items
            </h3>
            {clothesItems.map((item) => (
              <Card key={item.id}>
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-sm font-medium">{item.name}</CardTitle>
                    <div className="flex items-center gap-2">
                      <Badge variant={item.is_in_stock ? "default" : "secondary"}>
                        {item.is_in_stock ? "In Stock" : "Out of Stock"}
                      </Badge>
                      <Switch
                        checked={item.is_active}
                        onCheckedChange={async () => {
                          const { error } = await supabase
                            .from('clothes_items')
                            .update({ is_active: !item.is_active })
                            .eq('id', item.id);
                          if (!error) loadClothesItems();
                        }}
                      />
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-2">
                  <div className="grid grid-cols-3 gap-4">
                    <div>
                      <Label>Name</Label>
                      <Input 
                        value={item.name}
                        onChange={async (e) => {
                          const { error } = await supabase
                            .from('clothes_items')
                            .update({ name: e.target.value })
                            .eq('id', item.id);
                          if (!error) loadClothesItems();
                        }}
                      />
                    </div>
                    <div>
                      <Label>Category</Label>
                      <Input 
                        value={item.category}
                        onChange={async (e) => {
                          const { error } = await supabase
                            .from('clothes_items')
                            .update({ category: e.target.value })
                            .eq('id', item.id);
                          if (!error) loadClothesItems();
                        }}
                      />
                    </div>
                    <div>
                      <Label>Price ($)</Label>
                      <Input 
                        type="number"
                        step="0.01"
                        value={item.price_cents / 100}
                        onChange={async (e) => {
                          const { error } = await supabase
                            .from('clothes_items')
                            .update({ price_cents: Math.round(parseFloat(e.target.value) * 100) })
                            .eq('id', item.id);
                          if (!error) loadClothesItems();
                        }}
                      />
                    </div>
                  </div>
                  <div>
                    <Label>Description</Label>
                    <Textarea 
                      value={item.description || ""}
                      onChange={async (e) => {
                        const { error } = await supabase
                          .from('clothes_items')
                          .update({ description: e.target.value })
                          .eq('id', item.id);
                        if (!error) loadClothesItems();
                      }}
                    />
                  </div>
                  <div className="flex items-center space-x-2">
                    <Switch
                      checked={item.is_in_stock}
                      onCheckedChange={async () => {
                        const { error } = await supabase
                          .from('clothes_items')
                          .update({ is_in_stock: !item.is_in_stock })
                          .eq('id', item.id);
                        if (!error) loadClothesItems();
                      }}
                    />
                    <Label>In Stock</Label>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="preferences">
          <div className="space-y-4">
            <h3 className="text-lg font-semibold flex items-center gap-2">
              <Palette className="w-5 h-5" />
              Laundry Preferences
            </h3>
            {laundryPreferences.map((pref) => (
              <Card key={pref.id}>
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-sm font-medium">{pref.name}</CardTitle>
                    <div className="flex items-center gap-2">
                      <Badge variant={pref.is_default ? "default" : "secondary"}>
                        {pref.is_default ? "Default" : "Optional"}
                      </Badge>
                      <Switch
                        checked={pref.is_active}
                        onCheckedChange={async () => {
                          const { error } = await supabase
                            .from('laundry_preferences')
                            .update({ is_active: !pref.is_active })
                            .eq('id', pref.id);
                          if (!error) loadLaundryPreferences();
                        }}
                      />
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-2">
                  <div className="grid grid-cols-3 gap-4">
                    <div>
                      <Label>Name</Label>
                      <Input 
                        value={pref.name}
                        onChange={async (e) => {
                          const { error } = await supabase
                            .from('laundry_preferences')
                            .update({ name: e.target.value })
                            .eq('id', pref.id);
                          if (!error) loadLaundryPreferences();
                        }}
                      />
                    </div>
                    <div>
                      <Label>Category</Label>
                      <Input 
                        value={pref.category}
                        onChange={async (e) => {
                          const { error } = await supabase
                            .from('laundry_preferences')
                            .update({ category: e.target.value })
                            .eq('id', pref.id);
                          if (!error) loadLaundryPreferences();
                        }}
                      />
                    </div>
                    <div>
                      <Label>Price ($)</Label>
                      <Input 
                        type="number"
                        step="0.01"
                        value={pref.price_cents / 100}
                        onChange={async (e) => {
                          const { error } = await supabase
                            .from('laundry_preferences')
                            .update({ price_cents: Math.round(parseFloat(e.target.value) * 100) })
                            .eq('id', pref.id);
                          if (!error) loadLaundryPreferences();
                        }}
                      />
                    </div>
                  </div>
                  <div>
                    <Label>Description</Label>
                    <Textarea 
                      value={pref.description || ""}
                      onChange={async (e) => {
                        const { error } = await supabase
                          .from('laundry_preferences')
                          .update({ description: e.target.value })
                          .eq('id', pref.id);
                        if (!error) loadLaundryPreferences();
                      }}
                    />
                  </div>
                  <div className="flex items-center space-x-2">
                    <Switch
                      checked={pref.is_default}
                      onCheckedChange={async () => {
                        const { error } = await supabase
                          .from('laundry_preferences')
                          .update({ is_default: !pref.is_default })
                          .eq('id', pref.id);
                        if (!error) loadLaundryPreferences();
                      }}
                    />
                    <Label>Default Option</Label>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="settings">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Clock className="w-5 h-5" />
                Time & Scheduling Settings
              </CardTitle>
              <CardDescription>
                Configure pickup time windows and validation rules
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="grid gap-4 md:grid-cols-2">
                  <div>
                    <Label>Minimum pickup advance time</Label>
                    <Input 
                      type="number" 
                      placeholder="1" 
                      className="mt-1"
                      defaultValue="1"
                    />
                    <p className="text-xs text-muted-foreground mt-1">
                      Hours customers must wait before pickup
                    </p>
                  </div>
                  <div>
                    <Label>Maximum advance booking</Label>
                    <Input 
                      type="number" 
                      placeholder="14" 
                      className="mt-1"
                      defaultValue="14"
                    />
                    <p className="text-xs text-muted-foreground mt-1">
                      Days ahead customers can book
                    </p>
                  </div>
                </div>
                
                <div className="pt-4 border-t">
                  <h4 className="font-medium mb-3">Time Windows</h4>
                  <div className="space-y-3">
                    <div className="flex items-center justify-between p-3 border rounded">
                      <div>
                        <span className="font-medium">Morning</span>
                        <span className="text-sm text-muted-foreground ml-2">6AM - 8AM</span>
                      </div>
                      <Switch defaultChecked />
                    </div>
                    <div className="flex items-center justify-between p-3 border rounded">
                      <div>
                        <span className="font-medium">Lunch</span>
                        <span className="text-sm text-muted-foreground ml-2">12PM - 2PM</span>
                      </div>
                      <Switch defaultChecked />
                    </div>
                    <div className="flex items-center justify-between p-3 border rounded">
                      <div>
                        <span className="font-medium">Evening</span>
                        <span className="text-sm text-muted-foreground ml-2">5PM - 7PM</span>
                      </div>
                      <Switch defaultChecked />
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}