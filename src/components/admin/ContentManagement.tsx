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
import { Save, RefreshCw, Type, Settings, Clock, Package } from "lucide-react";

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

export function ContentManagement() {
  const [homepageContent, setHomepageContent] = useState<ContentItem[]>([]);
  const [orderContent, setOrderContent] = useState<OrderContent[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [editingItem, setEditingItem] = useState<ContentItem | null>(null);
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
      loadOrderContent()
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
        <TabsList>
          <TabsTrigger value="homepage">Homepage Content</TabsTrigger>
          <TabsTrigger value="order-flow">Order Flow</TabsTrigger>
          <TabsTrigger value="settings">Time Settings</TabsTrigger>
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
          <Card>
            <CardHeader>
              <CardTitle>Order Flow Content</CardTitle>
              <CardDescription>
                Manage text, questions, and options in the order placement flow
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                Order flow content management coming soon. This will allow you to edit:
              </p>
              <ul className="list-disc list-inside mt-2 text-sm text-muted-foreground space-y-1">
                <li>Step titles and descriptions</li>
                <li>Form field labels and placeholders</li>
                <li>Validation messages</li>
                <li>Button text and instructions</li>
                <li>Time window options</li>
              </ul>
            </CardContent>
          </Card>
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