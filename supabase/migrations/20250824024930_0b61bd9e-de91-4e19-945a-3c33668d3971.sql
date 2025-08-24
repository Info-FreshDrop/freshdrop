-- Create table for onboarding content sections
CREATE TABLE public.onboarding_content (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  section_type text NOT NULL CHECK (section_type IN ('training_video', 'training_image', 'training_text', 'quiz_question')),
  title text NOT NULL,
  content text,
  media_url text,
  display_order integer NOT NULL DEFAULT 0,
  is_active boolean NOT NULL DEFAULT true,
  quiz_data jsonb, -- For quiz questions: {question, options: [a,b,c,d], correct_answer: 'a', explanation}
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.onboarding_content ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Everyone can view active onboarding content" 
ON public.onboarding_content 
FOR SELECT 
USING (is_active = true);

CREATE POLICY "Owners can manage onboarding content" 
ON public.onboarding_content 
FOR ALL 
USING (has_role(auth.uid(), 'owner'::app_role));

-- Create trigger for updated_at
CREATE TRIGGER update_onboarding_content_updated_at
BEFORE UPDATE ON public.onboarding_content
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Insert default training content
INSERT INTO public.onboarding_content (section_type, title, content, display_order) VALUES
('training_text', 'Welcome to FreshDrop Training', 'As a FreshDrop operator, you are the face of our brand and the key to customer satisfaction. This training will prepare you for success.', 1),
('training_text', 'Quality Standards', 'Every item must be treated with care. Sort items by color and fabric type. Use appropriate wash temperatures and gentle detergents for delicate items.', 2),
('training_text', 'Customer Communication', 'Always communicate professionally and promptly. If there are any issues with an order, contact the customer immediately through the app messaging system.', 3),
('training_text', 'Time Management', 'Respect pickup and delivery windows. Always arrive within the scheduled time frame. If delays occur, notify customers at least 30 minutes in advance.', 4),
('training_text', 'Safety Protocols', 'Wear protective equipment when handling chemicals. Ensure proper ventilation in laundry areas. Keep workspace clean and organized at all times.', 5);

-- Insert default quiz questions
INSERT INTO public.onboarding_content (section_type, title, display_order, quiz_data) VALUES
('quiz_question', 'Quality Standards Quiz', 10, '{"question": "When washing delicate items, you should:", "options": ["Use hot water and regular detergent", "Use cold water and gentle detergent", "Use bleach for better cleaning", "Skip fabric softener always"], "correct_answer": "b", "explanation": "Delicate items require cold water and gentle detergent to prevent damage."}'),
('quiz_question', 'Communication Quiz', 11, '{"question": "If you encounter a stain that won''t come out, what should you do?", "options": ["Try stronger chemicals without asking", "Contact the customer immediately", "Ignore it and deliver anyway", "Attempt to hide the stain"], "correct_answer": "b", "explanation": "Always communicate with customers about any issues to maintain trust and transparency."}'),
('quiz_question', 'Time Management Quiz', 12, '{"question": "How far in advance should you notify customers about delays?", "options": ["5 minutes before", "At the scheduled time", "30 minutes minimum", "After the delay occurs"], "correct_answer": "c", "explanation": "Customers appreciate advance notice to adjust their schedules accordingly."}'),
('quiz_question', 'Safety Quiz', 13, '{"question": "Which safety equipment is essential when handling laundry chemicals?", "options": ["Sunglasses only", "Gloves and proper ventilation", "Just an apron", "No equipment needed"], "correct_answer": "b", "explanation": "Protective gloves and proper ventilation prevent chemical exposure and inhalation."}'),
('quiz_question', 'Customer Service Quiz', 14, '{"question": "What is the most important aspect of customer service?", "options": ["Speed over quality", "Professional communication", "Lowest price possible", "Working alone"], "correct_answer": "b", "explanation": "Professional communication builds trust and ensures customer satisfaction."}'),
('quiz_question', 'Order Handling Quiz', 15, '{"question": "When should you take photos during the laundry process?", "options": ["Never take photos", "Only at pickup", "At pickup and key process steps", "Only when there are problems"], "correct_answer": "c", "explanation": "Photos at pickup and key steps provide transparency and help track order progress."}'),
('quiz_question', 'Problem Resolution Quiz', 16, '{"question": "If a customer is unsatisfied with the service, you should:", "options": ["Argue with the customer", "Contact FreshDrop support immediately", "Ignore the complaint", "Offer a discount without authorization"], "correct_answer": "b", "explanation": "FreshDrop support is trained to handle customer concerns professionally and fairly."}'),
('quiz_question', 'Equipment Quiz', 17, '{"question": "How often should you clean your washing machine?", "options": ["Once a year", "Monthly", "After every order", "Only when it breaks"], "correct_answer": "b", "explanation": "Monthly cleaning prevents buildup and ensures optimal performance for customer orders."}'),
('quiz_question', 'Final Assessment', 18, '{"question": "What is your primary goal as a FreshDrop operator?", "options": ["Complete orders as fast as possible", "Provide excellent customer service and quality", "Minimize communication with customers", "Focus only on profit"], "correct_answer": "b", "explanation": "Quality service and customer satisfaction are the foundation of FreshDrop''s success."}'),
('quiz_question', 'Completion Quiz', 19, '{"question": "After completing this training, you understand that FreshDrop values:", "options": ["Speed over everything", "Quality, communication, and professionalism", "Minimum effort required", "Working without guidelines"], "correct_answer": "b", "explanation": "FreshDrop''s success depends on operators who prioritize quality, communication, and professionalism."}');