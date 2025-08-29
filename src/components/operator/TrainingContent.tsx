import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Label } from '@/components/ui/label';
import { CheckCircle, Play, FileText, GraduationCap, Clock } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface TrainingContentProps {
  onComplete: () => void;
}

interface TrainingModule {
  id: string;
  title: string;
  content: string;
  media_url?: string;
  section_type: 'video' | 'text' | 'quiz';
  display_order: number;
  quiz_data?: any;
  completed?: boolean;
}

export const TrainingContent: React.FC<TrainingContentProps> = ({ onComplete }) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [modules, setModules] = useState<TrainingModule[]>([]);
  const [currentModule, setCurrentModule] = useState<TrainingModule | null>(null);
  const [completedModules, setCompletedModules] = useState<string[]>([]);
  const [quizAnswers, setQuizAnswers] = useState<Record<string, any>>({});

  useEffect(() => {
    loadTrainingContent();
    
    // Set up real-time subscription for training content updates
    const channel = supabase
      .channel('onboarding-content-changes')
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'onboarding_content'
      }, (payload) => {
        console.log('Training content updated:', payload);
        loadTrainingContent(); // Reload content when changes occur
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const loadTrainingContent = async () => {
    try {
      console.log('Loading training content...');
      const { data, error } = await supabase
        .from('onboarding_content')
        .select('*')
        .eq('is_active', true)
        .order('display_order');

      if (error) throw error;

      console.log('Raw training data:', data);

      const trainingModules = data?.map(item => ({
        id: item.id,
        title: item.title,
        content: item.content || '',
        media_url: item.media_url,
        section_type: item.section_type === 'quiz' ? 'quiz' as const : 
                    item.section_type === 'video' ? 'video' as const : 'text' as const,
        display_order: item.display_order,
        quiz_data: item.quiz_data
      })) || [];

      console.log('Processed training modules:', trainingModules);
      setModules(trainingModules);
      if (trainingModules.length > 0) {
        setCurrentModule(trainingModules[0]);
      }
    } catch (error) {
      console.error('Error loading training content:', error);
      toast({
        title: "Loading error",
        description: "Failed to load training content",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const markModuleComplete = (moduleId: string) => {
    if (!completedModules.includes(moduleId)) {
      setCompletedModules(prev => [...prev, moduleId]);
    }
  };

  const handleVideoComplete = () => {
    if (currentModule) {
      markModuleComplete(currentModule.id);
      toast({
        title: "Module completed!",
        description: `You've finished "${currentModule.title}"`
      });
    }
  };

  const handleQuizSubmit = (answers: Record<string, any>) => {
    if (currentModule) {
      setQuizAnswers(prev => ({ ...prev, [currentModule.id]: answers }));
      markModuleComplete(currentModule.id);
      toast({
        title: "Quiz completed!",
        description: `You've finished "${currentModule.title}"`
      });
    }
  };

  const handleCompleteTraining = async () => {
    try {
      // Update profile to mark training as completed
      const { error } = await supabase
        .from('profiles')
        .update({ 
          training_completed: true,
          contractor_start_date: new Date().toISOString()
        })
        .eq('user_id', user?.id);

      if (error) throw error;

      toast({
        title: "Training completed! 🎉",
        description: "You're now ready to start accepting orders!"
      });

      onComplete();
    } catch (error) {
      console.error('Error completing training:', error);
      toast({
        title: "Error",
        description: "Failed to complete training. Please try again.",
        variant: "destructive"
      });
    }
  };

  const completionPercentage = modules.length > 0 
    ? (completedModules.length / modules.length) * 100 
    : 0;

  const renderModuleContent = () => {
    if (!currentModule) return null;

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

    switch (currentModule.section_type) {
      case 'video':
        return (
          <div className="space-y-4">
            {currentModule.media_url ? (
              <div className="aspect-video bg-black rounded-lg overflow-hidden">
                {isYouTubeUrl(currentModule.media_url) ? (
                  <iframe
                    src={getYouTubeEmbedUrl(currentModule.media_url)}
                    className="w-full h-full"
                    frameBorder="0"
                    allowFullScreen
                    onLoad={handleVideoComplete}
                  />
                ) : (
                  <video 
                    controls 
                    className="w-full h-full"
                    onEnded={handleVideoComplete}
                  >
                    <source src={currentModule.media_url} type="video/mp4" />
                    Your browser does not support the video tag.
                  </video>
                )}
              </div>
            ) : (
              <div className="aspect-video bg-muted rounded-lg flex items-center justify-center">
                <div className="text-center space-y-2">
                  <Play className="h-12 w-12 mx-auto text-muted-foreground" />
                  <p className="text-muted-foreground">Video content coming soon</p>
                  <Button onClick={handleVideoComplete}>Mark as Watched</Button>
                </div>
              </div>
            )}
            {currentModule.content && (
              <div className="prose max-w-none">
                <div dangerouslySetInnerHTML={{ __html: currentModule.content }} />
              </div>
            )}
          </div>
        );

      case 'text':
        return (
          <div className="space-y-4">
            {/* Show media if available (videos, images, etc.) */}
            {currentModule.media_url && (
              <div className="rounded-lg overflow-hidden">
                {isYouTubeUrl(currentModule.media_url) ? (
                  <iframe
                    src={getYouTubeEmbedUrl(currentModule.media_url)}
                    className="w-full aspect-video"
                    frameBorder="0"
                    allowFullScreen
                  />
                ) : currentModule.media_url.match(/\.(mp4|webm|ogg)$/i) ? (
                  <video 
                    controls 
                    className="w-full max-h-96"
                    onEnded={handleVideoComplete}
                  >
                    <source src={currentModule.media_url} type="video/mp4" />
                    Your browser does not support the video tag.
                  </video>
                ) : (
                  <img 
                    src={currentModule.media_url} 
                    alt={currentModule.title}
                    className="w-full max-h-96 object-cover"
                  />
                )}
              </div>
            )}
            {/* Text content with working links */}
            <div className="prose max-w-none prose-a:text-primary prose-a:underline">
              <div dangerouslySetInnerHTML={{ 
                __html: currentModule.content.replace(
                  /\[([^\]]+)\]\(([^)]+)\)/g, 
                  '<a href="$2" target="_blank" rel="noopener noreferrer" class="text-primary underline hover:text-primary/80">$1</a>'
                ) 
              }} />
            </div>
            <Button onClick={() => markModuleComplete(currentModule.id)}>
              Mark as Read
            </Button>
          </div>
        );

      case 'quiz':
        return (
          <QuizComponent 
            quizData={currentModule.quiz_data}
            onSubmit={handleQuizSubmit}
            completed={completedModules.includes(currentModule.id)}
          />
        );

      default:
        return <div>Unknown module type</div>;
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
          <p className="mt-2 text-muted-foreground">Loading training content...</p>
        </div>
      </div>
    );
  }

  if (modules.length === 0) {
    return (
      <div className="text-center space-y-4">
        <GraduationCap className="h-12 w-12 mx-auto text-muted-foreground" />
        <h3 className="text-lg font-medium">No training content available</h3>
        <p className="text-muted-foreground">Training modules will appear here when added by administrators.</p>
        <Button onClick={onComplete}>Continue</Button>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="text-center space-y-2">
        <GraduationCap className="h-12 w-12 mx-auto text-primary" />
        <h2 className="text-2xl font-semibold">Training & Certification</h2>
        <p className="text-muted-foreground">
          Complete all training modules to start accepting orders
        </p>
        <div className="flex items-center justify-center gap-2">
          <Progress value={completionPercentage} className="w-64" />
          <span className="text-sm text-muted-foreground">
            {completedModules.length}/{modules.length}
          </span>
        </div>
      </div>

      {/* Navigation Controls */}
      <div className="flex items-center justify-between">
        <Button
          variant="outline"
          onClick={() => {
            const currentIndex = modules.findIndex(m => m.id === currentModule?.id);
            if (currentIndex > 0) {
              setCurrentModule(modules[currentIndex - 1]);
            }
          }}
          disabled={!currentModule || modules.findIndex(m => m.id === currentModule.id) === 0}
        >
          ← Previous
        </Button>
        
        <span className="text-sm font-medium text-muted-foreground">
          {currentModule ? modules.findIndex(m => m.id === currentModule.id) + 1 : 0} of {modules.length}
        </span>
        
        <Button
          variant="outline"
          onClick={() => {
            const currentIndex = modules.findIndex(m => m.id === currentModule?.id);
            if (currentIndex < modules.length - 1) {
              setCurrentModule(modules[currentIndex + 1]);
            }
          }}
          disabled={!currentModule || modules.findIndex(m => m.id === currentModule.id) === modules.length - 1}
        >
          Next →
        </Button>
      </div>

      {/* Current Module Content */}
      {currentModule && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              {currentModule.section_type === 'video' && <Play className="h-5 w-5" />}
              {currentModule.section_type === 'text' && <FileText className="h-5 w-5" />}
              {currentModule.section_type === 'quiz' && <GraduationCap className="h-5 w-5" />}
              {currentModule.title}
            </CardTitle>
            {completedModules.includes(currentModule.id) && (
              <Badge className="bg-green-100 text-green-800 w-fit">
                <CheckCircle className="h-3 w-3 mr-1" />
                Completed
              </Badge>
            )}
          </CardHeader>
          <CardContent>
            {renderModuleContent()}
          </CardContent>
        </Card>
      )}


      {completedModules.length === modules.length && (
        <Card className="border-green-200 bg-green-50">
          <CardContent className="p-6 text-center">
            <CheckCircle className="h-12 w-12 mx-auto text-green-600 mb-4" />
            <h3 className="text-lg font-semibold text-green-900 mb-2">
              All Training Modules Completed!
            </h3>
            <p className="text-green-800 mb-4">
              Congratulations! You've completed all required training modules.
            </p>
            <Button onClick={handleCompleteTraining} className="bg-green-600 hover:bg-green-700">
              Complete Training & Start Working
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

// Simple Quiz Component
interface QuizComponentProps {
  quizData: any;
  onSubmit: (answers: Record<string, any>) => void;
  completed: boolean;
}

const QuizComponent: React.FC<QuizComponentProps> = ({ quizData, onSubmit, completed }) => {
  const [answers, setAnswers] = useState<Record<string, any>>({});

  if (!quizData || !quizData.questions) {
    return (
      <div className="text-center py-8">
        <GraduationCap className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
        <p className="text-muted-foreground">Quiz content is being prepared</p>
        <Button onClick={() => onSubmit({})} className="mt-4">
          Mark as Complete
        </Button>
      </div>
    );
  }

  const handleSubmit = () => {
    onSubmit(answers);
  };

  return (
    <div className="space-y-6">
      {quizData.questions.map((question: any, index: number) => (
        <Card key={index}>
          <CardHeader>
            <CardTitle className="text-base">
              Question {index + 1}: {question.question}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {question.options?.map((option: string, optionIndex: number) => (
                <div key={optionIndex} className="flex items-center space-x-2">
                  <input
                    type="radio"
                    id={`q${index}-${optionIndex}`}
                    name={`question-${index}`}
                    value={option}
                    onChange={(e) => 
                      setAnswers(prev => ({ ...prev, [index]: e.target.value }))
                    }
                    disabled={completed}
                  />
                  <Label htmlFor={`q${index}-${optionIndex}`}>{option}</Label>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      ))}
      
      {!completed && (
        <Button onClick={handleSubmit} className="w-full">
          Submit Quiz
        </Button>
      )}
    </div>
  );
};