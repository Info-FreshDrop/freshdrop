import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { 
  Star, 
  DollarSign, 
  MessageSquare,
  Calendar,
  TrendingUp,
  ThumbsUp
} from "lucide-react";

interface Rating {
  id: string;
  order_id: string;
  customer_id: string;
  overall_rating: number;
  cleanliness_rating: number;
  folding_quality_rating: number;
  communication_rating: number;
  feedback: string;
  created_at: string;
  profiles?: {
    first_name: string;
    last_name: string;
  };
}

interface Tip {
  id: string;
  order_id: string;
  customer_id: string;
  operator_id: string;
  amount_cents: number;
  message: string;
  created_at: string;
  profiles?: {
    first_name: string;
    last_name: string;
  };
}

interface ReviewsAndTipsProps {
  washerId: string;
}

export function ReviewsAndTips({ washerId }: ReviewsAndTipsProps) {
  const { user } = useAuth();
  const [ratings, setRatings] = useState<Rating[]>([]);
  const [tips, setTips] = useState<Tip[]>([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    totalTips: 0,
    totalTipAmount: 0,
    averageRating: 0,
    totalReviews: 0
  });

  useEffect(() => {
    if (user && washerId) {
      loadReviewsAndTips();
    }
  }, [user, washerId]);

  const loadReviewsAndTips = async () => {
    setLoading(true);
    let ratingsData: any[] = [];
    let tipsData: any[] = [];
    
    try {
      // First get order IDs for this washer
      const { data: orders } = await supabase
        .from('orders')
        .select('id')
        .eq('washer_id', washerId);

      const orderIds = orders?.map(order => order.id) || [];

      if (orderIds.length > 0) {
        // Load ratings for orders assigned to this operator
        const { data: ratings, error: ratingsError } = await supabase
          .from('order_ratings')
          .select(`
            *,
            profiles!order_ratings_customer_id_fkey(first_name, last_name)
          `)
          .in('order_id', orderIds)
          .order('created_at', { ascending: false });

        if (ratingsError) {
          console.error('Error loading ratings:', ratingsError);
        } else {
          ratingsData = (ratings as any) || [];
          setRatings(ratingsData);
        }
      }

      // Load tips received by this operator
      const { data: tips, error: tipsError } = await supabase
        .from('tips')
        .select(`
          *,
          profiles!tips_customer_id_fkey(first_name, last_name)
        `)
        .eq('operator_id', user?.id)
        .order('created_at', { ascending: false });

      if (tipsError) {
        console.error('Error loading tips:', tipsError);
      } else {
        tipsData = (tips as any) || [];
        setTips(tipsData);
      }

      // Calculate stats
      const totalTipAmount = tipsData.reduce((sum, tip) => sum + tip.amount_cents, 0);
      const averageRating = ratingsData.length > 0 
        ? ratingsData.reduce((sum, rating) => sum + (rating.overall_rating || 0), 0) / ratingsData.length
        : 0;

      setStats({
        totalTips: tipsData.length,
        totalTipAmount,
        averageRating,
        totalReviews: ratingsData.length
      });

    } catch (error) {
      console.error('Error loading reviews and tips:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (cents: number) => {
    return `$${(cents / 100).toFixed(2)}`;
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const renderStars = (rating: number) => {
    return (
      <div className="flex items-center gap-1">
        {[1, 2, 3, 4, 5].map((star) => (
          <Star
            key={star}
            className={`h-4 w-4 ${
              star <= rating ? 'fill-yellow-400 text-yellow-400' : 'text-gray-300'
            }`}
          />
        ))}
        <span className="ml-1 text-sm text-muted-foreground">({rating})</span>
      </div>
    );
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="text-center">
          <div className="text-sm text-muted-foreground">Loading reviews and tips...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Stats Overview */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Average Rating</p>
                <p className="text-2xl font-bold">{stats.averageRating.toFixed(1)}</p>
              </div>
              <Star className="h-8 w-8 text-yellow-400" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total Reviews</p>
                <p className="text-2xl font-bold">{stats.totalReviews}</p>
              </div>
              <MessageSquare className="h-8 w-8 text-blue-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Tips Received</p>
                <p className="text-2xl font-bold">{stats.totalTips}</p>
              </div>
              <ThumbsUp className="h-8 w-8 text-green-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Tips Total</p>
                <p className="text-2xl font-bold">{formatCurrency(stats.totalTipAmount)}</p>
              </div>
              <DollarSign className="h-8 w-8 text-green-600" />
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Reviews */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <MessageSquare className="h-5 w-5" />
              Recent Reviews
            </CardTitle>
            <CardDescription>
              Customer feedback and ratings from your completed orders
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4 max-h-96 overflow-y-auto">
              {ratings.length === 0 ? (
                <div className="text-center py-8">
                  <MessageSquare className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <p className="text-muted-foreground">No reviews yet</p>
                  <p className="text-sm text-muted-foreground">
                    Complete orders to start receiving customer feedback
                  </p>
                </div>
              ) : (
                ratings.map((rating) => (
                  <div key={rating.id} className="border rounded-lg p-4 space-y-3">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <h4 className="font-medium">
                            {rating.profiles?.first_name} {rating.profiles?.last_name}
                          </h4>
                          <Badge variant="outline" className="text-xs">
                            Order #{rating.order_id.slice(0, 8)}
                          </Badge>
                        </div>
                        {renderStars(rating.overall_rating)}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        <Calendar className="h-3 w-3 inline mr-1" />
                        {formatDate(rating.created_at)}
                      </div>
                    </div>

                    {rating.feedback && (
                      <div className="bg-muted p-3 rounded text-sm">
                        "{rating.feedback}"
                      </div>
                    )}

                    <div className="grid grid-cols-3 gap-2 text-xs">
                      <div className="text-center">
                        <div className="text-muted-foreground">Cleanliness</div>
                        <div className="font-medium">{rating.cleanliness_rating}/5</div>
                      </div>
                      <div className="text-center">
                        <div className="text-muted-foreground">Folding</div>
                        <div className="font-medium">{rating.folding_quality_rating}/5</div>
                      </div>
                      <div className="text-center">
                        <div className="text-muted-foreground">Communication</div>
                        <div className="font-medium">{rating.communication_rating}/5</div>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </CardContent>
        </Card>

        {/* Recent Tips */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <DollarSign className="h-5 w-5" />
              Recent Tips
            </CardTitle>
            <CardDescription>
              Tips received from satisfied customers
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4 max-h-96 overflow-y-auto">
              {tips.length === 0 ? (
                <div className="text-center py-8">
                  <DollarSign className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <p className="text-muted-foreground">No tips yet</p>
                  <p className="text-sm text-muted-foreground">
                    Provide excellent service to earn tips from customers
                  </p>
                </div>
              ) : (
                tips.map((tip) => (
                  <div key={tip.id} className="border rounded-lg p-4 space-y-3">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <h4 className="font-medium">
                            {tip.profiles?.first_name} {tip.profiles?.last_name}
                          </h4>
                          <Badge variant="outline" className="text-xs">
                            Order #{tip.order_id.slice(0, 8)}
                          </Badge>
                        </div>
                        <div className="flex items-center gap-2">
                          <Badge variant="secondary" className="text-green-700 bg-green-100">
                            {formatCurrency(tip.amount_cents)}
                          </Badge>
                          <span className="text-xs text-muted-foreground">
                            <Calendar className="h-3 w-3 inline mr-1" />
                            {formatDate(tip.created_at)}
                          </span>
                        </div>
                      </div>
                    </div>

                    {tip.message && (
                      <div className="bg-green-50 border border-green-200 p-3 rounded text-sm">
                        <div className="text-green-800">"{tip.message}"</div>
                      </div>
                    )}
                  </div>
                ))
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}