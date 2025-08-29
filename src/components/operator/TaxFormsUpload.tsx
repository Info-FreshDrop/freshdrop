import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Upload, FileText, CheckCircle } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface TaxFormsUploadProps {
  onComplete: () => void;
}

export const TaxFormsUpload: React.FC<TaxFormsUploadProps> = ({ onComplete }) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [uploading, setUploading] = useState(false);
  const [formData, setFormData] = useState({
    taxId: '',
    businessName: '',
    isContractor: true
  });
  const [w9File, setW9File] = useState<File | null>(null);

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      // Validate file type and size
      if (file.type !== 'application/pdf' && !file.type.startsWith('image/')) {
        toast({
          title: "Invalid file type",
          description: "Please upload a PDF or image file",
          variant: "destructive"
        });
        return;
      }
      
      if (file.size > 10 * 1024 * 1024) { // 10MB limit
        toast({
          title: "File too large",
          description: "Please upload a file smaller than 10MB",
          variant: "destructive"
        });
        return;
      }
      
      setW9File(file);
    }
  };

  const uploadFile = async (file: File): Promise<string> => {
    const fileExt = file.name.split('.').pop();
    const fileName = `${user?.id}/w9-${Date.now()}.${fileExt}`;
    
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
    
    if (!w9File) {
      toast({
        title: "Missing W-9 Form",
        description: "Please upload your W-9 tax form",
        variant: "destructive"
      });
      return;
    }

    if (!formData.taxId) {
      toast({
        title: "Missing Tax ID",
        description: "Please enter your Tax ID or SSN",
        variant: "destructive"
      });
      return;
    }

    setUploading(true);

    try {
      // Upload W-9 file
      const w9Url = await uploadFile(w9File);

      // Update profile with tax information
      const { error } = await supabase
        .from('profiles')
        .update({
          tax_id: formData.taxId,
          business_name: formData.businessName || null,
          is_contractor: formData.isContractor,
          w9_completed: true,
          w9_file_url: w9Url
        })
        .eq('user_id', user?.id);

      if (error) throw error;

      toast({
        title: "Tax forms uploaded successfully!",
        description: "Your tax information has been saved."
      });

      onComplete();
    } catch (error) {
      console.error('Error uploading tax forms:', error);
      toast({
        title: "Upload failed",
        description: "Failed to upload tax forms. Please try again.",
        variant: "destructive"
      });
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="text-center space-y-2">
        <FileText className="h-12 w-12 mx-auto text-primary" />
        <h2 className="text-2xl font-semibold">Tax Documentation</h2>
        <p className="text-muted-foreground">
          Upload your tax forms to complete your contractor setup
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Tax Information</CardTitle>
            <CardDescription>
              This information is required for tax reporting purposes
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="taxId">Tax ID / SSN *</Label>
              <Input
                id="taxId"
                type="text"
                placeholder="XXX-XX-XXXX"
                value={formData.taxId}
                onChange={(e) => setFormData(prev => ({ ...prev, taxId: e.target.value }))}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="businessName">Business Name (Optional)</Label>
              <Input
                id="businessName"
                type="text"
                placeholder="Your Business Name"
                value={formData.businessName}
                onChange={(e) => setFormData(prev => ({ ...prev, businessName: e.target.value }))}
              />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>W-9 Form Upload</CardTitle>
            <CardDescription>
              Upload your completed W-9 tax form
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="w9File">W-9 Tax Form *</Label>
              <div className="flex items-center gap-4">
                <Input
                  id="w9File"
                  type="file"
                  accept=".pdf,.jpg,.jpeg,.png"
                  onChange={handleFileChange}
                  className="flex-1"
                />
                {w9File && (
                  <div className="flex items-center gap-2 text-green-600">
                    <CheckCircle className="h-4 w-4" />
                    <span className="text-sm">{w9File.name}</span>
                  </div>
                )}
              </div>
              <p className="text-xs text-muted-foreground">
                Accepted formats: PDF, JPG, PNG (max 10MB)
              </p>
            </div>

            <div className="bg-blue-50 p-4 rounded-lg">
              <h4 className="font-medium text-blue-900 mb-2">Need a W-9 form?</h4>
              <p className="text-sm text-blue-800 mb-2">
                You can download the official W-9 form from the IRS website or use our pre-filled template.
              </p>
              <div className="flex gap-2">
                <Button 
                  type="button" 
                  variant="outline" 
                  size="sm"
                  onClick={() => window.open('/forms/fw9.pdf', '_blank')}
                >
                  Download W-9 Form
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        <div className="flex justify-between">
          <Button type="button" variant="outline" disabled={uploading}>
            Skip for Now
          </Button>
          <Button type="submit" disabled={uploading}>
            {uploading ? (
              <>
                <Upload className="h-4 w-4 mr-2 animate-spin" />
                Uploading...
              </>
            ) : (
              <>
                <Upload className="h-4 w-4 mr-2" />
                Upload & Continue
              </>
            )}
          </Button>
        </div>
      </form>
    </div>
  );
};