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
import { Plus, Edit, Trash2, Upload, Image, FileText, Users, Target } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export function HomepageContentManagement() {
  const [homepageContent, setHomepageContent] = useState([]);
  const [testimonials, setTestimonials] = useState([]);
  const [contentImages, setContentImages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedItem, setSelectedItem] = useState(null);
  const [isContentDialogOpen, setIsContentDialogOpen] = useState(false);
  const [isTestimonialDialogOpen, setIsTestimonialDialogOpen] = useState(false);
  const [isImageDialogOpen, setIsImageDialogOpen] = useState(false);
  const [selectedDialogType, setSelectedDialogType] = useState('');

  useEffect(() => {
    fetchAllContent();
  }, []);

  const fetchAllContent = async () => {
    try {
      // Fetch homepage content
      const { data: contentData, error: contentError } = await supabase
        .from('homepage_content')
        .select('*')
        .order('section_key', { ascending: true });

      if (contentError) throw contentError;

      // Fetch testimonials
      const { data: testimonialsData, error: testimonialsError } = await supabase
        .from('customer_testimonials')
        .select('*')
        .order('display_order', { ascending: true });

      if (testimonialsError) throw testimonialsError;

      // Fetch content images
      const { data: imagesData, error: imagesError } = await supabase
        .from('content_images')
        .select('*')
        .order('section, display_order', { ascending: true });

      if (imagesError) throw imagesError;

      setHomepageContent(contentData || []);
      setTestimonials(testimonialsData || []);
      setContentImages(imagesData || []);
    } catch (error) {
      console.error('Error fetching content:', error);
      toast.error('Failed to load homepage content');
    } finally {
      setLoading(false);
    }
  };

  const handleContentSubmit = async (formData) => {
    try {
      if (selectedItem) {
        // Update existing content
        const { error } = await supabase
          .from('homepage_content')
          .update(formData)
          .eq('id', selectedItem.id);

        if (error) throw error;
        toast.success('Content updated successfully');
      } else {
        // Create new content
        const { error } = await supabase
          .from('homepage_content')
          .insert([formData]);

        if (error) throw error;
        toast.success('Content created successfully');
      }

      setIsContentDialogOpen(false);
      setSelectedItem(null);
      fetchAllContent();
    } catch (error) {
      console.error('Error saving content:', error);
      toast.error('Failed to save content');
    }
  };

  const handleTestimonialSubmit = async (formData) => {
    try {
      if (selectedItem) {
        // Update existing testimonial
        const { error } = await supabase
          .from('customer_testimonials')
          .update(formData)
          .eq('id', selectedItem.id);

        if (error) throw error;
        toast.success('Testimonial updated successfully');
      } else {
        // Create new testimonial
        const { error } = await supabase
          .from('customer_testimonials')
          .insert([formData]);

        if (error) throw error;
        toast.success('Testimonial created successfully');
      }

      setIsTestimonialDialogOpen(false);
      setSelectedItem(null);
      fetchAllContent();
    } catch (error) {
      console.error('Error saving testimonial:', error);
      toast.error('Failed to save testimonial');
    }
  };

  const handleImageSubmit = async (formData) => {
    try {
      if (selectedItem) {
        // Update existing image
        const { error } = await supabase
          .from('content_images')
          .update(formData)
          .eq('id', selectedItem.id);

        if (error) throw error;
        toast.success('Image updated successfully');
      } else {
        // Create new image
        const { error } = await supabase
          .from('content_images')
          .insert([formData]);

        if (error) throw error;
        toast.success('Image created successfully');
      }

      setIsImageDialogOpen(false);
      setSelectedItem(null);
      fetchAllContent();
    } catch (error) {
      console.error('Error saving image:', error);
      toast.error('Failed to save image');
    }
  };

  const handleDelete = async (table, id) => {
    if (!confirm('Are you sure you want to delete this item?')) return;

    try {
      const { error } = await supabase
        .from(table)
        .delete()
        .eq('id', id);

      if (error) throw error;
      toast.success('Item deleted successfully');
      fetchAllContent();
    } catch (error) {
      console.error('Error deleting item:', error);
      toast.error('Failed to delete item');
    }
  };

  const openDialog = (type, item = null) => {
    setSelectedItem(item);
    setSelectedDialogType(type);
    
    switch (type) {
      case 'content':
        setIsContentDialogOpen(true);
        break;
      case 'testimonial':
        setIsTestimonialDialogOpen(true);
        break;
      case 'image':
        setIsImageDialogOpen(true);
        break;
    }
  };

  if (loading) {
    return <div className="p-6 text-center">Loading homepage content...</div>;
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold">Homepage Content Management</h2>
        <div className="text-sm text-muted-foreground">
          Manage all editable content displayed on the homepage
        </div>
      </div>

      <Tabs defaultValue="content" className="space-y-6">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="content">Text Content</TabsTrigger>
          <TabsTrigger value="testimonials">Testimonials</TabsTrigger>
          <TabsTrigger value="images">Process Images</TabsTrigger>
          <TabsTrigger value="preview">Preview</TabsTrigger>
        </TabsList>

        <TabsContent value="content" className="space-y-4">
          <div className="flex justify-between items-center">
            <h3 className="text-lg font-semibold">Text Content ({homepageContent.length})</h3>
            <Dialog open={isContentDialogOpen} onOpenChange={setIsContentDialogOpen}>
              <DialogTrigger asChild>
                <Button 
                  onClick={() => openDialog('content')}
                  className="flex items-center gap-2"
                >
                  <Plus className="h-4 w-4" />
                  Add Content
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>
                    {selectedItem ? 'Edit Content' : 'Add New Content'}
                  </DialogTitle>
                </DialogHeader>
                <ContentForm 
                  item={selectedItem} 
                  onSubmit={handleContentSubmit}
                />
              </DialogContent>
            </Dialog>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {homepageContent.map((content) => (
              <Card key={content.id}>
                <CardHeader className="pb-2">
                  <div className="flex justify-between items-start">
                    <CardTitle className="text-sm">{content.section_key}</CardTitle>
                    <div className="flex gap-1">
                      <Button 
                        size="sm" 
                        variant="outline"
                        onClick={() => openDialog('content', content)}
                      >
                        <Edit className="h-3 w-3" />
                      </Button>
                      <Button 
                        size="sm" 
                        variant="destructive"
                        onClick={() => handleDelete('homepage_content', content.id)}
                      >
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="pt-0">
                  <p className="text-xs text-muted-foreground mb-2">
                    {content.content_text.length > 100 
                      ? `${content.content_text.substring(0, 100)}...` 
                      : content.content_text}
                  </p>
                  <div className="flex gap-1">
                    <Badge variant={content.is_active ? 'default' : 'secondary'} className="text-xs">
                      {content.is_active ? 'Active' : 'Inactive'}
                    </Badge>
                    <Badge variant="outline" className="text-xs">
                      {content.content_type}
                    </Badge>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="testimonials" className="space-y-4">
          <div className="flex justify-between items-center">
            <h3 className="text-lg font-semibold">Customer Testimonials ({testimonials.length})</h3>
            <Dialog open={isTestimonialDialogOpen} onOpenChange={setIsTestimonialDialogOpen}>
              <DialogTrigger asChild>
                <Button 
                  onClick={() => openDialog('testimonial')}
                  className="flex items-center gap-2"
                >
                  <Plus className="h-4 w-4" />
                  Add Testimonial
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>
                    {selectedItem ? 'Edit Testimonial' : 'Add New Testimonial'}
                  </DialogTitle>
                </DialogHeader>
                <TestimonialForm 
                  item={selectedItem} 
                  onSubmit={handleTestimonialSubmit}
                />
              </DialogContent>
            </Dialog>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {testimonials.map((testimonial) => (
              <Card key={testimonial.id}>
                <CardHeader className="pb-2">
                  <div className="flex justify-between items-start">
                    <div className="flex items-center gap-2">
                      <img 
                        src={testimonial.image_url || "https://images.unsplash.com/photo-1649972904349-6e44c42644a7?w=80&h=80&fit=crop&crop=face"}
                        alt={testimonial.customer_name}
                        className="w-8 h-8 rounded-full"
                      />
                      <CardTitle className="text-sm">{testimonial.customer_initial}</CardTitle>
                    </div>
                    <div className="flex gap-1">
                      <Button 
                        size="sm" 
                        variant="outline"
                        onClick={() => openDialog('testimonial', testimonial)}
                      >
                        <Edit className="h-3 w-3" />
                      </Button>
                      <Button 
                        size="sm" 
                        variant="destructive"
                        onClick={() => handleDelete('customer_testimonials', testimonial.id)}
                      >
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="pt-0">
                  <p className="text-xs text-muted-foreground mb-2">
                    "{testimonial.testimonial_text}"
                  </p>
                  <Badge variant={testimonial.is_featured ? 'default' : 'secondary'} className="text-xs">
                    {testimonial.is_featured ? 'Featured' : 'Hidden'}
                  </Badge>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="images" className="space-y-4">
          <div className="flex justify-between items-center">
            <h3 className="text-lg font-semibold">Process Images ({contentImages.length})</h3>
            <Dialog open={isImageDialogOpen} onOpenChange={setIsImageDialogOpen}>
              <DialogTrigger asChild>
                <Button 
                  onClick={() => openDialog('image')}
                  className="flex items-center gap-2"
                >
                  <Plus className="h-4 w-4" />
                  Add Image
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-2xl">
                <DialogHeader>
                  <DialogTitle>
                    {selectedItem ? 'Edit Image' : 'Add New Image'}
                  </DialogTitle>
                </DialogHeader>
                <ImageForm 
                  item={selectedItem} 
                  onSubmit={handleImageSubmit}
                />
              </DialogContent>
            </Dialog>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {contentImages.map((image) => (
              <Card key={image.id}>
                <div className="relative">
                  <img 
                    src={image.image_url}
                    alt={image.alt_text || image.title}
                    className="w-full h-32 object-cover rounded-t-lg"
                  />
                  <Badge className="absolute top-2 right-2 text-xs" variant="secondary">
                    {image.section}
                  </Badge>
                </div>
                <CardHeader className="pb-2">
                  <div className="flex justify-between items-start">
                    <CardTitle className="text-sm">{image.title}</CardTitle>
                    <div className="flex gap-1">
                      <Button 
                        size="sm" 
                        variant="outline"
                        onClick={() => openDialog('image', image)}
                      >
                        <Edit className="h-3 w-3" />
                      </Button>
                      <Button 
                        size="sm" 
                        variant="destructive"
                        onClick={() => handleDelete('content_images', image.id)}
                      >
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="pt-0">
                  <p className="text-xs text-muted-foreground mb-2">
                    {image.description}
                  </p>
                  <Badge variant={image.is_active ? 'default' : 'secondary'} className="text-xs">
                    {image.is_active ? 'Active' : 'Inactive'}
                  </Badge>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="preview" className="space-y-4">
          <div className="text-center">
            <h3 className="text-lg font-semibold mb-4">Content Preview</h3>
            <p className="text-muted-foreground mb-6">
              View how your content appears on the homepage. Changes are reflected in real-time.
            </p>
            <Button onClick={() => window.open('/', '_blank')}>
              Open Homepage Preview
            </Button>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}

function ContentForm({ item, onSubmit }) {
  const [formData, setFormData] = useState({
    section_key: item?.section_key || '',
    content_text: item?.content_text || '',
    content_type: item?.content_type || 'text',
    is_active: item?.is_active ?? true,
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    onSubmit(formData);
  };

  const commonSectionKeys = [
    'hero_title', 'hero_subtitle', 'trust_hero_title',
    'services_title', 'services_subtitle', 'team_title', 'team_subtitle',
    'how_it_works_title', 'how_it_works_subtitle'
  ];

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <Label htmlFor="section_key">Section Key</Label>
        <Select
          value={formData.section_key}
          onValueChange={(value) => setFormData(prev => ({ ...prev, section_key: value }))}
        >
          <SelectTrigger>
            <SelectValue placeholder="Select or type section key" />
          </SelectTrigger>
          <SelectContent>
            {commonSectionKeys.map((key) => (
              <SelectItem key={key} value={key}>{key}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Input
          className="mt-2"
          placeholder="Or type custom section key"
          value={formData.section_key}
          onChange={(e) => setFormData(prev => ({ ...prev, section_key: e.target.value }))}
        />
      </div>

      <div>
        <Label htmlFor="content_text">Content Text</Label>
        <Textarea
          id="content_text"
          value={formData.content_text}
          onChange={(e) => setFormData(prev => ({ ...prev, content_text: e.target.value }))}
          rows={4}
          required
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label htmlFor="content_type">Content Type</Label>
          <Select
            value={formData.content_type}
            onValueChange={(value) => setFormData(prev => ({ ...prev, content_type: value }))}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="text">Text</SelectItem>
              <SelectItem value="html">HTML</SelectItem>
              <SelectItem value="markdown">Markdown</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="flex items-end">
          <div className="flex items-center space-x-2">
            <Switch
              id="is_active"
              checked={formData.is_active}
              onCheckedChange={(checked) => setFormData(prev => ({ ...prev, is_active: checked }))}
            />
            <Label htmlFor="is_active">Active</Label>
          </div>
        </div>
      </div>

      <Button type="submit" className="w-full">
        {item ? 'Update Content' : 'Create Content'}
      </Button>
    </form>
  );
}

function TestimonialForm({ item, onSubmit }) {
  const [formData, setFormData] = useState({
    customer_name: item?.customer_name || '',
    customer_initial: item?.customer_initial || '',
    image_url: item?.image_url || '',
    testimonial_text: item?.testimonial_text || '',
    is_featured: item?.is_featured ?? true,
    display_order: item?.display_order || 0,
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    onSubmit(formData);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label htmlFor="customer_name">Customer Name</Label>
          <Input
            id="customer_name"
            value={formData.customer_name}
            onChange={(e) => setFormData(prev => ({ ...prev, customer_name: e.target.value }))}
            required
          />
        </div>
        <div>
          <Label htmlFor="customer_initial">Customer Initial</Label>
          <Input
            id="customer_initial"
            value={formData.customer_initial}
            onChange={(e) => setFormData(prev => ({ ...prev, customer_initial: e.target.value }))}
            placeholder="e.g., Sarah M."
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

      <div>
        <Label htmlFor="testimonial_text">Testimonial Text</Label>
        <Textarea
          id="testimonial_text"
          value={formData.testimonial_text}
          onChange={(e) => setFormData(prev => ({ ...prev, testimonial_text: e.target.value }))}
          rows={3}
          required
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
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
        <div className="flex items-end">
          <div className="flex items-center space-x-2">
            <Switch
              id="is_featured"
              checked={formData.is_featured}
              onCheckedChange={(checked) => setFormData(prev => ({ ...prev, is_featured: checked }))}
            />
            <Label htmlFor="is_featured">Featured</Label>
          </div>
        </div>
      </div>

      <Button type="submit" className="w-full">
        {item ? 'Update Testimonial' : 'Create Testimonial'}
      </Button>
    </form>
  );
}

function ImageForm({ item, onSubmit }) {
  const [formData, setFormData] = useState({
    section: item?.section || '',
    title: item?.title || '',
    description: item?.description || '',
    image_url: item?.image_url || '',
    alt_text: item?.alt_text || '',
    display_order: item?.display_order || 0,
    is_active: item?.is_active ?? true,
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    onSubmit(formData);
  };

  const imageSections = [
    'how_it_works_locker',
    'how_it_works_pickup',
    'services_team',
    'hero_background',
    'trust_process'
  ];

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label htmlFor="section">Section</Label>
          <Select
            value={formData.section}
            onValueChange={(value) => setFormData(prev => ({ ...prev, section: value }))}
          >
            <SelectTrigger>
              <SelectValue placeholder="Select section" />
            </SelectTrigger>
            <SelectContent>
              {imageSections.map((section) => (
                <SelectItem key={section} value={section}>{section}</SelectItem>
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
        <Label htmlFor="description">Description</Label>
        <Textarea
          id="description"
          value={formData.description}
          onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
          rows={2}
        />
      </div>

      <div>
        <Label htmlFor="image_url">Image URL</Label>
        <Input
          id="image_url"
          value={formData.image_url}
          onChange={(e) => setFormData(prev => ({ ...prev, image_url: e.target.value }))}
          placeholder="https://..."
          required
        />
      </div>

      <div>
        <Label htmlFor="alt_text">Alt Text</Label>
        <Input
          id="alt_text"
          value={formData.alt_text}
          onChange={(e) => setFormData(prev => ({ ...prev, alt_text: e.target.value }))}
          placeholder="Descriptive text for accessibility"
        />
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
        {item ? 'Update Image' : 'Create Image'}
      </Button>
    </form>
  );
}