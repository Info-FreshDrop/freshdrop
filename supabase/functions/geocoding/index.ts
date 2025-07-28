import { serve } from "https://deno.land/std@0.190.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { query, type = 'search' } = await req.json();
    const mapboxToken = Deno.env.get('MAPBOX_PUBLIC_TOKEN');

    if (!mapboxToken) {
      throw new Error('Mapbox token not configured');
    }

    if (!query) {
      throw new Error('Query parameter is required');
    }

    let response;
    
    if (type === 'search') {
      // Forward geocoding (address search)
      const url = `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(query)}.json?access_token=${mapboxToken}&country=US&limit=5&types=address`;
      response = await fetch(url);
    } else if (type === 'reverse') {
      // Reverse geocoding (coordinates to address)
      const [longitude, latitude] = query.split(',');
      const url = `https://api.mapbox.com/geocoding/v5/mapbox.places/${longitude},${latitude}.json?access_token=${mapboxToken}&types=address`;
      response = await fetch(url);
    } else {
      throw new Error('Invalid type parameter');
    }

    if (!response.ok) {
      throw new Error(`Mapbox API error: ${response.status}`);
    }

    const data = await response.json();
    
    // Format the response
    const suggestions = data.features?.map((feature: any) => ({
      display_name: feature.place_name,
      formatted: feature.place_name,
      coordinates: feature.center,
      address_components: feature.context || []
    })) || [];

    return new Response(
      JSON.stringify({ suggestions }),
      { 
        headers: { 
          'Content-Type': 'application/json',
          ...corsHeaders 
        } 
      }
    );

  } catch (error) {
    console.error('Geocoding error:', error);
    return new Response(
      JSON.stringify({ 
        error: error.message,
        suggestions: []
      }),
      { 
        status: 400,
        headers: { 
          'Content-Type': 'application/json',
          ...corsHeaders 
        } 
      }
    );
  }
});