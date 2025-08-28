import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Search, Users, AlertTriangle, CheckCircle, Clock, MessageSquare } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { ChatInterface } from '../Chat/ChatInterface';
import { UserManagement } from '../Admin/UserManagement';

interface Complaint {
  id: string;
  title: string;
  description: string;
  category: string;
  priority: string;
  status: string;
  building: string;
  room_number: string;
  specific_location?: string;
  student_id: string;
  assigned_to?: string;
  created_at: string;
  updated_at: string;
  resolved_at?: string;
  images?: string[];
  completion_images?: string[];
  student_name?: string;
  assigned_to_name?: string;
}

interface SystemStats {
  totalComplaints: number;
  resolvedComplaints: number;
  pendingComplaints: number;
  averageResolutionTime: number;
  complaintsByCategory: Record<string, number>;
  complaintsByPriority: Record<string, number>;
}

const AdminDashboard = () => {
  const [complaints, setComplaints] = useState<Complaint[]>([]);
  const [filteredComplaints, setFilteredComplaints] = useState<Complaint[]>([]);
  const [maintenanceUsers, setMaintenanceUsers] = useState<any[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [selectedComplaintId, setSelectedComplaintId] = useState<string | null>(null);
  const [stats, setStats] = useState<SystemStats>({
    totalComplaints: 0,
    resolvedComplaints: 0,
    pendingComplaints: 0,
    averageResolutionTime: 0,
    complaintsByCategory: {},
    complaintsByPriority: {},
  });
  
  const { user, profile } = useAuth();
  const { toast } = useToast();

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    filterComplaints();
  }, [complaints, searchTerm, statusFilter, categoryFilter]);

  const loadData = async () => {
    try {
      // Load complaints with student information
      const { data: complaintsData, error: complaintsError } = await supabase
        .from('complaints')
        .select(`
          *,
          student:profiles!complaints_student_id_fkey(name),
          assigned_user:profiles!complaints_assigned_to_fkey(name)
        `)
        .order('created_at', { ascending: false });

      if (complaintsError) throw complaintsError;

      // Load maintenance users
      const { data: maintenanceData, error: maintenanceError } = await supabase
        .from('profiles')
        .select('*')
        .eq('role', 'maintenance');

      if (maintenanceError) throw maintenanceError;

      // Transform complaints data
      const transformedComplaints = complaintsData.map(complaint => ({
        ...complaint,
        student_name: complaint.student?.name || 'Unknown',
        assigned_to_name: complaint.assigned_user?.name || null
      }));

      setComplaints(transformedComplaints);
      setMaintenanceUsers(maintenanceData || []);
      calculateStats(transformedComplaints);
    } catch (error) {
      console.error('Error loading data:', error);
      toast({
        title: "Error",
        description: "Failed to load dashboard data",
        variant: "destructive",
      });
    }
  };

  const calculateStats = (complaints: Complaint[]) => {
    const total = complaints.length;
    const resolved = complaints.filter(c => c.status === 'resolved').length;
    const pending = complaints.filter(c => ['submitted', 'assigned', 'in-progress'].includes(c.status)).length;
    
    const complaintsByCategory = complaints.reduce((acc, complaint) => {
      acc[complaint.category] = (acc[complaint.category] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
    
    const complaintsByPriority = complaints.reduce((acc, complaint) => {
      acc[complaint.priority] = (acc[complaint.priority] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    setStats({
      totalComplaints: total,
      resolvedComplaints: resolved,
      pendingComplaints: pending,
      averageResolutionTime: 2.5, // Mock average in days
      complaintsByCategory,
      complaintsByPriority,
    });
  };

  const filterComplaints = () => {
    let filtered = complaints;

    if (searchTerm) {
      filtered = filtered.filter(complaint =>
        complaint.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        complaint.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (complaint.student_name && complaint.student_name.toLowerCase().includes(searchTerm.toLowerCase()))
      );
    }

    if (statusFilter !== 'all') {
      filtered = filtered.filter(complaint => complaint.status === statusFilter);
    }

    if (categoryFilter !== 'all') {
      filtered = filtered.filter(complaint => complaint.category === categoryFilter);
    }

    setFilteredComplaints(filtered);
  };

  const handleAssignComplaint = async (complaintId: string, maintenanceId: string) => {
    try {
      const { error } = await supabase
        .from('complaints')
        .update({
          assigned_to: maintenanceId,
          status: 'assigned',
          updated_at: new Date().toISOString()
        })
        .eq('id', complaintId);

      if (error) throw error;

      loadData();
      
      const maintenanceUser = maintenanceUsers.find(user => user.id === maintenanceId);
      toast({
        title: 'Complaint Assigned',
        description: `Complaint assigned to ${maintenanceUser?.name || 'maintenance user'}`,
      });
    } catch (error) {
      console.error('Error assigning complaint:', error);
      toast({
        title: "Error",
        description: "Failed to assign complaint",
        variant: "destructive",
      });
    }
  };

  const handleStatusUpdate = async (complaintId: string, newStatus: string) => {
    try {
      const updateData = {
        status: newStatus as 'submitted' | 'assigned' | 'in-progress' | 'resolved' | 'closed',
        updated_at: new Date().toISOString(),
        ...(newStatus === 'resolved' ? { resolved_at: new Date().toISOString() } : {})
      };

      const { error } = await supabase
        .from('complaints')
        .update(updateData)
        .eq('id', complaintId);

      if (error) throw error;

      loadData();

      toast({
        title: 'Status Updated',
        description: `Complaint status updated to ${newStatus}`,
      });
    } catch (error) {
      console.error('Error updating status:', error);
      toast({
        title: "Error",
        description: "Failed to update complaint status",
        variant: "destructive",
      });
    }
  };

  const getStatusBadgeVariant = (status: string): "default" | "secondary" | "destructive" | "outline" => {
    switch (status) {
      case 'submitted': return 'default';
      case 'assigned': return 'secondary';
      case 'in-progress': return 'outline';
      case 'resolved': return 'default';
      case 'closed': return 'secondary';
      default: return 'default';
    }
  };

  const getPriorityBadgeVariant = (priority: string): "default" | "secondary" | "destructive" | "outline" => {
    switch (priority) {
      case 'low': return 'secondary';
      case 'medium': return 'default';
      case 'high': return 'outline';
      case 'urgent': return 'destructive';
      default: return 'default';
    }
  };

  if (selectedComplaintId) {
    const selectedComplaint = complaints.find(c => c.id === selectedComplaintId);
    if (selectedComplaint) {
      // Transform to match ChatInterface expected format
      const transformedComplaint = {
        id: selectedComplaint.id,
        studentId: selectedComplaint.student_id,
        studentName: selectedComplaint.student_name || 'Unknown',
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
    <div className="min-h-screen bg-background">
      <div className="border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="py-6">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-2xl font-bold">Administrator Dashboard</h1>
                <p className="text-muted-foreground">Welcome back, {profile?.name}</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Complaints</CardTitle>
              <AlertTriangle className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.totalComplaints}</div>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Pending</CardTitle>
              <Clock className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-orange-600">{stats.pendingComplaints}</div>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Resolved</CardTitle>
              <CheckCircle className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">{stats.resolvedComplaints}</div>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Avg Resolution</CardTitle>
              <Clock className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.averageResolutionTime} days</div>
            </CardContent>
          </Card>
        </div>

        <Tabs defaultValue="complaints" className="space-y-4">
          <TabsList>
            <TabsTrigger value="complaints">All Complaints</TabsTrigger>
            <TabsTrigger value="analytics">Analytics</TabsTrigger>
            <TabsTrigger value="users">Manage Users</TabsTrigger>
          </TabsList>
          
          <TabsContent value="complaints" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Complaint Management</CardTitle>
                <CardDescription>Manage and assign maintenance complaints</CardDescription>
                
                {/* Filters */}
                <div className="flex flex-wrap gap-4 pt-4">
                  <div className="flex-1 min-w-64">
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
                      <Input
                        placeholder="Search complaints..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="pl-10"
                      />
                    </div>
                  </div>
                  <Select value={statusFilter} onValueChange={setStatusFilter}>
                    <SelectTrigger className="w-48">
                      <SelectValue placeholder="Filter by status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Statuses</SelectItem>
                      <SelectItem value="submitted">Submitted</SelectItem>
                      <SelectItem value="assigned">Assigned</SelectItem>
                      <SelectItem value="in-progress">In Progress</SelectItem>
                      <SelectItem value="resolved">Resolved</SelectItem>
                      <SelectItem value="closed">Closed</SelectItem>
                    </SelectContent>
                  </Select>
                  <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                    <SelectTrigger className="w-48">
                      <SelectValue placeholder="Filter by category" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Categories</SelectItem>
                      <SelectItem value="plumbing">Plumbing</SelectItem>
                      <SelectItem value="electrical">Electrical</SelectItem>
                      <SelectItem value="hvac">HVAC</SelectItem>
                      <SelectItem value="structural">Structural</SelectItem>
                      <SelectItem value="cleaning">Cleaning</SelectItem>
                      <SelectItem value="other">Other</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </CardHeader>
              <CardContent>
                {filteredComplaints.length === 0 ? (
                  <div className="text-center py-8">
                    <p className="text-muted-foreground">No complaints found matching your criteria.</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {filteredComplaints.map((complaint) => (
                      <div key={complaint.id} className="border rounded-lg p-4 hover:bg-muted/50">
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <div className="flex items-center space-x-2 mb-2">
                              <h3 className="font-semibold">{complaint.title}</h3>
                              <Badge variant={getStatusBadgeVariant(complaint.status)}>
                                {complaint.status.replace('-', ' ')}
                              </Badge>
                              <Badge variant={getPriorityBadgeVariant(complaint.priority)}>
                                {complaint.priority}
                              </Badge>
                            </div>
                            <p className="text-muted-foreground text-sm mb-2">{complaint.description}</p>
                            <div className="text-xs text-muted-foreground space-y-1">
                              <p><strong>Student:</strong> {complaint.student_name}</p>
                              <p><strong>Location:</strong> {complaint.building}, Room {complaint.room_number}</p>
                              <p><strong>Category:</strong> {complaint.category}</p>
                              <p><strong>Submitted:</strong> {new Date(complaint.created_at).toLocaleDateString()}</p>
                              {complaint.assigned_to_name && (
                                <p><strong>Assigned to:</strong> {complaint.assigned_to_name}</p>
                              )}
                            </div>
                          </div>
                          <div className="flex flex-col space-y-2 ml-4">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => setSelectedComplaintId(complaint.id)}
                            >
                              <MessageSquare className="h-4 w-4 mr-2" />
                              Chat
                            </Button>
                            
                            {!complaint.assigned_to && (
                              <Select onValueChange={(value) => handleAssignComplaint(complaint.id, value)}>
                                <SelectTrigger className="w-48">
                                  <SelectValue placeholder="Assign to..." />
                                </SelectTrigger>
                                <SelectContent>
                                  {maintenanceUsers.map((user) => (
                                    <SelectItem key={user.id} value={user.id}>
                                      {user.name}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            )}
                            
                            <Select 
                              value={complaint.status} 
                              onValueChange={(value) => handleStatusUpdate(complaint.id, value)}
                            >
                              <SelectTrigger className="w-48">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="submitted">Submitted</SelectItem>
                                <SelectItem value="assigned">Assigned</SelectItem>
                                <SelectItem value="in-progress">In Progress</SelectItem>
                                <SelectItem value="resolved">Resolved</SelectItem>
                                <SelectItem value="closed">Closed</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
          
          <TabsContent value="analytics" className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle>Complaints by Category</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    {Object.entries(stats.complaintsByCategory).map(([category, count]) => (
                      <div key={category} className="flex justify-between items-center">
                        <span className="capitalize">{category}</span>
                        <Badge variant="secondary">{count}</Badge>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
              
              <Card>
                <CardHeader>
                  <CardTitle>Complaints by Priority</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    {Object.entries(stats.complaintsByPriority).map(([priority, count]) => (
                      <div key={priority} className="flex justify-between items-center">
                        <span className="capitalize">{priority}</span>
                        <Badge variant={getPriorityBadgeVariant(priority)}>
                          {count}
                        </Badge>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>
          
          <TabsContent value="users" className="space-y-4">
            <UserManagement />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default AdminDashboard;