
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Plus, MessageSquare, Clock, CheckCircle, AlertCircle } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import ComplaintForm from '../Complaints/ComplaintForm';
import ComplaintList from '../Complaints/ComplaintList';
import { ChatInterface } from '../Chat/ChatInterface';

interface Complaint {
  id: string;
  student_id: string;
  title: string;
  description: string;
  category: string;
  priority: string;
  status: string;
  building: string;
  room_number: string;
  specific_location?: string;
  images?: string[];
  assigned_to?: string;
  created_at: string;
  updated_at: string;
  resolved_at?: string;
  completion_images?: string[];
  student_name?: string;
  assigned_to_name?: string;
}

const StudentDashboard = () => {
  const [complaints, setComplaints] = useState<Complaint[]>([]);
  const [showComplaintForm, setShowComplaintForm] = useState(false);
  const [selectedComplaintId, setSelectedComplaintId] = useState<string | null>(null);
  const { user, profile } = useAuth();

  useEffect(() => {
    if (user) {
      loadComplaints();
    }
  }, [user]);

  const loadComplaints = () => {
    if (profile) {
      loadComplaintsFromDB();
    }
  };

  const loadComplaintsFromDB = async () => {
    try {
      const { data, error } = await supabase
        .from('complaints')
        .select(`
          *,
          student:profiles!complaints_student_id_fkey(name),
          assigned_user:profiles!complaints_assigned_to_fkey(name)
        `)
        .eq('student_id', profile.id)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error loading complaints:', error);
        return;
      }

      // Transform the data to match the expected format
      const transformedComplaints = data.map(complaint => ({
        ...complaint,
        student_name: complaint.student?.name || profile.name,
        assigned_to_name: complaint.assigned_user?.name || null
      }));

      setComplaints(transformedComplaints);
    } catch (error) {
      console.error('Error loading complaints:', error);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'submitted': return 'bg-blue-100 text-blue-800';
      case 'assigned': return 'bg-yellow-100 text-yellow-800';
      case 'in-progress': return 'bg-orange-100 text-orange-800';
      case 'resolved': return 'bg-green-100 text-green-800';
      case 'closed': return 'bg-gray-100 text-gray-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'low': return 'bg-green-100 text-green-800';
      case 'medium': return 'bg-yellow-100 text-yellow-800';
      case 'high': return 'bg-orange-100 text-orange-800';
      case 'urgent': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const stats = {
    total: complaints.length,
    pending: complaints.filter(c => ['submitted', 'assigned', 'in-progress'].includes(c.status)).length,
    resolved: complaints.filter(c => c.status === 'resolved').length,
    urgent: complaints.filter(c => c.priority === 'urgent').length,
  };

  if (showComplaintForm) {
    return (
      <ComplaintForm
        onSubmit={() => {
          setShowComplaintForm(false);
          loadComplaints();
        }}
        onCancel={() => setShowComplaintForm(false)}
      />
    );
  }

  if (selectedComplaintId) {
    const selectedComplaint = complaints.find(c => c.id === selectedComplaintId);
    if (selectedComplaint) {
      // Transform to match ChatInterface expected format
      const transformedComplaint = {
        id: selectedComplaint.id,
        studentId: selectedComplaint.student_id,
        studentName: selectedComplaint.student_name || profile?.name || 'Unknown',
        title: selectedComplaint.title,
        description: selectedComplaint.description,
        category: selectedComplaint.category as 'plumbing' | 'electrical' | 'hvac' | 'structural' | 'cleaning' | 'other',
        priority: selectedComplaint.priority as 'low' | 'medium' | 'high' | 'urgent',
        status: selectedComplaint.status as 'submitted' | 'assigned' | 'in-progress' | 'resolved' | 'closed',
        location: {
          building: selectedComplaint.building,
          roomNumber: selectedComplaint.room_number,
          specificLocation: selectedComplaint.specific_location || ''
        },
        images: selectedComplaint.images || [],
        completion_images: selectedComplaint.completion_images || [],
        assignedTo: selectedComplaint.assigned_to,
        assignedToName: selectedComplaint.assigned_to_name,
        createdAt: selectedComplaint.created_at,
        updatedAt: selectedComplaint.updated_at,
        resolvedAt: selectedComplaint.resolved_at,
        notes: [] // Will be loaded from chat messages
      };

      return (
        <ChatInterface
          complaint={transformedComplaint}
          onBack={() => setSelectedComplaintId(null)}
        />
      );
    }
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-white border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="py-6">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-2xl font-bold text-gray-900">Student Dashboard</h1>
                <p className="text-gray-600">Welcome back, {profile?.name}</p>
              </div>
              <Button onClick={() => setShowComplaintForm(true)} className="bg-blue-600 hover:bg-blue-700">
                <Plus className="h-4 w-4 mr-2" />
                New Complaint
              </Button>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Complaints</CardTitle>
              <AlertCircle className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.total}</div>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Pending</CardTitle>
              <Clock className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-orange-600">{stats.pending}</div>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Resolved</CardTitle>
              <CheckCircle className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">{stats.resolved}</div>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Urgent Issues</CardTitle>
              <AlertCircle className="h-4 w-4 text-red-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-red-600">{stats.urgent}</div>
            </CardContent>
          </Card>
        </div>

        <Tabs defaultValue="complaints" className="space-y-4">
          <TabsList>
            <TabsTrigger value="complaints">My Complaints</TabsTrigger>
            <TabsTrigger value="overview">Overview</TabsTrigger>
          </TabsList>
          
          <TabsContent value="complaints" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>My Complaints</CardTitle>
                <CardDescription>Track the status of your maintenance requests</CardDescription>
              </CardHeader>
              <CardContent>
                {complaints.length === 0 ? (
                  <div className="text-center py-8">
                    <p className="text-gray-500 mb-4">You haven't submitted any complaints yet.</p>
                    <Button onClick={() => setShowComplaintForm(true)} className="bg-blue-600 hover:bg-blue-700">
                      <Plus className="h-4 w-4 mr-2" />
                      Submit Your First Complaint
                    </Button>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {complaints.map((complaint) => (
                      <div key={complaint.id} className="border rounded-lg p-4 hover:bg-gray-50">
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <div className="flex items-center space-x-2 mb-2">
                              <h3 className="font-semibold">{complaint.title}</h3>
                              <Badge className={getStatusColor(complaint.status)}>
                                {complaint.status.replace('-', ' ')}
                              </Badge>
                              <Badge className={getPriorityColor(complaint.priority)}>
                                {complaint.priority}
                              </Badge>
                            </div>
                            <p className="text-gray-600 text-sm mb-2">{complaint.description}</p>
                            <div className="text-xs text-gray-500 space-y-1">
                              <p><strong>Location:</strong> {complaint.building}, Room {complaint.room_number}</p>
                              <p><strong>Category:</strong> {complaint.category}</p>
                              <p><strong>Submitted:</strong> {new Date(complaint.created_at).toLocaleDateString()}</p>
                              {complaint.assigned_to_name && (
                                <p><strong>Assigned to:</strong> {complaint.assigned_to_name}</p>
                              )}
                            </div>
                          </div>
                          <div className="flex flex-col space-y-2">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => setSelectedComplaintId(complaint.id)}
                            >
                              <MessageSquare className="h-4 w-4 mr-2" />
                              Chat
                            </Button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
          
          <TabsContent value="overview" className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle>Recent Activity</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {complaints.slice(0, 3).map((complaint) => (
                      <div key={complaint.id} className="flex items-center space-x-3">
                        <div className="flex-shrink-0">
                          <div className={`w-2 h-2 rounded-full ${
                            complaint.status === 'resolved' ? 'bg-green-500' : 
                            complaint.status === 'in-progress' ? 'bg-yellow-500' : 'bg-blue-500'
                          }`} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-gray-900 truncate">
                            {complaint.title}
                          </p>
                          <p className="text-sm text-gray-500">
                            {new Date(complaint.updated_at).toLocaleDateString()}
                          </p>
                        </div>
                      </div>
                    ))}
                    {complaints.length === 0 && (
                      <p className="text-gray-500 text-sm">No recent activity</p>
                    )}
                  </div>
                </CardContent>
              </Card>
              
              <Card>
                <CardHeader>
                  <CardTitle>Quick Actions</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    <Button 
                      onClick={() => setShowComplaintForm(true)} 
                      className="w-full justify-start bg-blue-600 hover:bg-blue-700"
                    >
                      <Plus className="h-4 w-4 mr-2" />
                      Submit New Complaint
                    </Button>
                    <Button variant="outline" className="w-full justify-start">
                      <MessageSquare className="h-4 w-4 mr-2" />
                      View All Chats
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default StudentDashboard;
