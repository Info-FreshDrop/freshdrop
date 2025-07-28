import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Star, MessageSquare, Sparkles, Users, CheckCircle } from "lucide-react";

interface RatingModalProps {
  isOpen: boolean;
  onClose: () => void;
  order: {
    id: string;
    washer_id: string;
  };
  operatorName?: string;
  onRatingSubmitted?: () => void;
}

interface RatingCategory {
  key: string;
  label: string;
  icon: React.ReactNode;
  description: string;
}

const ratingCategories: RatingCategory[] = [
  {
    key: 'cleanliness_rating',
    label: 'Cleanliness',
    icon: <Sparkles className="h-5 w-5" />,
    description: 'How clean were your clothes?'
  },
  {
    key: 'folding_quality_rating',
    label: 'Folding Quality',
    icon: <CheckCircle className="h-5 w-5" />,
    description: 'How well were your clothes folded?'
  },
  {
    key: 'communication_rating',
    label: 'Communication',
    icon: <Users className="h-5 w-5" />,
    description: 'How was the communication?'
  }
];

export function RatingModal({ isOpen, onClose, order, operatorName, onRatingSubmitted }: RatingModalProps) {
  const { user } = useAuth();
  const [ratings, setRatings] = useState<Record<string, number>>({});
  const [feedback, setFeedback] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleStarClick = (category: string, rating: number) => {
    setRatings(prev => ({ ...prev, [category]: rating }));
  };

  const calculateOverallRating = () => {
    const values = Object.values(ratings);
    if (values.length === 0) return 0;
    return Math.round(values.reduce((sum, rating) => sum + rating, 0) / values.length);
  };

  const handleSubmit = async () => {
    const overallRating = calculateOverallRating();
    
    if (overallRating === 0) {
      toast.error('Please provide at least one rating');
      return;
    }

    setIsLoading(true);
    try {
      const { error } = await supabase
        .from('order_ratings')
        .insert({
          order_id: order.id,
          customer_id: user?.id,
          cleanliness_rating: ratings.cleanliness_rating || null,
          folding_quality_rating: ratings.folding_quality_rating || null,
          communication_rating: ratings.communication_rating || null,
          overall_rating: overallRating,
          feedback: feedback || null
        });

      if (error) throw error;

      toast.success('Thank you for your feedback!');
      onRatingSubmitted?.();
      onClose();
      
      // Reset form
      setRatings({});
      setFeedback('');
    } catch (error) {
      console.error('Error submitting rating:', error);
      toast.error('Failed to submit rating');
    } finally {
      setIsLoading(false);
    }
  };

  const renderStars = (category: string, currentRating: number = 0) => {
    return (
      <div className="flex gap-1">
        {[1, 2, 3, 4, 5].map((star) => (
          <button
            key={star}
            type="button"
            onClick={() => handleStarClick(category, star)}
            className="focus:outline-none transition-colors"
          >
            <Star
              className={`h-6 w-6 ${
                star <= currentRating
                  ? 'fill-yellow-400 text-yellow-400'
                  : 'text-gray-300 hover:text-yellow-400'
              }`}
            />
          </button>
        ))}
      </div>
    );
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <Card className="w-full max-w-lg max-h-[90vh] overflow-y-auto">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Star className="h-5 w-5 text-yellow-500" />
            Rate Your Experience
          </CardTitle>
          <p className="text-sm text-muted-foreground">
            How was your laundry service with {operatorName || 'your operator'}?
          </p>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Rating Categories */}
          <div className="space-y-4">
            {ratingCategories.map((category) => (
              <div key={category.key} className="space-y-2">
                <div className="flex items-center gap-2">
                  {category.icon}
                  <Label className="font-medium">{category.label}</Label>
                </div>
                <p className="text-sm text-muted-foreground">{category.description}</p>
                {renderStars(category.key, ratings[category.key])}
              </div>
            ))}
          </div>

          {/* Overall Rating Display */}
          {calculateOverallRating() > 0 && (
            <div className="bg-muted p-4 rounded-lg">
              <div className="flex items-center justify-between">
                <span className="font-medium">Overall Rating:</span>
                <div className="flex items-center gap-2">
                  <div className="flex">
                    {[1, 2, 3, 4, 5].map((star) => (
                      <Star
                        key={star}
                        className={`h-5 w-5 ${
                          star <= calculateOverallRating()
                            ? 'fill-yellow-400 text-yellow-400'
                            : 'text-gray-300'
                        }`}
                      />
                    ))}
                  </div>
                  <span className="font-bold">{calculateOverallRating()}/5</span>
                </div>
              </div>
            </div>
          )}

          {/* Feedback */}
          <div className="space-y-2">
            <Label htmlFor="feedback" className="flex items-center gap-2">
              <MessageSquare className="h-4 w-4" />
              Additional Feedback (Optional)
            </Label>
            <Textarea
              id="feedback"
              placeholder="Tell us more about your experience..."
              value={feedback}
              onChange={(e) => setFeedback(e.target.value)}
              rows={4}
            />
          </div>

          {/* Action Buttons */}
          <div className="flex gap-3">
            <Button
              variant="outline"
              onClick={onClose}
              className="flex-1"
            >
              Skip
            </Button>
            <Button
              onClick={handleSubmit}
              disabled={isLoading || calculateOverallRating() === 0}
              className="flex-1"
            >
              {isLoading ? 'Submitting...' : 'Submit Rating'}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}