import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Switch } from '@/components/ui/switch';
import { Plus, FileText, Video, GraduationCap, Edit, Trash2, Upload, Eye, EyeOff } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface TrainingContentManagementProps {
  onBack: () => void;
}

interface TrainingModule {
  id: string;
  title: string;
  content: string;
  media_url?: string;
  section_type: 'video' | 'text' | 'quiz';
  display_order: number;
  is_active: boolean;
  quiz_data?: any;
  created_at: string;
  updated_at: string;
}

export const TrainingContentManagement: React.FC<TrainingContentManagementProps> = ({ onBack }) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [modules, setModules] = useState<TrainingModule[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingModule, setEditingModule] = useState<TrainingModule | null>(null);
  const [uploadingVideo, setUploadingVideo] = useState(false);
  const [formData, setFormData] = useState({
    title: '',
    content: '',
    section_type: 'text' as 'video' | 'text' | 'quiz',
    display_order: 1,
    is_active: true,
    quiz_data: {
      questions: [
        {
          question: '',
          options: ['', '', '', ''],
          correct_answer: 0
        }
      ]
    }
  });
  const [videoFile, setVideoFile] = useState<File | null>(null);

  useEffect(() => {
    loadTrainingModules();
  }, []);

  const loadTrainingModules = async () => {
    try {
      const { data, error } = await supabase
        .from('onboarding_content')
        .select('*')
        .order('display_order');

      if (error) throw error;
      setModules((data || []).map(item => ({
        ...item,
        section_type: item.section_type as 'video' | 'text' | 'quiz'
      })));
    } catch (error) {
      console.error('Error loading training modules:', error);
      toast({
        title: "Error",
        description: "Failed to load training modules",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const uploadVideo = async (file: File): Promise<string> => {
    const fileExt = file.name.split('.').pop();
    const fileName = `training/${Date.now()}.${fileExt}`;
    
    const { error: uploadError } = await supabase.storage
      .from('content-images')
      .upload(fileName, file);

    if (uploadError) throw uploadError;

    const { data } = supabase.storage
      .from('content-images')
      .getPublicUrl(fileName);

    return data.publicUrl;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setUploadingVideo(true);

    try {
      let mediaUrl = editingModule?.media_url;

      // Upload video if provided
      if (videoFile) {
        mediaUrl = await uploadVideo(videoFile);
      }

      const moduleData = {
        title: formData.title,
        content: formData.content,
        section_type: formData.section_type,
        display_order: formData.display_order,
        is_active: formData.is_active,
        media_url: mediaUrl,
        quiz_data: formData.section_type === 'quiz' ? formData.quiz_data : null
      };

      if (editingModule) {
        // Update existing module
        const { error } = await supabase
          .from('onboarding_content')
          .update(moduleData)
          .eq('id', editingModule.id);

        if (error) throw error;

        toast({
          title: "Module updated!",
          description: "Training module has been updated successfully."
        });
      } else {
        // Create new module
        const { error } = await supabase
          .from('onboarding_content')
          .insert([moduleData]);

        if (error) throw error;

        toast({
          title: "Module created!",
          description: "New training module has been created successfully."
        });
      }

      setShowCreateModal(false);
      setEditingModule(null);
      resetForm();
      loadTrainingModules();
    } catch (error) {
      console.error('Error saving module:', error);
      toast({
        title: "Error",
        description: "Failed to save training module",
        variant: "destructive"
      });
    } finally {
      setUploadingVideo(false);
    }
  };

  const handleEdit = (module: TrainingModule) => {
    setEditingModule(module);
    setFormData({
      title: module.title,
      content: module.content,
      section_type: module.section_type,
      display_order: module.display_order,
      is_active: module.is_active,
      quiz_data: module.quiz_data || {
        questions: [
          {
            question: '',
            options: ['', '', '', ''],
            correct_answer: 0
          }
        ]
      }
    });
    setShowCreateModal(true);
  };

  const handleDelete = async (moduleId: string) => {
    if (!confirm('Are you sure you want to delete this training module?')) {
      return;
    }

    try {
      const { error } = await supabase
        .from('onboarding_content')
        .delete()
        .eq('id', moduleId);

      if (error) throw error;

      toast({
        title: "Module deleted",
        description: "Training module has been deleted successfully."
      });

      loadTrainingModules();
    } catch (error) {
      console.error('Error deleting module:', error);
      toast({
        title: "Error",
        description: "Failed to delete training module",
        variant: "destructive"
      });
    }
  };

  const toggleModuleStatus = async (moduleId: string, isActive: boolean) => {
    try {
      const { error } = await supabase
        .from('onboarding_content')
        .update({ is_active: isActive })
        .eq('id', moduleId);

      if (error) throw error;

      toast({
        title: isActive ? "Module activated" : "Module deactivated",
        description: `Training module has been ${isActive ? 'activated' : 'deactivated'}.`
      });

      loadTrainingModules();
    } catch (error) {
      console.error('Error updating module status:', error);
      toast({
        title: "Error",
        description: "Failed to update module status",
        variant: "destructive"
      });
    }
  };

  const resetForm = () => {
    setFormData({
      title: '',
      content: '',
      section_type: 'text',
      display_order: modules.length + 1,
      is_active: true,
      quiz_data: {
        questions: [
          {
            question: '',
            options: ['', '', '', ''],
            correct_answer: 0
          }
        ]
      }
    });
    setVideoFile(null);
  };

  const handleQuizQuestionChange = (questionIndex: number, field: string, value: any) => {
    setFormData(prev => ({
      ...prev,
      quiz_data: {
        ...prev.quiz_data,
        questions: prev.quiz_data.questions.map((q: any, i: number) => 
          i === questionIndex ? { ...q, [field]: value } : q
        )
      }
    }));
  };

  const addQuizQuestion = () => {
    setFormData(prev => ({
      ...prev,
      quiz_data: {
        ...prev.quiz_data,
        questions: [
          ...prev.quiz_data.questions,
          {
            question: '',
            options: ['', '', '', ''],
            correct_answer: 0
          }
        ]
      }
    }));
  };

  const removeQuizQuestion = (questionIndex: number) => {
    setFormData(prev => ({
      ...prev,
      quiz_data: {
        ...prev.quiz_data,
        questions: prev.quiz_data.questions.filter((_: any, i: number) => i !== questionIndex)
      }
    }));
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <Button onClick={onBack} variant="outline" className="mb-4">
            ← Back to Dashboard
          </Button>
          <h1 className="text-3xl font-bold">Training Content Management</h1>
          <p className="text-muted-foreground">Create and manage operator training modules</p>
        </div>
        <Button onClick={() => {
          resetForm();
          setShowCreateModal(true);
        }}>
          <Plus className="h-4 w-4 mr-2" />
          Add Module
        </Button>
      </div>

      {/* Modules List */}
      <div className="grid gap-4">
        {modules.length === 0 ? (
          <Card>
            <CardContent className="p-8 text-center">
              <GraduationCap className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <h3 className="text-lg font-medium mb-2">No training modules yet</h3>
              <p className="text-muted-foreground mb-4">Create your first training module to get started</p>
              <Button onClick={() => {
                resetForm();
                setShowCreateModal(true);
              }}>
                <Plus className="h-4 w-4 mr-2" />
                Create First Module
              </Button>
            </CardContent>
          </Card>
        ) : (
          modules.map((module) => (
            <Card key={module.id}>
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <CardTitle className="flex items-center gap-2">
                        {module.section_type === 'video' && <Video className="h-5 w-5" />}
                        {module.section_type === 'text' && <FileText className="h-5 w-5" />}
                        {module.section_type === 'quiz' && <GraduationCap className="h-5 w-5" />}
                        {module.title}
                      </CardTitle>
                      <Badge variant="outline">
                        Order {module.display_order}
                      </Badge>
                      {module.is_active ? (
                        <Badge className="bg-green-100 text-green-800">
                          <Eye className="h-3 w-3 mr-1" />
                          Active
                        </Badge>
                      ) : (
                        <Badge variant="secondary">
                          <EyeOff className="h-3 w-3 mr-1" />
                          Inactive
                        </Badge>
                      )}
                    </div>
                    <CardDescription>
                      Type: {module.section_type} • Created: {new Date(module.created_at).toLocaleDateString()}
                    </CardDescription>
                  </div>
                  <div className="flex items-center gap-2">
                    <Switch
                      checked={module.is_active}
                      onCheckedChange={(checked) => toggleModuleStatus(module.id, checked)}
                    />
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleEdit(module)}
                    >
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleDelete(module.id)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {module.content && (
                    <div className="text-sm text-muted-foreground">
                      <div dangerouslySetInnerHTML={{ 
                        __html: module.content.substring(0, 200) + (module.content.length > 200 ? '...' : '')
                      }} />
                    </div>
                  )}
                  {module.media_url && (
                    <div className="text-sm text-blue-600">
                      📹 Video content included
                    </div>
                  )}
                  {module.quiz_data && (
                    <div className="text-sm text-purple-600">
                      🧠 {module.quiz_data.questions?.length || 0} quiz questions
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>

      {/* Create/Edit Module Dialog */}
      <Dialog open={showCreateModal} onOpenChange={setShowCreateModal}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editingModule ? 'Edit Training Module' : 'Create Training Module'}
            </DialogTitle>
            <DialogDescription>
              Add training content for operators to complete during onboarding
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="title">Module Title *</Label>
                <Input
                  id="title"
                  value={formData.title}
                  onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
                  placeholder="e.g., Laundry Best Practices"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="type">Module Type *</Label>
                <Select value={formData.section_type} onValueChange={(value: any) => 
                  setFormData(prev => ({ ...prev, section_type: value }))
                }>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="text">Text Content</SelectItem>
                    <SelectItem value="video">Video Content</SelectItem>
                    <SelectItem value="quiz">Quiz</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="order">Display Order</Label>
                <Input
                  id="order"
                  type="number"
                  min="1"
                  value={formData.display_order}
                  onChange={(e) => setFormData(prev => ({ ...prev, display_order: parseInt(e.target.value) }))}
                />
              </div>

              <div className="flex items-center space-x-2">
                <Switch
                  checked={formData.is_active}
                  onCheckedChange={(checked) => setFormData(prev => ({ ...prev, is_active: checked }))}
                />
                <Label>Active</Label>
              </div>
            </div>

            <Tabs value={formData.section_type} className="w-full">
              <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="text" onClick={() => setFormData(prev => ({ ...prev, section_type: 'text' }))}>
                  Text Content
                </TabsTrigger>
                <TabsTrigger value="video" onClick={() => setFormData(prev => ({ ...prev, section_type: 'video' }))}>
                  Video Content
                </TabsTrigger>
                <TabsTrigger value="quiz" onClick={() => setFormData(prev => ({ ...prev, section_type: 'quiz' }))}>
                  Quiz
                </TabsTrigger>
              </TabsList>

              <TabsContent value="text" className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="content">Content *</Label>
                  <Textarea
                    id="content"
                    value={formData.content}
                    onChange={(e) => setFormData(prev => ({ ...prev, content: e.target.value }))}
                    placeholder="Enter the training content..."
                    rows={8}
                    required
                  />
                </div>
              </TabsContent>

              <TabsContent value="video" className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="video">Video File</Label>
                  <Input
                    type="file"
                    accept="video/*"
                    onChange={(e) => setVideoFile(e.target.files?.[0] || null)}
                  />
                  {editingModule?.media_url && !videoFile && (
                    <p className="text-sm text-muted-foreground">
                      Current video: {editingModule.media_url.split('/').pop()}
                    </p>
                  )}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="content">Description</Label>
                  <Textarea
                    id="content"
                    value={formData.content}
                    onChange={(e) => setFormData(prev => ({ ...prev, content: e.target.value }))}
                    placeholder="Describe what this video covers..."
                    rows={4}
                  />
                </div>
              </TabsContent>

              <TabsContent value="quiz" className="space-y-4">
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <Label>Quiz Questions</Label>
                    <Button type="button" variant="outline" size="sm" onClick={addQuizQuestion}>
                      <Plus className="h-4 w-4 mr-1" />
                      Add Question
                    </Button>
                  </div>
                  
                  {formData.quiz_data.questions.map((question: any, qIndex: number) => (
                    <Card key={qIndex}>
                      <CardHeader>
                        <div className="flex items-center justify-between">
                          <CardTitle className="text-base">Question {qIndex + 1}</CardTitle>
                          {formData.quiz_data.questions.length > 1 && (
                            <Button 
                              type="button" 
                              variant="outline" 
                              size="sm"
                              onClick={() => removeQuizQuestion(qIndex)}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          )}
                        </div>
                      </CardHeader>
                      <CardContent className="space-y-3">
                        <div>
                          <Label>Question</Label>
                          <Input
                            value={question.question}
                            onChange={(e) => handleQuizQuestionChange(qIndex, 'question', e.target.value)}
                            placeholder="Enter your question..."
                          />
                        </div>
                        
                        <div className="space-y-2">
                          <Label>Answer Options</Label>
                          {question.options.map((option: string, oIndex: number) => (
                            <div key={oIndex} className="flex items-center gap-2">
                              <Input
                                value={option}
                                onChange={(e) => {
                                  const newOptions = [...question.options];
                                  newOptions[oIndex] = e.target.value;
                                  handleQuizQuestionChange(qIndex, 'options', newOptions);
                                }}
                                placeholder={`Option ${oIndex + 1}`}
                              />
                              <Switch
                                checked={question.correct_answer === oIndex}
                                onCheckedChange={(checked) => {
                                  if (checked) {
                                    handleQuizQuestionChange(qIndex, 'correct_answer', oIndex);
                                  }
                                }}
                              />
                              <Label className="text-xs">Correct</Label>
                            </div>
                          ))}
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </TabsContent>
            </Tabs>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => {
                setShowCreateModal(false);
                setEditingModule(null);
                resetForm();
              }}>
                Cancel
              </Button>
              <Button type="submit" disabled={uploadingVideo}>
                {uploadingVideo ? (
                  <>
                    <Upload className="h-4 w-4 mr-2 animate-spin" />
                    {videoFile ? 'Uploading Video...' : 'Saving...'}
                  </>
                ) : (
                  editingModule ? 'Update Module' : 'Create Module'
                )}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
};