
import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { getCurrentUser } from '@/utils/auth';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { User, Building2, Wrench } from 'lucide-react';

const Index = () => {
  const navigate = useNavigate();
  const currentUser = getCurrentUser();

  useEffect(() => {
    // If user is already logged in, redirect to their dashboard
    if (currentUser) {
      navigate(`/${currentUser.role}`);
    }
  }, [currentUser, navigate]);

  const portals = [
    {
      role: 'student',
      title: 'Student Portal',
      description: 'Submit and track maintenance complaints',
      icon: <User className="h-8 w-8" />,
      color: 'bg-blue-500 hover:bg-blue-600',
      path: '/login/student'
    },
    {
      role: 'admin',
      title: 'Administrator Portal',
      description: 'Manage complaints and assignments',
      icon: <Building2 className="h-8 w-8" />,
      color: 'bg-green-500 hover:bg-green-600',
      path: '/login/admin'
    },
    {
      role: 'maintenance',
      title: 'Maintenance Portal',
      description: 'View and update work orders',
      icon: <Wrench className="h-8 w-8" />,
      color: 'bg-orange-500 hover:bg-orange-600',
      path: '/login/maintenance'
    }
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center px-4">
      <div className="max-w-4xl w-full">
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold text-gray-900 mb-4">
            Campus Maintenance System
          </h1>
          <p className="text-xl text-gray-600 mb-8">
            Comprehensive complaint tracking and resolution system
          </p>
          <div className="bg-white rounded-lg shadow-lg p-6 mb-8">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Demo Login Credentials</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
              <div className="p-3 bg-blue-50 rounded-lg">
                <h3 className="font-medium text-blue-900 mb-2">Student</h3>
                <p className="text-blue-700">Username: <strong>student</strong></p>
                <p className="text-blue-700">Password: <strong>student123</strong></p>
              </div>
              <div className="p-3 bg-green-50 rounded-lg">
                <h3 className="font-medium text-green-900 mb-2">Administrator</h3>
                <p className="text-green-700">Username: <strong>admin</strong></p>
                <p className="text-green-700">Password: <strong>admin123</strong></p>
              </div>
              <div className="p-3 bg-orange-50 rounded-lg">
                <h3 className="font-medium text-orange-900 mb-2">Maintenance</h3>
                <p className="text-orange-700">Username: <strong>maintenance</strong></p>
                <p className="text-orange-700">Password: <strong>maintenance123</strong></p>
              </div>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {portals.map((portal) => (
            <Card key={portal.role} className="hover:shadow-lg transition-shadow cursor-pointer">
              <CardHeader className="text-center">
                <div className={`${portal.color} w-16 h-16 rounded-full flex items-center justify-center text-white mx-auto mb-4`}>
                  {portal.icon}
                </div>
                <CardTitle className="text-xl">{portal.title}</CardTitle>
                <CardDescription className="text-center">
                  {portal.description}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Button 
                  onClick={() => navigate(portal.path)}
                  className={`w-full ${portal.color} text-white`}
                >
                  Access Portal
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>

        <div className="mt-12 text-center">
          <div className="bg-white rounded-lg shadow-lg p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">System Features</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 text-sm text-gray-600">
              <div>✓ Multi-user role system</div>
              <div>✓ Real-time chat interface</div>
              <div>✓ Email notifications</div>
              <div>✓ Image upload support</div>
              <div>✓ Status tracking</div>
              <div>✓ Priority management</div>
              <div>✓ Analytics dashboard</div>
              <div>✓ Mobile responsive</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Index;
