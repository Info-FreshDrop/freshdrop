import { useState, useEffect, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Plus, Edit, Trash2, Save, Play, Image as ImageIcon, FileText, HelpCircle, MoveUp, MoveDown, Upload, Link, Video } from 'lucide-react';

interface OnboardingContentItem {
  id: string;
  section_type: string;
  title: string;
  content?: string | null;
  media_url?: string | null;
  display_order: number;
  is_active: boolean;
  quiz_data?: any; // Using any for JSON data
  created_at?: string;
  updated_at?: string;
}

export default function OnboardingContentManagement() {
  const [trainingContent, setTrainingContent] = useState<OnboardingContentItem[]>([]);
  const [quizQuestions, setQuizQuestions] = useState<OnboardingContentItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingItem, setEditingItem] = useState<OnboardingContentItem | null>(null);
  const [isAddingNew, setIsAddingNew] = useState(false);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [newItem, setNewItem] = useState<Partial<OnboardingContentItem>>({
    section_type: 'text',
    title: '',
    content: '',
    media_url: '',
    is_active: true,
    quiz_data: {
      question: '',
      options: ['', '', '', ''],
      correct_answer: 'a',
      explanation: ''
    }
  });

  useEffect(() => {
    loadContent();
  }, []);

  const loadContent = async () => {
    try {
      const { data } = await supabase
        .from('onboarding_content')
        .select('*')
        .order('display_order');

      if (data) {
        const training = data.filter(item => item.section_type !== 'quiz');
        const quiz = data.filter(item => item.section_type === 'quiz');
        setTrainingContent(training);
        setQuizQuestions(quiz);
      }
    } catch (error) {
      console.error('Error loading content:', error);
      toast.error('Failed to load onboarding content');
    } finally {
      setLoading(false);
    }
  };

  const saveItem = async (item: Partial<OnboardingContentItem>) => {
    try {
      if (item.id) {
        // Update existing
        const { error } = await supabase
          .from('onboarding_content')
          .update({
            title: item.title,
            content: item.content,
            media_url: item.media_url,
            is_active: item.is_active,
            quiz_data: item.quiz_data
          })
          .eq('id', item.id);

        if (error) throw error;
        toast.success('Content updated successfully');
      } else {
        // Create new
        const maxOrder = await getMaxDisplayOrder(item.section_type!);
        const { error } = await supabase
          .from('onboarding_content')
          .insert({
            section_type: item.section_type!,
            title: item.title!,
            content: item.content || null,
            media_url: item.media_url || null,
            display_order: maxOrder + 1,
            is_active: item.is_active!,
            quiz_data: item.quiz_data || null
          });

        if (error) throw error;
        toast.success('Content created successfully');
      }
      
      loadContent();
      setEditingItem(null);
      setIsAddingNew(false);
      resetNewItem();
    } catch (error) {
      console.error('Error saving content:', error);
      toast.error('Failed to save content');
    }
  };

  const getMaxDisplayOrder = async (sectionType: string) => {
    const { data } = await supabase
      .from('onboarding_content')
      .select('display_order')
      .eq('section_type', sectionType)
      .order('display_order', { ascending: false })
      .limit(1);
    
    return data && data.length > 0 ? data[0].display_order : 0;
  };

  const deleteItem = async (id: string) => {
    try {
      const { error } = await supabase
        .from('onboarding_content')
        .delete()
        .eq('id', id);

      if (error) throw error;
      toast.success('Content deleted successfully');
      loadContent();
    } catch (error) {
      console.error('Error deleting content:', error);
      toast.error('Failed to delete content');
    }
  };

  const moveItem = async (id: string, direction: 'up' | 'down') => {
    try {
      const currentItem = [...trainingContent, ...quizQuestions].find(item => item.id === id);
      if (!currentItem) return;

      const sameTypeItems = [...trainingContent, ...quizQuestions]
        .filter(item => item.section_type === currentItem.section_type)
        .sort((a, b) => a.display_order - b.display_order);

      const currentIndex = sameTypeItems.findIndex(item => item.id === id);
      const targetIndex = direction === 'up' ? currentIndex - 1 : currentIndex + 1;

      if (targetIndex < 0 || targetIndex >= sameTypeItems.length) return;

      const targetItem = sameTypeItems[targetIndex];

      // Swap display orders
      await supabase
        .from('onboarding_content')
        .update({ display_order: targetItem.display_order })
        .eq('id', currentItem.id);

      await supabase
        .from('onboarding_content')
        .update({ display_order: currentItem.display_order })
        .eq('id', targetItem.id);

      loadContent();
      toast.success('Content order updated');
    } catch (error) {
      console.error('Error moving content:', error);
      toast.error('Failed to reorder content');
    }
  };

  const resetNewItem = () => {
    setNewItem({
      section_type: 'text',
      title: '',
      content: '',
      media_url: '',
      is_active: true,
      quiz_data: {
        question: '',
        options: ['', '', '', ''],
        correct_answer: 'a',
        explanation: ''
      }
    });
  };

  const handleFileUpload = async (file: File, sectionType: string) => {
    try {
      setUploading(true);
      
      const fileExt = file.name.split('.').pop();
      const fileName = `${Math.random()}.${fileExt}`;
      const filePath = `training/${fileName}`;

      // Choose appropriate bucket based on file type
      const bucketName = sectionType === 'video' ? 'content-images' : 'content-images';

      const { error: uploadError } = await supabase.storage
        .from(bucketName)
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      const { data } = supabase.storage
        .from(bucketName)
        .getPublicUrl(filePath);

      setNewItem(prev => ({ ...prev, media_url: data.publicUrl }));
      toast.success('File uploaded successfully');
    } catch (error) {
      console.error('Error uploading file:', error);
      toast.error('Failed to upload file');
    } finally {
      setUploading(false);
    }
  };

  const isYouTubeUrl = (url: string) => {
    return url.includes('youtube.com/watch') || url.includes('youtu.be/');
  };

  const getYouTubeEmbedUrl = (url: string) => {
    if (url.includes('youtube.com/watch')) {
      const videoId = url.split('v=')[1]?.split('&')[0];
      return `https://www.youtube.com/embed/${videoId}`;
    } else if (url.includes('youtu.be/')) {
      const videoId = url.split('youtu.be/')[1]?.split('?')[0];
      return `https://www.youtube.com/embed/${videoId}`;
    }
    return url;
  };

  const ContentForm = ({ item, onSave, onCancel }: { 
    item: Partial<OnboardingContentItem>, 
    onSave: (item: Partial<OnboardingContentItem>) => void,
    onCancel: () => void 
  }) => (
    <Dialog open={true} onOpenChange={() => onCancel()}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {item.id ? 'Edit Content' : 'Add New Content'}
          </DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4">
          <div>
            <Label>Content Type</Label>
            <Select 
              value={item.section_type} 
              onValueChange={(value) => setNewItem(prev => ({ ...prev, section_type: value }))}
              disabled={!!item.id}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="text">Text Content</SelectItem>
                <SelectItem value="video">Video Content</SelectItem>
                <SelectItem value="image">Image Content</SelectItem>
                <SelectItem value="quiz">Quiz Question</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label>Title</Label>
            <Input
              value={item.title || ''}
              onChange={(e) => setNewItem(prev => ({ ...prev, title: e.target.value }))}
              placeholder="Content title"
            />
          </div>

          {item.section_type !== 'quiz' && (
            <>
              <div>
                <Label>Content</Label>
                <Textarea
                  value={item.content || ''}
                  onChange={(e) => setNewItem(prev => ({ ...prev, content: e.target.value }))}
                  placeholder="Training content text - you can include links using standard markdown format [Link Text](URL)"
                  rows={4}
                />
                <p className="text-xs text-muted-foreground mt-1">
                  You can add links using markdown format: [Link Text](https://example.com)
                </p>
              </div>

              {(item.section_type === 'video' || item.section_type === 'image') && (
                <div className="space-y-4">
                  <div>
                    <Label>Media URL or Upload File</Label>
                    <div className="flex gap-2">
                      <Input
                        value={item.media_url || ''}
                        onChange={(e) => setNewItem(prev => ({ ...prev, media_url: e.target.value }))}
                        placeholder={item.section_type === 'video' ? "YouTube URL, video file URL, or upload" : "Image URL or upload"}
                        className="flex-1"
                      />
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => fileInputRef.current?.click()}
                        disabled={uploading}
                      >
                        <Upload className="h-4 w-4 mr-2" />
                        {uploading ? 'Uploading...' : 'Upload'}
                      </Button>
                    </div>
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept={item.section_type === 'video' ? "video/*" : "image/*"}
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) {
                          handleFileUpload(file, item.section_type!);
                        }
                      }}
                      className="hidden"
                    />
                    <p className="text-xs text-muted-foreground mt-1">
                      {item.section_type === 'video' 
                        ? "Paste YouTube URL, video file URL, or upload a video file"
                        : "Paste image URL or upload an image file"
                      }
                    </p>
                  </div>

                  {/* Media Preview */}
                  {item.media_url && (
                    <div className="border rounded-lg p-4">
                      <Label className="text-sm font-medium">Preview:</Label>
                      {item.section_type === 'video' && (
                        <div className="mt-2">
                          {isYouTubeUrl(item.media_url) ? (
                            <iframe
                              src={getYouTubeEmbedUrl(item.media_url)}
                              width="100%"
                              height="200"
                              frameBorder="0"
                              allowFullScreen
                              className="rounded"
                            />
                          ) : (
                            <video
                              src={item.media_url}
                              controls
                              className="w-full max-h-48 rounded"
                            />
                          )}
                        </div>
                      )}
                      {item.section_type === 'image' && (
                        <img
                          src={item.media_url}
                          alt="Preview"
                          className="mt-2 max-h-48 w-auto rounded"
                        />
                      )}
                    </div>
                  )}
                </div>
              )}
            </>
          )}

          {item.section_type === 'quiz' && (
            <div className="space-y-4">
              <div>
                <Label>Question</Label>
                <Input
                  value={item.quiz_data?.question || ''}
                  onChange={(e) => setNewItem(prev => ({ 
                    ...prev, 
                    quiz_data: { ...prev.quiz_data!, question: e.target.value }
                  }))}
                  placeholder="Quiz question"
                />
              </div>

              <div>
                <Label>Answer Options</Label>
                {item.quiz_data?.options?.map((option, index) => (
                  <div key={index} className="flex items-center gap-2 mt-2">
                    <span className="w-6 text-sm font-medium">
                      {String.fromCharCode(97 + index).toUpperCase()}.
                    </span>
                    <Input
                      value={option}
                      onChange={(e) => {
                        const newOptions = [...(item.quiz_data?.options || [])];
                        newOptions[index] = e.target.value;
                        setNewItem(prev => ({ 
                          ...prev, 
                          quiz_data: { ...prev.quiz_data!, options: newOptions }
                        }));
                      }}
                      placeholder={`Option ${String.fromCharCode(97 + index).toUpperCase()}`}
                    />
                  </div>
                )) || []}
              </div>

              <div>
                <Label>Correct Answer</Label>
                <Select 
                  value={item.quiz_data?.correct_answer} 
                  onValueChange={(value) => setNewItem(prev => ({ 
                    ...prev, 
                    quiz_data: { ...prev.quiz_data!, correct_answer: value }
                  }))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="a">A</SelectItem>
                    <SelectItem value="b">B</SelectItem>
                    <SelectItem value="c">C</SelectItem>
                    <SelectItem value="d">D</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label>Explanation</Label>
                <Textarea
                  value={item.quiz_data?.explanation || ''}
                  onChange={(e) => setNewItem(prev => ({ 
                    ...prev, 
                    quiz_data: { ...prev.quiz_data!, explanation: e.target.value }
                  }))}
                  placeholder="Explanation for the correct answer"
                  rows={2}
                />
              </div>
            </div>
          )}

          <div className="flex items-center space-x-2">
            <Switch
              checked={item.is_active}
              onCheckedChange={(checked) => setNewItem(prev => ({ ...prev, is_active: checked }))}
            />
            <Label>Active</Label>
          </div>

          <div className="flex gap-2 pt-4">
            <Button onClick={() => onSave(item)} className="flex-1">
              <Save className="h-4 w-4 mr-2" />
              Save
            </Button>
            <Button variant="outline" onClick={onCancel}>
              Cancel
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );

  const ContentCard = ({ item, type }: { item: OnboardingContentItem, type: 'training' | 'quiz' }) => (
    <Card className={!item.is_active ? 'opacity-60' : ''}>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            {item.section_type === 'video' && <Play className="h-4 w-4" />}
            {item.section_type === 'image' && <ImageIcon className="h-4 w-4" />}
            {item.section_type === 'text' && <FileText className="h-4 w-4" />}
            {item.section_type === 'quiz' && <HelpCircle className="h-4 w-4" />}
            <CardTitle className="text-sm">{item.title}</CardTitle>
          </div>
          <div className="flex items-center gap-2">
            {!item.is_active && <Badge variant="secondary">Inactive</Badge>}
            <Button
              variant="ghost"
              size="sm"
              onClick={() => moveItem(item.id, 'up')}
            >
              <MoveUp className="h-3 w-3" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => moveItem(item.id, 'down')}
            >
              <MoveDown className="h-3 w-3" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setEditingItem(item)}
            >
              <Edit className="h-3 w-3" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => deleteItem(item.id)}
            >
              <Trash2 className="h-3 w-3" />
            </Button>
          </div>
        </div>
      </CardHeader>
      {(item.content || item.quiz_data || item.media_url) && (
        <CardContent className="pt-0">
          {item.content && <p className="text-sm text-muted-foreground">{item.content.substring(0, 100)}...</p>}
          {item.quiz_data && <p className="text-sm text-muted-foreground">{item.quiz_data.question}</p>}
          {item.media_url && (
            <div className="mt-2">
              {item.section_type === 'video' && (
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Video className="h-3 w-3" />
                  {isYouTubeUrl(item.media_url) ? 'YouTube Video' : 'Video File'}
                </div>
              )}
              {item.section_type === 'image' && (
                <img
                  src={item.media_url}
                  alt="Preview"
                  className="w-16 h-16 object-cover rounded"
                />
              )}
            </div>
          )}
        </CardContent>
      )}
    </Card>
  );

  if (loading) {
    return <div className="p-4">Loading onboarding content...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold">Operator Onboarding Content</h2>
        <Button onClick={() => setIsAddingNew(true)}>
          <Plus className="h-4 w-4 mr-2" />
          Add Content
        </Button>
      </div>

      <Tabs defaultValue="training" className="w-full">
        <TabsList>
          <TabsTrigger value="training">Training Materials ({trainingContent.length})</TabsTrigger>
          <TabsTrigger value="quiz">Quiz Questions ({quizQuestions.length})</TabsTrigger>
        </TabsList>

        <TabsContent value="training" className="space-y-4">
          <div className="grid gap-4">
            {trainingContent
              .sort((a, b) => a.display_order - b.display_order)
              .map((item) => (
                <ContentCard key={item.id} item={item} type="training" />
              ))}
            {trainingContent.length === 0 && (
              <p className="text-muted-foreground text-center py-8">
                No training materials yet. Add some content to get started.
              </p>
            )}
          </div>
        </TabsContent>

        <TabsContent value="quiz" className="space-y-4">
          <div className="grid gap-4">
            {quizQuestions
              .sort((a, b) => a.display_order - b.display_order)
              .map((item) => (
                <ContentCard key={item.id} item={item} type="quiz" />
              ))}
            {quizQuestions.length === 0 && (
              <p className="text-muted-foreground text-center py-8">
                No quiz questions yet. Add some questions to test operator knowledge.
              </p>
            )}
          </div>
        </TabsContent>
      </Tabs>

      {/* Edit/Add Content Modal */}
      {(editingItem || isAddingNew) && (
        <ContentForm
          item={editingItem || newItem}
          onSave={(item) => {
            if (editingItem) {
              saveItem({ ...editingItem, ...item });
            } else {
              saveItem(item);
            }
          }}
          onCancel={() => {
            setEditingItem(null);
            setIsAddingNew(false);
            resetNewItem();
          }}
        />
      )}
    </div>
  );
}