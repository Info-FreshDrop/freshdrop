import { useState, useEffect, useRef } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { 
  MessageCircle, 
  Send, 
  X
} from "lucide-react";

interface OrderMessagingProps {
  orderId: string;
  operatorId?: string;
  operatorName?: string;
  isOpen: boolean;
  onClose: () => void;
}

interface Message {
  id: string;
  message: string;
  sender_id: string;
  recipient_id: string;
  is_read: boolean;
  created_at: string;
}

export function OrderMessaging({ 
  orderId, 
  operatorId, 
  operatorName,
  isOpen, 
  onClose 
}: OrderMessagingProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  
  const { user } = useAuth();
  const { toast } = useToast();

  useEffect(() => {
    console.log('OrderMessaging useEffect - isOpen:', isOpen, 'orderId:', orderId, 'operatorId:', operatorId);
    
    if (isOpen && orderId && operatorId) {
      loadMessages();
      
      // Set up real-time subscription
      const channel = supabase
        .channel('order-messages')
        .on(
          'postgres_changes',
          {
            event: 'INSERT',
            schema: 'public',
            table: 'order_messages',
            filter: `order_id=eq.${orderId}`
          },
          (payload) => {
            console.log('New message received:', payload);
            const newMessage = payload.new as Message;
            setMessages(prev => [...prev, newMessage]);
            
            // Mark as read if it's for the current user
            if (newMessage.recipient_id === user?.id) {
              markMessagesAsRead();
            }
          }
        )
        .subscribe();

      return () => {
        supabase.removeChannel(channel);
      };
    } else {
      console.log('OrderMessaging useEffect - not setting up subscription because:', {
        isOpen,
        orderId,
        operatorId
      });
    }
  }, [isOpen, orderId, operatorId]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  const loadMessages = async () => {
    if (!user || !operatorId) return;
    
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from('order_messages')
        .select('*')
        .eq('order_id', orderId)
        .order('created_at', { ascending: true });

      if (error) throw error;
      setMessages(data || []);

      // Mark messages as read
      await markMessagesAsRead();
    } catch (error) {
      console.error('Error loading messages:', error);
      toast({
        title: "Error",
        description: "Failed to load messages",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  const markMessagesAsRead = async () => {
    if (!user) return;

    try {
      await supabase
        .from('order_messages')
        .update({ is_read: true })
        .eq('order_id', orderId)
        .eq('recipient_id', user.id)
        .eq('is_read', false);
    } catch (error) {
      console.error('Error marking messages as read:', error);
    }
  };

  const sendMessage = async () => {
    if (!user || !operatorId || !newMessage.trim()) return;

    console.log('Sending message with operatorId:', operatorId, 'user.id:', user.id);
    setIsSending(true);
    try {
      // Use secure database function to insert message
      const { data, error } = await supabase.rpc('insert_order_message', {
        p_order_id: orderId,
        p_recipient_washer_id: operatorId,
        p_message: newMessage.trim()
      });

      if (error) {
        console.error('RPC error:', error);
        throw new Error(`Database error: ${error.message}`);
      }

      const result = data as any;
      if (!result?.success) {
        console.error('Function returned error:', result?.error);
        throw new Error(result?.error || 'Failed to send message');
      }

      console.log('Message sent successfully:', data);
      setNewMessage("");
      toast({
        title: "Message Sent",
        description: "Your message has been sent"
      });
    } catch (error) {
      console.error('Error sending message:', error);
      let errorMessage = 'Failed to send message. Please try again.';
      
      if (error instanceof Error) {
        if (error.message.includes('Not authenticated')) {
          errorMessage = 'Please log in to send messages.';
        } else if (error.message.includes('Order not found')) {
          errorMessage = 'You do not have permission to message about this order.';
        } else if (error.message.includes('Recipient washer not found')) {
          errorMessage = 'The operator for this order could not be found.';
        } else if (error.message.includes('Database error')) {
          errorMessage = error.message;
        }
      }
      
      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive"
      });
    } finally {
      setIsSending(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const formatTime = (dateString: string) => {
    return new Date(dateString).toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <Card className="w-full max-w-md h-[600px] flex flex-col border-0 shadow-soft">
        <CardHeader className="flex-shrink-0">
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <MessageCircle className="h-5 w-5" />
              Chat with {operatorName || 'Operator'}
            </CardTitle>
            <Button variant="ghost" size="sm" onClick={onClose}>
              <X className="h-4 w-4" />
            </Button>
          </div>
          <div className="text-sm text-muted-foreground">
            Order #{orderId.slice(-8)}
          </div>
        </CardHeader>
        
        <CardContent className="flex-1 flex flex-col p-0">
          <ScrollArea className="flex-1 p-4">
            {isLoading ? (
              <div className="flex items-center justify-center py-8">
                <div className="text-sm text-muted-foreground">Loading messages...</div>
              </div>
            ) : messages.length === 0 ? (
              <div className="flex items-center justify-center py-8">
                <div className="text-sm text-muted-foreground text-center">
                  No messages yet.<br />
                  Start a conversation with your operator!
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                {messages.map((message) => {
                  const isFromUser = message.sender_id === user?.id;
                  return (
                    <div
                      key={message.id}
                      className={`flex ${isFromUser ? 'justify-end' : 'justify-start'}`}
                    >
                       <div
                        className={`max-w-[80%] rounded-lg p-3 relative ${
                          isFromUser
                            ? 'bg-primary text-primary-foreground'
                            : 'bg-muted'
                        }`}
                      >
                        {!isFromUser && !message.is_read && (
                          <div className="absolute -top-1 -right-1 w-3 h-3 bg-blue-500 rounded-full"></div>
                        )}
                        <div className="text-sm">{message.message}</div>
                        <div className={`text-xs mt-1 opacity-70 ${
                          isFromUser ? 'text-primary-foreground' : 'text-muted-foreground'
                        }`}>
                          {formatTime(message.created_at)}
                        </div>
                      </div>
                    </div>
                  );
                })}
                <div ref={messagesEndRef} />
              </div>
            )}
          </ScrollArea>
          
          <div className="border-t p-4">
            <div className="flex gap-2">
              <Input
                placeholder="Type your message..."
                value={newMessage}
                onChange={(e) => setNewMessage(e.target.value)}
                onKeyPress={handleKeyPress}
                disabled={!operatorId || isSending}
              />
              <Button 
                onClick={sendMessage}
                disabled={!newMessage.trim() || !operatorId || isSending}
                size="sm"
              >
                <Send className="h-4 w-4" />
              </Button>
            </div>
            {!operatorId && (
              <div className="text-xs text-muted-foreground mt-2">
                Messaging will be available once an operator is assigned
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}