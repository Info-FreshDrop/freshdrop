import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ArrowLeft, Mail, Lock, Shield, Users, Megaphone } from "lucide-react";

interface OperatorLoginProps {
  onBack: () => void;
}

export function OperatorLogin({ onBack }: OperatorLoginProps) {
  const [role, setRole] = useState<string>("");
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    // Simulate API call
    await new Promise(resolve => setTimeout(resolve, 1500));
    setIsLoading(false);
  };

  const getRoleIcon = (roleValue: string) => {
    switch (roleValue) {
      case "owner":
        return <Shield className="h-4 w-4" />;
      case "operator":
        return <Users className="h-4 w-4" />;
      case "marketing":
        return <Megaphone className="h-4 w-4" />;
      default:
        return null;
    }
  };

  const getRoleDescription = (roleValue: string) => {
    switch (roleValue) {
      case "owner":
        return "Full system access and management";
      case "operator":
        return "Order and washer management";
      case "marketing":
        return "Promotions and campaign management";
      default:
        return "Select your role to continue";
    }
  };

  return (
    <div className="w-full max-w-md mx-auto">
      <div className="mb-6">
        <Button
          variant="ghost"
          onClick={onBack}
          className="p-0 h-auto text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Customer Login
        </Button>
      </div>

      <Card className="border-0 shadow-soft">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl bg-gradient-primary bg-clip-text text-transparent">
            Operator Portal
          </CardTitle>
          <CardDescription>
            Sign in with your operator credentials
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="role">Role</Label>
              <Select value={role} onValueChange={setRole} required>
                <SelectTrigger>
                  <SelectValue placeholder="Select your role" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="owner">
                    <div className="flex items-center gap-2">
                      <Shield className="h-4 w-4" />
                      Owner
                    </div>
                  </SelectItem>
                  <SelectItem value="operator">
                    <div className="flex items-center gap-2">
                      <Users className="h-4 w-4" />
                      Operator
                    </div>
                  </SelectItem>
                  <SelectItem value="marketing">
                    <div className="flex items-center gap-2">
                      <Megaphone className="h-4 w-4" />
                      Marketing
                    </div>
                  </SelectItem>
                </SelectContent>
              </Select>
              {role && (
                <p className="text-sm text-muted-foreground flex items-center gap-2">
                  {getRoleIcon(role)}
                  {getRoleDescription(role)}
                </p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="operator-email">Email</Label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
                <Input
                  id="operator-email"
                  type="email"
                  placeholder="Enter your work email"
                  className="pl-10"
                  required
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="operator-password">Password</Label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
                <Input
                  id="operator-password"
                  type="password"
                  placeholder="Enter your password"
                  className="pl-10"
                  required
                />
              </div>
            </div>

            <Button 
              type="submit" 
              variant="default" 
              size="xl" 
              className="w-full"
              disabled={isLoading || !role}
            >
              {isLoading ? "Signing In..." : "Access Portal"}
            </Button>
          </form>
        </CardContent>
      </Card>

      <div className="mt-4 p-4 bg-gradient-wave rounded-lg border">
        <h4 className="font-semibold text-sm mb-2">Role Permissions:</h4>
        <div className="space-y-1 text-xs text-muted-foreground">
          <div className="flex items-center gap-2">
            <Shield className="h-3 w-3" />
            <span><strong>Owner:</strong> Full control of system, orders, drivers, lockers</span>
          </div>
          <div className="flex items-center gap-2">
            <Users className="h-3 w-3" />
            <span><strong>Operator:</strong> Manage orders and monitor washers</span>
          </div>
          <div className="flex items-center gap-2">
            <Megaphone className="h-3 w-3" />
            <span><strong>Marketing:</strong> Promotions and campaigns only</span>
          </div>
        </div>
      </div>
    </div>
  );
}