import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { FileText, Download, Send, Calendar, DollarSign, AlertTriangle } from "lucide-react";

interface TaxDocument {
  id: string;
  contractor_id: string;
  tax_year: number;
  document_type: string;
  total_earnings_cents: number;
  document_url: string | null;
  generated_at: string | null;
  sent_at: string | null;
  status: string;
  contractor_name: string;
  contractor_email: string;
}

interface TaxDocumentManagementProps {
  contractors: any[];
}

export const TaxDocumentManagement = ({ contractors }: TaxDocumentManagementProps) => {
  const [taxDocuments, setTaxDocuments] = useState<TaxDocument[]>([]);
  const [selectedYear, setSelectedYear] = useState<number>(new Date().getFullYear());
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const { toast } = useToast();

  const loadTaxDocuments = async () => {
    try {
      // Get tax documents
      const { data: taxDocsData, error: taxDocsError } = await supabase
        .from('tax_documents')
        .select('*')
        .eq('tax_year', selectedYear)
        .order('total_earnings_cents', { ascending: false });

      if (taxDocsError) throw taxDocsError;

      if (!taxDocsData || taxDocsData.length === 0) {
        setTaxDocuments([]);
        return;
      }

      // Get contractor names for the documents
      const contractorIds = taxDocsData.map(doc => doc.contractor_id);
      
      const { data: profilesData } = await supabase
        .from('profiles')
        .select('user_id, first_name, last_name, email')
        .in('user_id', contractorIds);

      const documentsWithNames = taxDocsData.map(doc => {
        const profile = profilesData?.find(p => p.user_id === doc.contractor_id);
        return {
          ...doc,
          contractor_name: profile ? `${profile.first_name} ${profile.last_name}` : 'Unknown Contractor',
          contractor_email: profile?.email || 'No email',
        };
      });

      setTaxDocuments(documentsWithNames);
    } catch (error) {
      console.error('Error loading tax documents:', error);
      toast({
        title: "Error",
        description: "Failed to load tax documents",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadTaxDocuments();
  }, [selectedYear]);

  const generate1099Forms = async () => {
    setGenerating(true);
    try {
      const { data, error } = await supabase.functions.invoke('generate-1099-forms', {
        body: { tax_year: selectedYear },
      });

      if (error) throw error;

      toast({
        title: "Success",
        description: `Generated ${data.generated_count} 1099 forms for ${selectedYear}`,
      });

      loadTaxDocuments();
    } catch (error) {
      console.error('Error generating 1099 forms:', error);
      toast({
        title: "Error",
        description: "Failed to generate 1099 forms",
        variant: "destructive",
      });
    } finally {
      setGenerating(false);
    }
  };

  const send1099Form = async (documentId: string) => {
    try {
      const { error } = await supabase.functions.invoke('send-1099-form', {
        body: { document_id: documentId },
      });

      if (error) throw error;

      toast({
        title: "Success",
        description: "1099 form sent successfully",
      });

      loadTaxDocuments();
    } catch (error) {
      console.error('Error sending 1099 form:', error);
      toast({
        title: "Error",
        description: "Failed to send 1099 form",
        variant: "destructive",
      });
    }
  };

  const formatCurrency = (cents: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(cents / 100);
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'pending':
        return (
          <Badge variant="secondary">
            <AlertTriangle className="w-3 h-3 mr-1" />
            Pending
          </Badge>
        );
      case 'generated':
        return (
          <Badge variant="default">
            <FileText className="w-3 h-3 mr-1" />
            Generated
          </Badge>
        );
      case 'sent':
        return (
          <Badge variant="default" className="bg-green-500">
            <Send className="w-3 h-3 mr-1" />
            Sent
          </Badge>
        );
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  // Get contractors who earned $600+ in the selected year and need 1099s
  const eligibleContractors = contractors.filter(c => c.total_earnings >= 60000); // $600 in cents
  const totalEarningsForYear = eligibleContractors.reduce((sum, c) => sum + c.total_earnings, 0);

  const currentYear = new Date().getFullYear();
  const years = Array.from({ length: 5 }, (_, i) => currentYear - i);

  if (loading) {
    return <div className="flex justify-center p-8">Loading tax documents...</div>;
  }

  return (
    <div className="space-y-6">
      {/* Year Selection and Overview */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="w-5 h-5" />
            Tax Year Management
          </CardTitle>
          <CardDescription>
            Manage 1099-NEC forms and tax documents for contractors
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-4 mb-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Tax Year</label>
              <Select value={selectedYear.toString()} onValueChange={(value) => setSelectedYear(Number(value))}>
                <SelectTrigger className="w-32">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {years.map(year => (
                    <SelectItem key={year} value={year.toString()}>
                      {year}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid gap-4 md:grid-cols-3 flex-1">
              <div className="text-center p-4 border rounded-lg">
                <FileText className="w-8 h-8 mx-auto mb-2 text-muted-foreground" />
                <div className="text-2xl font-bold">{eligibleContractors.length}</div>
                <div className="text-sm text-muted-foreground">Eligible Contractors</div>
              </div>
              
              <div className="text-center p-4 border rounded-lg">
                <DollarSign className="w-8 h-8 mx-auto mb-2 text-muted-foreground" />
                <div className="text-2xl font-bold">{formatCurrency(totalEarningsForYear)}</div>
                <div className="text-sm text-muted-foreground">Total Earnings</div>
              </div>

              <div className="text-center p-4 border rounded-lg">
                <Send className="w-8 h-8 mx-auto mb-2 text-muted-foreground" />
                <div className="text-2xl font-bold">{taxDocuments.filter(d => d.status === 'sent').length}</div>
                <div className="text-sm text-muted-foreground">Forms Sent</div>
              </div>
            </div>
          </div>

          {selectedYear === currentYear && (
            <div className="flex gap-2">
              <Button 
                onClick={generate1099Forms}
                disabled={generating || eligibleContractors.length === 0}
              >
                {generating ? "Generating..." : `Generate ${selectedYear} 1099 Forms`}
              </Button>

              {eligibleContractors.length === 0 && (
                <p className="text-sm text-muted-foreground self-center">
                  No contractors earned $600+ this year
                </p>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Tax Documents List */}
      <Card>
        <CardHeader>
          <CardTitle>1099 Documents for {selectedYear}</CardTitle>
          <CardDescription>
            Generated tax documents and their delivery status
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {taxDocuments.length === 0 ? (
              <p className="text-center text-muted-foreground py-8">
                No tax documents found for {selectedYear}. Generate forms above to create 1099s for eligible contractors.
              </p>
            ) : (
              taxDocuments.map((document) => (
                <div key={document.id} className="flex items-center justify-between p-4 border rounded-lg">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <h3 className="font-medium">{document.contractor_name}</h3>
                      {getStatusBadge(document.status)}
                    </div>
                    <div className="text-sm text-muted-foreground">
                      {document.contractor_email} • {formatCurrency(document.total_earnings_cents)}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {document.generated_at && (
                        <span>Generated: {new Date(document.generated_at).toLocaleDateString()} • </span>
                      )}
                      {document.sent_at && (
                        <span>Sent: {new Date(document.sent_at).toLocaleDateString()}</span>
                      )}
                    </div>
                  </div>

                  <div className="flex gap-2">
                    {document.document_url && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => window.open(document.document_url!, '_blank')}
                      >
                        <Download className="w-4 h-4 mr-1" />
                        Download
                      </Button>
                    )}
                    
                    {document.status === 'generated' && (
                      <Button
                        size="sm"
                        onClick={() => send1099Form(document.id)}
                      >
                        <Send className="w-4 h-4 mr-1" />
                        Send
                      </Button>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};