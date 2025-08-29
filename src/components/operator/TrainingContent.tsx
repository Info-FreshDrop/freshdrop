import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
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
  }, []);

  const loadTrainingContent = async () => {
    try {
      const { data, error } = await supabase
        .from('onboarding_content')
        .select('*')
        .eq('is_active', true)
        .order('display_order');

      if (error) throw error;

      const trainingModules = data?.map(item => ({
        id: item.id,
        title: item.title,
        content: item.content || '',
        media_url: item.media_url,
        section_type: item.section_type as 'video' | 'text' | 'quiz',
        display_order: item.display_order,
        quiz_data: item.quiz_data
      })) || [];

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

    switch (currentModule.section_type) {
      case 'video':
        return (
          <div className="space-y-4">
            {currentModule.media_url ? (
              <div className="aspect-video bg-black rounded-lg overflow-hidden">
                <video 
                  controls 
                  className="w-full h-full"
                  onEnded={handleVideoComplete}
                >
                  <source src={currentModule.media_url} type="video/mp4" />
                  Your browser does not support the video tag.
                </video>
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
            <div className="prose max-w-none">
              <div dangerouslySetInnerHTML={{ __html: currentModule.content }} />
            </div>
          </div>
        );

      case 'text':
        return (
          <div className="space-y-4">
            <div className="prose max-w-none">
              <div dangerouslySetInnerHTML={{ __html: currentModule.content }} />
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
    <div className="space-y-6">
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

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Module List */}
        <div className="space-y-3">
          {modules.map((module, index) => {
            const isCompleted = completedModules.includes(module.id);
            const isCurrent = currentModule?.id === module.id;
            
            return (
              <Card 
                key={module.id}
                className={`cursor-pointer transition-all ${
                  isCurrent ? 'ring-2 ring-primary' : ''
                } ${isCompleted ? 'border-green-200 bg-green-50' : ''}`}
                onClick={() => setCurrentModule(module)}
              >
                <CardContent className="p-4">
                  <div className="flex items-center gap-3">
                    <div className={`p-2 rounded-full ${
                      isCompleted 
                        ? 'bg-green-100 text-green-600'
                        : isCurrent 
                        ? 'bg-primary/10 text-primary'
                        : 'bg-muted text-muted-foreground'
                    }`}>
                      {isCompleted ? (
                        <CheckCircle className="h-4 w-4" />
                      ) : module.section_type === 'video' ? (
                        <Play className="h-4 w-4" />
                      ) : module.section_type === 'quiz' ? (
                        <GraduationCap className="h-4 w-4" />
                      ) : (
                        <FileText className="h-4 w-4" />
                      )}
                    </div>
                    <div className="flex-1">
                      <h3 className="font-medium text-sm">{module.title}</h3>
                      <div className="flex items-center gap-2 mt-1">
                        <Badge variant="outline" className="text-xs">
                          {module.section_type}
                        </Badge>
                        {isCompleted && (
                          <Badge variant="secondary" className="bg-green-100 text-green-800 text-xs">
                            Complete
                          </Badge>
                        )}
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>

        {/* Module Content */}
        <div className="lg:col-span-3">
          {currentModule && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  {currentModule.section_type === 'video' && <Play className="h-5 w-5" />}
                  {currentModule.section_type === 'text' && <FileText className="h-5 w-5" />}
                  {currentModule.section_type === 'quiz' && <GraduationCap className="h-5 w-5" />}
                  {currentModule.title}
                </CardTitle>
                <div className="flex items-center gap-2">
                  <Badge variant="outline">{currentModule.section_type}</Badge>
                  {completedModules.includes(currentModule.id) && (
                    <Badge className="bg-green-100 text-green-800">Completed</Badge>
                  )}
                </div>
              </CardHeader>
              <CardContent>
                {renderModuleContent()}
              </CardContent>
            </Card>
          )}
        </div>
      </div>

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