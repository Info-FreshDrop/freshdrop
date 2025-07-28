-- Create enum types
CREATE TYPE public.app_role AS ENUM ('customer', 'washer', 'operator', 'owner', 'marketing');
CREATE TYPE public.order_status AS ENUM ('placed', 'unclaimed', 'claimed', 'in_progress', 'washed', 'returned', 'completed', 'cancelled');
CREATE TYPE public.service_type AS ENUM ('wash_fold', 'wash_hang_dry', 'express');
CREATE TYPE public.pickup_type AS ENUM ('locker', 'pickup_delivery');
CREATE TYPE public.locker_status AS ENUM ('available', 'in_use', 'full', 'maintenance', 'closed');

-- Create profiles table
CREATE TABLE public.profiles (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
    first_name TEXT,
    last_name TEXT,
    phone TEXT,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create user_roles table
CREATE TABLE public.user_roles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    role app_role NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    UNIQUE (user_id, role)
);

-- Create service_areas table
CREATE TABLE public.service_areas (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    zip_code TEXT NOT NULL UNIQUE,
    allows_locker BOOLEAN DEFAULT true,
    allows_delivery BOOLEAN DEFAULT true,
    allows_express BOOLEAN DEFAULT true,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create lockers table
CREATE TABLE public.lockers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    address TEXT NOT NULL,
    zip_code TEXT NOT NULL,
    locker_count INTEGER DEFAULT 1,
    status locker_status DEFAULT 'available',
    qr_code TEXT,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create washers table
CREATE TABLE public.washers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    zip_codes TEXT[] DEFAULT '{}',
    locker_access UUID[] DEFAULT '{}',
    is_active BOOLEAN DEFAULT true,
    is_online BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create clothes_items table
CREATE TABLE public.clothes_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    category TEXT NOT NULL,
    price_cents INTEGER NOT NULL,
    description TEXT,
    image_url TEXT,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create orders table
CREATE TABLE public.orders (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    customer_id UUID NOT NULL REFERENCES auth.users(id),
    washer_id UUID REFERENCES auth.users(id),
    pickup_type pickup_type NOT NULL,
    service_type service_type NOT NULL,
    status order_status DEFAULT 'placed',
    
    -- Address/Location info
    pickup_address TEXT,
    delivery_address TEXT,
    locker_id UUID REFERENCES public.lockers(id),
    zip_code TEXT NOT NULL,
    
    -- Service details
    is_express BOOLEAN DEFAULT false,
    pickup_window_start TIMESTAMP WITH TIME ZONE,
    pickup_window_end TIMESTAMP WITH TIME ZONE,
    delivery_window_start TIMESTAMP WITH TIME ZONE,
    delivery_window_end TIMESTAMP WITH TIME ZONE,
    
    -- Order details
    items JSONB DEFAULT '[]',
    special_instructions TEXT,
    bag_count INTEGER DEFAULT 1,
    total_amount_cents INTEGER NOT NULL,
    
    -- Tracking
    pickup_photo_url TEXT,
    delivery_photo_url TEXT,
    claimed_at TIMESTAMP WITH TIME ZONE,
    completed_at TIMESTAMP WITH TIME ZONE,
    
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on all tables
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.service_areas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lockers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.washers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.clothes_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;

-- Create security definer functions for role checking
CREATE OR REPLACE FUNCTION public.get_user_role(user_uuid UUID)
RETURNS app_role
LANGUAGE SQL
SECURITY DEFINER
STABLE
AS $$
  SELECT role FROM public.user_roles WHERE user_id = user_uuid LIMIT 1;
$$;

CREATE OR REPLACE FUNCTION public.has_role(user_uuid UUID, check_role app_role)
RETURNS BOOLEAN
LANGUAGE SQL
SECURITY DEFINER
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles 
    WHERE user_id = user_uuid AND role = check_role
  );
$$;

CREATE OR REPLACE FUNCTION public.is_admin_role(user_uuid UUID)
RETURNS BOOLEAN
LANGUAGE SQL
SECURITY DEFINER
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles 
    WHERE user_id = user_uuid AND role IN ('owner', 'operator')
  );
$$;

-- RLS Policies for profiles
CREATE POLICY "Users can view own profile" ON public.profiles
FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can update own profile" ON public.profiles
FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own profile" ON public.profiles
FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Admins can view all profiles" ON public.profiles
FOR SELECT USING (public.is_admin_role(auth.uid()));

-- RLS Policies for user_roles
CREATE POLICY "Users can view own roles" ON public.user_roles
FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Owners can manage all roles" ON public.user_roles
FOR ALL USING (public.has_role(auth.uid(), 'owner'));

-- RLS Policies for service_areas
CREATE POLICY "Everyone can view active service areas" ON public.service_areas
FOR SELECT USING (is_active = true);

CREATE POLICY "Admins can manage service areas" ON public.service_areas
FOR ALL USING (public.is_admin_role(auth.uid()));

-- RLS Policies for lockers
CREATE POLICY "Everyone can view active lockers" ON public.lockers
FOR SELECT USING (is_active = true);

CREATE POLICY "Admins can manage lockers" ON public.lockers
FOR ALL USING (public.is_admin_role(auth.uid()));

-- RLS Policies for washers
CREATE POLICY "Washers can view own data" ON public.washers
FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Washers can update own status" ON public.washers
FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Admins can manage all washers" ON public.washers
FOR ALL USING (public.is_admin_role(auth.uid()));

-- RLS Policies for clothes_items
CREATE POLICY "Everyone can view active items" ON public.clothes_items
FOR SELECT USING (is_active = true);

CREATE POLICY "Owners can manage items" ON public.clothes_items
FOR ALL USING (public.has_role(auth.uid(), 'owner'));

-- RLS Policies for orders
CREATE POLICY "Customers can view own orders" ON public.orders
FOR SELECT USING (auth.uid() = customer_id);

CREATE POLICY "Customers can create orders" ON public.orders
FOR INSERT WITH CHECK (auth.uid() = customer_id);

CREATE POLICY "Washers can view assigned orders" ON public.orders
FOR SELECT USING (auth.uid() = washer_id);

CREATE POLICY "Washers can update assigned orders" ON public.orders
FOR UPDATE USING (auth.uid() = washer_id);

CREATE POLICY "Washers can view unclaimed orders in their area" ON public.orders
FOR SELECT USING (
  status = 'unclaimed' AND 
  public.has_role(auth.uid(), 'washer') AND
  EXISTS (
    SELECT 1 FROM public.washers w 
    WHERE w.user_id = auth.uid() 
    AND (zip_code = ANY(w.zip_codes) OR locker_id = ANY(w.locker_access))
  )
);

CREATE POLICY "Admins can manage all orders" ON public.orders
FOR ALL USING (public.is_admin_role(auth.uid()));

-- Create function to handle new user signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = ''
AS $$
BEGIN
  INSERT INTO public.profiles (user_id, first_name, last_name)
  VALUES (
    NEW.id,
    NEW.raw_user_meta_data ->> 'first_name',
    NEW.raw_user_meta_data ->> 'last_name'
  );
  
  -- Assign default customer role
  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, 'customer');
  
  RETURN NEW;
END;
$$;

-- Create trigger for new users
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Create function to update timestamps
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create update triggers
CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_lockers_updated_at
  BEFORE UPDATE ON public.lockers
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_washers_updated_at
  BEFORE UPDATE ON public.washers
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_clothes_items_updated_at
  BEFORE UPDATE ON public.clothes_items
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_orders_updated_at
  BEFORE UPDATE ON public.orders
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Insert sample data
INSERT INTO public.service_areas (zip_code, allows_locker, allows_delivery, allows_express) VALUES
('10001', true, true, true),
('10002', true, true, false),
('10003', false, true, true);

INSERT INTO public.lockers (name, address, zip_code, locker_count, qr_code) VALUES
('Central Park Locker', '123 Central Park West, New York, NY', '10001', 12, 'QR001'),
('Times Square Locker', '456 Broadway, New York, NY', '10002', 8, 'QR002'),
('Brooklyn Heights Locker', '789 Brooklyn Heights Promenade, Brooklyn, NY', '10003', 6, 'QR003');

INSERT INTO public.clothes_items (name, category, price_cents, description) VALUES
('Standard Wash & Fold', 'Regular', 1500, 'Regular wash and fold service per bag'),
('Delicate Wash & Hang Dry', 'Delicate', 2000, 'Gentle wash and hang dry for delicate items'),
('Express Service', 'Express', 2500, 'Same-day express service (order by 12 PM)'),
('Comforter/Bedding', 'Special', 3000, 'Large bedding items and comforters'),
('Dry Clean Only', 'Special', 3500, 'Items requiring professional dry cleaning');