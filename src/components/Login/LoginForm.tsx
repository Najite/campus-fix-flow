
import React, { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { User, Lock, Building2, Database } from 'lucide-react';

interface LoginFormProps {
  role: 'student' | 'admin' | 'maintenance';
}

const LoginForm = ({ role }: LoginFormProps) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isPopulating, setIsPopulating] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();
  const { toast } = useToast();
  const { signIn } = useAuth();

  const getRoleInfo = () => {
    switch (role) {
      case 'student':
        return {
          title: 'Student Portal',
          description: 'Submit and track maintenance complaints',
          icon: <User className="h-6 w-6" />,
          color: 'bg-blue-500',
          defaultCreds: { email: 'student@campus.edu', password: 'student123' }
        };
      case 'admin':
        return {
          title: 'Administrator Portal',
          description: 'Manage complaints and assignments',
          icon: <Building2 className="h-6 w-6" />,
          color: 'bg-green-500',
          defaultCreds: { email: 'admin@campus.edu', password: 'admin123' }
        };
      case 'maintenance':
        return {
          title: 'Maintenance Portal',
          description: 'View and update assigned work orders',
          icon: <Lock className="h-6 w-6" />,
          color: 'bg-orange-500',
          defaultCreds: { email: 'maintenance@campus.edu', password: 'maintenance123' }
        };
    }
  };

  const roleInfo = getRoleInfo();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      const { error } = await signIn(email, password);
      
      if (error) {
        toast({
          title: 'Login Failed',
          description: error.message,
          variant: 'destructive',
        });
        setIsLoading(false);
        return;
      }

      toast({
        title: 'Login Successful',
        description: 'Welcome back!',
      });

      // Redirect to appropriate dashboard
      const from = location.state?.from?.pathname || `/${role}`;
      navigate(from);
    } catch (error) {
      toast({
        title: 'Login Error',
        description: 'An unexpected error occurred',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleDemoLogin = () => {
    setEmail(roleInfo.defaultCreds.email);
    setPassword(roleInfo.defaultCreds.password);
  };

  const handlePopulateData = async () => {
    setIsPopulating(true);
    try {
      const { data, error } = await supabase.functions.invoke('populate-sample-data');
      
      if (error) throw error;
      
      const userCount = data?.users?.filter((u: any) => u.success)?.length || 0;
      const complaintCount = data?.complaints?.filter((c: any) => c.success)?.length || 0;
      
      toast({
        title: "Database Populated!",
        description: `Created ${userCount} users and ${complaintCount} complaints. You can now use the demo credentials above to login.`,
      });
    } catch (error) {
      console.error('Error populating data:', error);
      toast({
        title: "Error",
        description: error?.message || "Failed to populate database",
        variant: "destructive",
      });
    } finally {
      setIsPopulating(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
      <Card className="w-full max-w-md">
        <CardHeader className="space-y-1">
          <div className={`${roleInfo.color} w-12 h-12 rounded-lg flex items-center justify-center text-white mx-auto mb-4`}>
            {roleInfo.icon}
          </div>
          <CardTitle className="text-2xl text-center">{roleInfo.title}</CardTitle>
          <CardDescription className="text-center">
            {roleInfo.description}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="Enter your email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                placeholder="Enter your password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </div>
            <Button type="submit" className="w-full" disabled={isLoading}>
              {isLoading ? 'Signing in...' : 'Sign In'}
            </Button>
          </form>
          
          <div className="mt-6 space-y-4">
            <div className="p-4 bg-purple-50 rounded-lg border border-purple-200">
              <p className="text-sm text-purple-900 font-medium mb-2">First time setup:</p>
              <Button 
                onClick={handlePopulateData}
                disabled={isPopulating}
                variant="outline"
                size="sm"
                className="w-full border-purple-300 text-purple-700 hover:bg-purple-100"
              >
                {isPopulating ? (
                  <>
                    <Database className="h-4 w-4 mr-2 animate-spin" />
                    Creating Sample Data...
                  </>
                ) : (
                  <>
                    <Database className="h-4 w-4 mr-2" />
                    Create Sample Data & Users
                  </>
                )}
              </Button>
              <p className="text-xs text-purple-600 mt-1">
                Click to create demo users and complaints for testing
              </p>
            </div>
            
            <div className="p-4 bg-gray-50 rounded-lg">
              <p className="text-sm text-gray-600 mb-2">Demo Credentials:</p>
              <div className="text-xs text-gray-500 space-y-1">
                <p><strong>Email:</strong> {roleInfo.defaultCreds.email}</p>
                <p><strong>Password:</strong> {roleInfo.defaultCreds.password}</p>
              </div>
              <Button 
                type="button" 
                variant="outline" 
                size="sm" 
                className="mt-2 w-full"
                onClick={handleDemoLogin}
              >
                Use Demo Credentials
              </Button>
            </div>
          </div>
          
          <div className="mt-4 text-center">
            <div className="text-sm text-gray-500">
              Access other portals:
            </div>
            <div className="mt-2 space-x-2">
              {role !== 'student' && (
                <Button variant="link" size="sm" onClick={() => navigate('/login/student')}>
                  Student
                </Button>
              )}
              {role !== 'admin' && (
                <Button variant="link" size="sm" onClick={() => navigate('/login/admin')}>
                  Admin
                </Button>
              )}
              {role !== 'maintenance' && (
                <Button variant="link" size="sm" onClick={() => navigate('/login/maintenance')}>
                  Maintenance
                </Button>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default LoginForm;
