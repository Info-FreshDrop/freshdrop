import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { MediaLibrary } from "@/components/admin/MediaLibrary";
import { ArrowLeft, Calendar as CalendarIcon, Plus, Clock, FileText, Image, Folder } from "lucide-react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";

interface ContentCalendarProps {
  onBack: () => void;
  initialView?: 'calendar' | 'schedule' | 'library' | 'media-library';
}

interface ContentItem {
  id: string;
  title: string;
  content: string;
  type: 'email' | 'social' | 'blog' | 'promotion';
  status: 'draft' | 'scheduled' | 'published';
  scheduledDate: Date | null;
  createdAt: Date;
}

export function ContentCalendarManagement({ onBack, initialView = 'calendar' }: ContentCalendarProps) {
  const [currentView, setCurrentView] = useState<'calendar' | 'schedule' | 'library' | 'media-library'>(initialView);
  const [contentItems, setContentItems] = useState<ContentItem[]>([]);
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(new Date());
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [formData, setFormData] = useState({
    title: '',
    content: '',
    type: 'email' as 'email' | 'social' | 'blog' | 'promotion',
    scheduledDate: null as Date | null
  });
  const { toast } = useToast();

  useEffect(() => {
    // Load content items from local storage or API
    loadContentItems();
  }, []);

  const loadContentItems = () => {
    // For now, using mock data. In a real app, this would fetch from the database
    const mockItems: ContentItem[] = [
      {
        id: '1',
        title: 'Welcome New Customers Email',
        content: 'Welcome to FreshDrop! Here\'s how to get started...',
        type: 'email',
        status: 'scheduled',
        scheduledDate: new Date(2024, 11, 15),
        createdAt: new Date(2024, 11, 1)
      },
      {
        id: '2',
        title: 'Holiday Promotion Social Post',
        content: '🎄 Holiday Special: 30% off all laundry services!',
        type: 'social',
        status: 'draft',
        scheduledDate: null,
        createdAt: new Date(2024, 11, 2)
      }
    ];
    setContentItems(mockItems);
  };

  const handleInputChange = (field: string, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleCreateContent = () => {
    if (!formData.title.trim() || !formData.content.trim()) {
      toast({
        title: "Error",
        description: "Title and content are required",
        variant: "destructive"
      });
      return;
    }

    const newItem: ContentItem = {
      id: Date.now().toString(),
      title: formData.title,
      content: formData.content,
      type: formData.type,
      status: formData.scheduledDate ? 'scheduled' : 'draft',
      scheduledDate: formData.scheduledDate,
      createdAt: new Date()
    };

    setContentItems(prev => [...prev, newItem]);
    setFormData({ title: '', content: '', type: 'email', scheduledDate: null });
    setShowCreateForm(false);

    toast({
      title: "Success",
      description: "Content item created successfully"
    });
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'published': return 'default';
      case 'scheduled': return 'secondary';
      case 'draft': return 'outline';
      default: return 'outline';
    }
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'email': return '✉️';
      case 'social': return '📱';
      case 'blog': return '📝';
      case 'promotion': return '🎉';
      default: return '📄';
    }
  };

  // Media Library View
  if (currentView === 'media-library') {
    return <MediaLibrary onBack={() => setCurrentView('calendar')} />;
  }

  // Calendar View
  if (currentView === 'calendar') {
    const scheduledItems = contentItems.filter(item => item.scheduledDate);
    
    return (
      <div className="min-h-screen bg-gradient-wave">
        <div className="container mx-auto px-4 py-8">
          <div className="flex justify-between items-center mb-8">
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
                Content Calendar
              </h1>
              <p className="text-muted-foreground">
                View and manage your scheduled content
              </p>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => setCurrentView('media-library')}>
                <Folder className="h-4 w-4 mr-2" />
                Media Library
              </Button>
              <Button variant="outline" onClick={() => setCurrentView('schedule')}>
                Schedule Content
              </Button>
              <Button variant="outline" onClick={() => setCurrentView('library')}>
                Content Library
              </Button>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <Card className="lg:col-span-2 border-0 shadow-soft">
              <CardHeader>
                <CardTitle>Calendar View</CardTitle>
                <CardDescription>Select a date to view scheduled content</CardDescription>
              </CardHeader>
              <CardContent>
                <Calendar
                  mode="single"
                  selected={selectedDate}
                  onSelect={setSelectedDate}
                  className={cn("rounded-md border p-3 pointer-events-auto")}
                />
              </CardContent>
            </Card>

            <Card className="border-0 shadow-soft">
              <CardHeader>
                <CardTitle>
                  Scheduled for {selectedDate ? format(selectedDate, "PPP") : "Today"}
                </CardTitle>
              </CardHeader>
              <CardContent>
                {scheduledItems.filter(item => 
                  selectedDate && item.scheduledDate && 
                  format(item.scheduledDate, "yyyy-MM-dd") === format(selectedDate, "yyyy-MM-dd")
                ).length === 0 ? (
                  <p className="text-sm text-muted-foreground">No content scheduled for this date</p>
                ) : (
                  <div className="space-y-3">
                    {scheduledItems
                      .filter(item => 
                        selectedDate && item.scheduledDate && 
                        format(item.scheduledDate, "yyyy-MM-dd") === format(selectedDate, "yyyy-MM-dd")
                      )
                      .map(item => (
                        <div key={item.id} className="p-3 border rounded-lg">
                          <div className="flex items-center gap-2 mb-2">
                            <span>{getTypeIcon(item.type)}</span>
                            <Badge variant={getStatusColor(item.status)}>{item.status}</Badge>
                          </div>
                          <h4 className="font-medium text-sm">{item.title}</h4>
                          <p className="text-xs text-muted-foreground truncate">{item.content}</p>
                        </div>
                      ))
                    }
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    );
  }

  // Schedule Content View
  if (currentView === 'schedule') {
    return (
      <div className="min-h-screen bg-gradient-wave">
        <div className="container mx-auto px-4 py-8">
          <div className="flex justify-between items-center mb-8">
            <div>
              <Button
                variant="ghost"
                onClick={() => setCurrentView('calendar')}
                className="p-0 h-auto text-muted-foreground hover:text-foreground mb-4"
              >
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back to Calendar
              </Button>
              <h1 className="text-3xl font-bold bg-gradient-primary bg-clip-text text-transparent">
                Schedule Content
              </h1>
              <p className="text-muted-foreground">
                Create and schedule new marketing content
              </p>
            </div>
            <Button onClick={() => setShowCreateForm(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Create Content
            </Button>
          </div>

          {showCreateForm && (
            <Card className="mb-6 border-0 shadow-soft">
              <CardHeader>
                <CardTitle>Create New Content</CardTitle>
                <CardDescription>Add new content to your calendar</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label htmlFor="title">Title</Label>
                  <Input
                    id="title"
                    value={formData.title}
                    onChange={(e) => handleInputChange('title', e.target.value)}
                    placeholder="Enter content title"
                  />
                </div>

                <div>
                  <Label htmlFor="type">Content Type</Label>
                  <Select value={formData.type} onValueChange={(value) => handleInputChange('type', value)}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="email">Email Campaign</SelectItem>
                      <SelectItem value="social">Social Media</SelectItem>
                      <SelectItem value="blog">Blog Post</SelectItem>
                      <SelectItem value="promotion">Promotion</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label htmlFor="content">Content</Label>
                  <Textarea
                    id="content"
                    value={formData.content}
                    onChange={(e) => handleInputChange('content', e.target.value)}
                    placeholder="Enter your content here..."
                    rows={4}
                  />
                </div>

                <div>
                  <Label>Schedule Date (Optional)</Label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        className={cn(
                          "w-full justify-start text-left font-normal",
                          !formData.scheduledDate && "text-muted-foreground"
                        )}
                      >
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {formData.scheduledDate ? format(formData.scheduledDate, "PPP") : "Pick a date"}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar
                        mode="single"
                        selected={formData.scheduledDate}
                        onSelect={(date) => handleInputChange('scheduledDate', date)}
                        initialFocus
                        className={cn("p-3 pointer-events-auto")}
                      />
                    </PopoverContent>
                  </Popover>
                </div>

                <div className="flex gap-2">
                  <Button onClick={handleCreateContent}>Create Content</Button>
                  <Button variant="outline" onClick={() => setShowCreateForm(false)}>Cancel</Button>
                </div>
              </CardContent>
            </Card>
          )}

          <Card className="border-0 shadow-soft">
            <CardHeader>
              <CardTitle>Upcoming Content</CardTitle>
              <CardDescription>Content scheduled for the next 30 days</CardDescription>
            </CardHeader>
            <CardContent>
              {contentItems.filter(item => item.status === 'scheduled').length === 0 ? (
                <p className="text-center text-muted-foreground py-8">No scheduled content</p>
              ) : (
                <div className="space-y-4">
                  {contentItems
                    .filter(item => item.status === 'scheduled')
                    .sort((a, b) => (a.scheduledDate?.getTime() || 0) - (b.scheduledDate?.getTime() || 0))
                    .map(item => (
                      <div key={item.id} className="flex items-start gap-4 p-4 border rounded-lg">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-2">
                            <span>{getTypeIcon(item.type)}</span>
                            <Badge variant={getStatusColor(item.status)}>{item.status}</Badge>
                            <Badge variant="outline">{item.type}</Badge>
                          </div>
                          <h4 className="font-medium mb-1">{item.title}</h4>
                          <p className="text-sm text-muted-foreground mb-2">{item.content}</p>
                          <div className="flex items-center gap-2 text-xs text-muted-foreground">
                            <Clock className="h-3 w-3" />
                            Scheduled: {item.scheduledDate ? format(item.scheduledDate, "PPP") : 'Not scheduled'}
                          </div>
                        </div>
                      </div>
                    ))
                  }
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  // Content Library View
  return (
    <div className="min-h-screen bg-gradient-wave">
      <div className="container mx-auto px-4 py-8">
        <div className="flex justify-between items-center mb-8">
          <div>
            <Button
              variant="ghost"
              onClick={() => setCurrentView('calendar')}
              className="p-0 h-auto text-muted-foreground hover:text-foreground mb-4"
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Calendar
            </Button>
            <h1 className="text-3xl font-bold bg-gradient-primary bg-clip-text text-transparent">
              Content Library
            </h1>
            <p className="text-muted-foreground">
              Manage all your marketing content
            </p>
          </div>
        </div>

        <Card className="border-0 shadow-soft">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              All Content ({contentItems.length})
            </CardTitle>
            <CardDescription>Browse and manage your content library</CardDescription>
          </CardHeader>
          <CardContent>
            {contentItems.length === 0 ? (
              <div className="text-center py-8">
                <FileText className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                <h3 className="text-lg font-medium mb-2">No content yet</h3>
                <p className="text-muted-foreground mb-4">Create your first piece of content</p>
                <Button onClick={() => setCurrentView('schedule')}>
                  <Plus className="h-4 w-4 mr-2" />
                  Create Content
                </Button>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {contentItems.map(item => (
                  <div key={item.id} className="p-4 border rounded-lg hover:shadow-md transition-shadow">
                    <div className="flex items-center gap-2 mb-3">
                      <span className="text-lg">{getTypeIcon(item.type)}</span>
                      <Badge variant={getStatusColor(item.status)}>{item.status}</Badge>
                      <Badge variant="outline" className="text-xs">{item.type}</Badge>
                    </div>
                    <h4 className="font-medium mb-2">{item.title}</h4>
                    <p className="text-sm text-muted-foreground mb-3 line-clamp-2">{item.content}</p>
                    <div className="flex justify-between items-center text-xs text-muted-foreground">
                      <span>Created: {format(item.createdAt, "MMM d")}</span>
                      {item.scheduledDate && (
                        <span>Scheduled: {format(item.scheduledDate, "MMM d")}</span>
                      )}
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