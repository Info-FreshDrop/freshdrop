import { supabase } from "@/integrations/supabase/client";
import { Button } from "./ui/button";
import { useToast } from "./ui/use-toast";

export const TestEmail = () => {
  const { toast } = useToast();

  const testEmail = async () => {
    try {
      const { data, error } = await supabase.functions.invoke('test-email', {
        body: {}
      });

      if (error) {
        console.error('Error:', error);
        toast({
          title: "Error",
          description: `Failed to send test email: ${error.message}`,
          variant: "destructive",
        });
        return;
      }

      console.log('Test email response:', data);
      toast({
        title: "Success",
        description: "Test email sent! Check the operator email.",
      });
    } catch (error) {
      console.error('Error calling test-email function:', error);
      toast({
        title: "Error",
        description: "Failed to call test email function",
        variant: "destructive",
      });
    }
  };

  return (
    <div className="p-4">
      <Button onClick={testEmail}>
        Send Test Email
      </Button>
    </div>
  );
};