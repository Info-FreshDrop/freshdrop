import { useState, useEffect, useRef } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { ArrowLeft, Upload, Folder, Image, Video, FileText, Search, Grid, List, Plus, Edit, Trash2, Download, Eye, Tag } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";

interface MediaLibraryProps {
  onBack: () => void;
}

interface ContentItem {
  id: string;
  user_id: string;
  file_name: string;
  file_path: string;
  file_type: string;
  file_size: number;
  mime_type: string;
  title: string | null;
  description: string | null;
  category: string;
  folder_path: string;
  tags: string[];
  is_active: boolean;
  created_at: string;
  updated_at: string;
  url?: string;
}

const CATEGORIES = [
  { value: 'social-media', label: 'Social Media', icon: '📱' },
  { value: 'email-campaigns', label: 'Email Campaigns', icon: '✉️' },
  { value: 'print-materials', label: 'Print Materials', icon: '🖨️' },
  { value: 'videos', label: 'Videos', icon: '🎥' },
  { value: 'presentations', label: 'Presentations', icon: '📊' },
  { value: 'logos-branding', label: 'Logos & Branding', icon: '🎨' },
  { value: 'general', label: 'General', icon: '📄' }
];

export function MediaLibrary({ onBack }: MediaLibraryProps) {
  const [contentItems, setContentItems] = useState<ContentItem[]>([]);
  const [filteredItems, setFilteredItems] = useState<ContentItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [showUploadDialog, setShowUploadDialog] = useState(false);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [editingItem, setEditingItem] = useState<ContentItem | null>(null);
  const [selectedFolder, setSelectedFolder] = useState<string>('all-folders');
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { user } = useAuth();
  const { toast } = useToast();

  const [uploadForm, setUploadForm] = useState({
    files: [] as File[],
    title: '',
    description: '',
    category: 'general',
    folder_path: '',
    tags: [] as string[]
  });

  useEffect(() => {
    loadContentItems();
  }, []);

  useEffect(() => {
    filterItems();
  }, [contentItems, selectedCategory, searchQuery, selectedFolder]);

  const loadContentItems = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('content_library')
        .select('*')
        .eq('is_active', true)
        .order('created_at', { ascending: false });

      if (error) throw error;

      // Generate public URLs for each item
      const itemsWithUrls = await Promise.all(
        (data || []).map(async (item) => {
          const { data: urlData } = supabase.storage
            .from('marketing-content')
            .getPublicUrl(item.file_path);
          
          return {
            ...item,
            url: urlData.publicUrl
          };
        })
      );

      setContentItems(itemsWithUrls);
    } catch (error) {
      console.error('Error loading content:', error);
      toast({
        title: "Error",
        description: "Failed to load content library",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const filterItems = () => {
    let filtered = contentItems;

    if (selectedCategory !== 'all') {
      filtered = filtered.filter(item => item.category === selectedCategory);
    }

    if (selectedFolder && selectedFolder !== 'all-folders') {
      filtered = filtered.filter(item => item.folder_path.startsWith(selectedFolder));
    }

    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(item => 
        item.title?.toLowerCase().includes(query) ||
        item.file_name.toLowerCase().includes(query) ||
        item.description?.toLowerCase().includes(query) ||
        item.tags.some(tag => tag.toLowerCase().includes(query))
      );
    }

    setFilteredItems(filtered);
  };

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (files) {
      setUploadForm(prev => ({ ...prev, files: Array.from(files) }));
      setShowUploadDialog(true);
    }
  };

  const handleUpload = async () => {
    if (!user || uploadForm.files.length === 0) return;

    try {
      setUploading(true);
      const uploadPromises = uploadForm.files.map(async (file) => {
        const fileExt = file.name.split('.').pop();
        const fileName = `${user.id}/${Date.now()}-${Math.random().toString(36).substring(2)}.${fileExt}`;
        const filePath = uploadForm.folder_path ? `${uploadForm.folder_path}/${fileName}` : fileName;

        // Upload file to storage
        const { error: uploadError } = await supabase.storage
          .from('marketing-content')
          .upload(filePath, file);

        if (uploadError) throw uploadError;

        // Save metadata to database
        const { error: dbError } = await supabase
          .from('content_library')
          .insert({
            user_id: user.id,
            file_name: file.name,
            file_path: filePath,
            file_type: file.type.split('/')[0], // 'image', 'video', etc.
            file_size: file.size,
            mime_type: file.type,
            title: uploadForm.title || file.name,
            description: uploadForm.description || null,
            category: uploadForm.category,
            folder_path: uploadForm.folder_path,
            tags: uploadForm.tags
          });

        if (dbError) throw dbError;
      });

      await Promise.all(uploadPromises);

      toast({
        title: "Success",
        description: `${uploadForm.files.length} file(s) uploaded successfully`
      });

      setUploadForm({
        files: [],
        title: '',
        description: '',
        category: 'general',
        folder_path: '',
        tags: []
      });
      setShowUploadDialog(false);
      loadContentItems();
    } catch (error) {
      console.error('Error uploading files:', error);
      toast({
        title: "Error",
        description: "Failed to upload files",
        variant: "destructive"
      });
    } finally {
      setUploading(false);
    }
  };

  const handleEdit = (item: ContentItem) => {
    setEditingItem(item);
    setShowEditDialog(true);
  };

  const handleUpdateItem = async () => {
    if (!editingItem) return;

    try {
      const { error } = await supabase
        .from('content_library')
        .update({
          title: editingItem.title,
          description: editingItem.description,
          category: editingItem.category,
          folder_path: editingItem.folder_path,
          tags: editingItem.tags
        })
        .eq('id', editingItem.id);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Content updated successfully"
      });

      setShowEditDialog(false);
      setEditingItem(null);
      loadContentItems();
    } catch (error) {
      console.error('Error updating content:', error);
      toast({
        title: "Error",
        description: "Failed to update content",
        variant: "destructive"
      });
    }
  };

  const handleDelete = async (item: ContentItem) => {
    if (!confirm('Are you sure you want to delete this item?')) return;

    try {
      // Delete from storage
      const { error: storageError } = await supabase.storage
        .from('marketing-content')
        .remove([item.file_path]);

      if (storageError) throw storageError;

      // Delete from database
      const { error: dbError } = await supabase
        .from('content_library')
        .delete()
        .eq('id', item.id);

      if (dbError) throw dbError;

      toast({
        title: "Success",
        description: "Content deleted successfully"
      });

      loadContentItems();
    } catch (error) {
      console.error('Error deleting content:', error);
      toast({
        title: "Error",
        description: "Failed to delete content",
        variant: "destructive"
      });
    }
  };

  const getFileIcon = (fileType: string, mimeType: string) => {
    if (fileType === 'image') return <Image className="h-4 w-4" />;
    if (fileType === 'video') return <Video className="h-4 w-4" />;
    if (mimeType.includes('pdf')) return <FileText className="h-4 w-4" />;
    return <FileText className="h-4 w-4" />;
  };

  const formatFileSize = (bytes: number) => {
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    if (bytes === 0) return '0 Bytes';
    const i = Math.floor(Math.log(bytes) / Math.log(1024));
    return Math.round(bytes / Math.pow(1024, i) * 100) / 100 + ' ' + sizes[i];
  };

  const getUniqueFolders = () => {
    const folders = new Set<string>();
    contentItems.forEach(item => {
      if (item.folder_path) {
        const parts = item.folder_path.split('/');
        for (let i = 1; i <= parts.length; i++) {
          folders.add(parts.slice(0, i).join('/'));
        }
      }
    });
    return Array.from(folders).sort();
  };

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
              Back to Content Calendar
            </Button>
            <h1 className="text-3xl font-bold bg-gradient-primary bg-clip-text text-transparent">
              Media Library
            </h1>
            <p className="text-muted-foreground">
              Store, organize and manage your marketing content
            </p>
          </div>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setViewMode(viewMode === 'grid' ? 'list' : 'grid')}
            >
              {viewMode === 'grid' ? <List className="h-4 w-4" /> : <Grid className="h-4 w-4" />}
            </Button>
            <Button onClick={() => fileInputRef.current?.click()}>
              <Upload className="h-4 w-4 mr-2" />
              Upload Content
            </Button>
            <input
              ref={fileInputRef}
              type="file"
              multiple
              accept="image/*,video/*,.pdf,.doc,.docx,.ppt,.pptx"
              onChange={handleFileSelect}
              className="hidden"
            />
          </div>
        </div>

        {/* Filters */}
        <div className="flex flex-wrap gap-4 mb-6">
          <div className="flex-1 min-w-64">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search content..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>
          <Select value={selectedCategory} onValueChange={setSelectedCategory}>
            <SelectTrigger className="w-48">
              <SelectValue placeholder="All Categories" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Categories</SelectItem>
              {CATEGORIES.map((cat) => (
                <SelectItem key={cat.value} value={cat.value}>
                  {cat.icon} {cat.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={selectedFolder} onValueChange={setSelectedFolder}>
            <SelectTrigger className="w-48">
              <SelectValue placeholder="All Folders" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all-folders">All Folders</SelectItem>
              {getUniqueFolders().map((folder) => (
                <SelectItem key={folder} value={folder}>
                  <Folder className="h-4 w-4 mr-2 inline" />
                  {folder}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Content Grid/List */}
        {loading ? (
          <div className="text-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
            <p className="text-sm text-muted-foreground mt-2">Loading content...</p>
          </div>
        ) : filteredItems.length === 0 ? (
          <Card className="border-0 shadow-soft">
            <CardContent className="p-8 text-center">
              <Upload className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <h3 className="text-lg font-medium mb-2">No content found</h3>
              <p className="text-muted-foreground mb-4">Upload your first marketing materials to get started</p>
              <Button onClick={() => fileInputRef.current?.click()}>
                <Upload className="h-4 w-4 mr-2" />
                Upload Content
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className={viewMode === 'grid' ? 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6' : 'space-y-4'}>
            {filteredItems.map((item) => (
              <Card key={item.id} className="border-0 shadow-soft hover:shadow-lg transition-shadow">
                {viewMode === 'grid' ? (
                  <>
                    <div className="aspect-video bg-muted rounded-t-lg relative overflow-hidden">
                      {item.file_type === 'image' ? (
                        <img 
                          src={item.url} 
                          alt={item.title || item.file_name}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center">
                          {getFileIcon(item.file_type, item.mime_type)}
                          <span className="ml-2 text-sm font-medium">{item.file_type.toUpperCase()}</span>
                        </div>
                      )}
                      <div className="absolute top-2 right-2 flex gap-1">
                        <Button size="sm" variant="secondary" onClick={() => handleEdit(item)}>
                          <Edit className="h-3 w-3" />
                        </Button>
                        <Button size="sm" variant="destructive" onClick={() => handleDelete(item)}>
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      </div>
                    </div>
                    <CardContent className="p-4">
                      <div className="flex items-center gap-2 mb-2">
                        {getFileIcon(item.file_type, item.mime_type)}
                        <Badge variant="outline" className="text-xs">
                          {CATEGORIES.find(c => c.value === item.category)?.label || item.category}
                        </Badge>
                      </div>
                      <h4 className="font-medium text-sm mb-1 truncate">{item.title || item.file_name}</h4>
                      <p className="text-xs text-muted-foreground mb-2 line-clamp-2">{item.description}</p>
                      <div className="flex justify-between items-center text-xs text-muted-foreground">
                        <span>{formatFileSize(item.file_size)}</span>
                        <span>{format(new Date(item.created_at), 'MMM d')}</span>
                      </div>
                      {item.tags.length > 0 && (
                        <div className="flex flex-wrap gap-1 mt-2">
                          {item.tags.slice(0, 3).map((tag, index) => (
                            <Badge key={index} variant="secondary" className="text-xs">
                              {tag}
                            </Badge>
                          ))}
                          {item.tags.length > 3 && (
                            <Badge variant="secondary" className="text-xs">
                              +{item.tags.length - 3}
                            </Badge>
                          )}
                        </div>
                      )}
                    </CardContent>
                  </>
                ) : (
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-4 flex-1">
                        {getFileIcon(item.file_type, item.mime_type)}
                        <div className="flex-1 min-w-0">
                          <h4 className="font-medium truncate">{item.title || item.file_name}</h4>
                          <div className="flex items-center gap-4 text-sm text-muted-foreground">
                            <span>{CATEGORIES.find(c => c.value === item.category)?.label}</span>
                            <span>{formatFileSize(item.file_size)}</span>
                            <span>{format(new Date(item.created_at), 'MMM d, yyyy')}</span>
                          </div>
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <Button size="sm" variant="outline" onClick={() => window.open(item.url, '_blank')}>
                          <Eye className="h-4 w-4" />
                        </Button>
                        <Button size="sm" variant="outline" onClick={() => handleEdit(item)}>
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button size="sm" variant="destructive" onClick={() => handleDelete(item)}>
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                )}
              </Card>
            ))}
          </div>
        )}

        {/* Upload Dialog */}
        <Dialog open={showUploadDialog} onOpenChange={setShowUploadDialog}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Upload Content</DialogTitle>
              <DialogDescription>
                Add new marketing materials to your library
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label>Files Selected</Label>
                <p className="text-sm text-muted-foreground">
                  {uploadForm.files.length} file(s) selected
                </p>
              </div>
              <div>
                <Label htmlFor="title">Title (Optional)</Label>
                <Input
                  id="title"
                  value={uploadForm.title}
                  onChange={(e) => setUploadForm(prev => ({ ...prev, title: e.target.value }))}
                  placeholder="Enter title..."
                />
              </div>
              <div>
                <Label htmlFor="description">Description (Optional)</Label>
                <Textarea
                  id="description"
                  value={uploadForm.description}
                  onChange={(e) => setUploadForm(prev => ({ ...prev, description: e.target.value }))}
                  placeholder="Enter description..."
                  rows={2}
                />
              </div>
              <div>
                <Label htmlFor="category">Category</Label>
                <Select value={uploadForm.category} onValueChange={(value) => setUploadForm(prev => ({ ...prev, category: value }))}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {CATEGORIES.map((cat) => (
                      <SelectItem key={cat.value} value={cat.value}>
                        {cat.icon} {cat.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="folder">Folder Path (Optional)</Label>
                <Input
                  id="folder"
                  value={uploadForm.folder_path}
                  onChange={(e) => setUploadForm(prev => ({ ...prev, folder_path: e.target.value }))}
                  placeholder="e.g., campaigns/2024/holiday"
                />
              </div>
              <div className="flex gap-2">
                <Button onClick={handleUpload} disabled={uploading}>
                  {uploading ? 'Uploading...' : 'Upload'}
                </Button>
                <Button variant="outline" onClick={() => setShowUploadDialog(false)}>
                  Cancel
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>

        {/* Edit Dialog */}
        <Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Edit Content</DialogTitle>
              <DialogDescription>
                Update content details and organization
              </DialogDescription>
            </DialogHeader>
            {editingItem && (
              <div className="space-y-4">
                <div>
                  <Label htmlFor="edit-title">Title</Label>
                  <Input
                    id="edit-title"
                    value={editingItem.title || ''}
                    onChange={(e) => setEditingItem(prev => prev ? { ...prev, title: e.target.value } : null)}
                  />
                </div>
                <div>
                  <Label htmlFor="edit-description">Description</Label>
                  <Textarea
                    id="edit-description"
                    value={editingItem.description || ''}
                    onChange={(e) => setEditingItem(prev => prev ? { ...prev, description: e.target.value } : null)}
                    rows={2}
                  />
                </div>
                <div>
                  <Label htmlFor="edit-category">Category</Label>
                  <Select value={editingItem.category} onValueChange={(value) => setEditingItem(prev => prev ? { ...prev, category: value } : null)}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {CATEGORIES.map((cat) => (
                        <SelectItem key={cat.value} value={cat.value}>
                          {cat.icon} {cat.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="edit-folder">Folder Path</Label>
                  <Input
                    id="edit-folder"
                    value={editingItem.folder_path || ''}
                    onChange={(e) => setEditingItem(prev => prev ? { ...prev, folder_path: e.target.value } : null)}
                  />
                </div>
                <div className="flex gap-2">
                  <Button onClick={handleUpdateItem}>Update</Button>
                  <Button variant="outline" onClick={() => setShowEditDialog(false)}>Cancel</Button>
                </div>
              </div>
            )}
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}