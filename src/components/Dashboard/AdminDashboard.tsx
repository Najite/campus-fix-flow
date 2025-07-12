
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Search, Users, AlertTriangle, CheckCircle, Clock, MessageSquare, UserPlus } from 'lucide-react';
import { getCurrentUser } from '@/utils/auth';
import { db } from '@/utils/database';
import { Complaint, User, SystemStats } from '@/types';
import { emailService } from '@/utils/emailService';
import { useToast } from '@/hooks/use-toast';
import ChatInterface from '../Chat/ChatInterface';

const AdminDashboard = () => {
  const [complaints, setComplaints] = useState<Complaint[]>([]);
  const [filteredComplaints, setFilteredComplaints] = useState<Complaint[]>([]);
  const [maintenanceUsers, setMaintenanceUsers] = useState<User[]>([]);
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
  
  const currentUser = getCurrentUser();
  const { toast } = useToast();

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    filterComplaints();
  }, [complaints, searchTerm, statusFilter, categoryFilter]);

  const loadData = () => {
    const allComplaints = db.complaints.getAll();
    const maintenance = db.users.getAll().filter(user => user.role === 'maintenance');
    
    setComplaints(allComplaints);
    setMaintenanceUsers(maintenance);
    calculateStats(allComplaints);
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
        complaint.studentName.toLowerCase().includes(searchTerm.toLowerCase())
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
    const maintenanceUser = maintenanceUsers.find(user => user.id === maintenanceId);
    if (!maintenanceUser) return;

    const updatedComplaint = db.complaints.update(complaintId, {
      assignedTo: maintenanceId,
      assignedToName: maintenanceUser.name,
      status: 'assigned',
    });

    if (updatedComplaint) {
      loadData();
      
      // Send email notification to student
      const student = db.users.getById(updatedComplaint.studentId);
      if (student) {
        await emailService.sendStatusUpdateEmail(
          student.email,
          student.name,
          complaintId,
          updatedComplaint.title,
          'assigned'
        );
      }

      toast({
        title: 'Complaint Assigned',
        description: `Complaint assigned to ${maintenanceUser.name}`,
      });
    }
  };

  const handleStatusUpdate = async (complaintId: string, newStatus: string) => {
    const updatedComplaint = db.complaints.update(complaintId, {
      status: newStatus as any,
      ...(newStatus === 'resolved' ? { resolvedAt: new Date().toISOString() } : {}),
    });

    if (updatedComplaint) {
      loadData();
      
      // Send email notification to student
      const student = db.users.getById(updatedComplaint.studentId);
      if (student) {
        await emailService.sendStatusUpdateEmail(
          student.email,
          student.name,
          complaintId,
          updatedComplaint.title,
          newStatus
        );
      }

      toast({
        title: 'Status Updated',
        description: `Complaint status updated to ${newStatus}`,
      });
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

  if (selectedComplaintId) {
    const selectedComplaint = complaints.find(c => c.id === selectedComplaintId);
    if (selectedComplaint) {
      return (
        <ChatInterface
          complaint={selectedComplaint}
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
                <h1 className="text-2xl font-bold text-gray-900">Administrator Dashboard</h1>
                <p className="text-gray-600">Welcome back, {currentUser?.name}</p>
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
                      <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
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
                    <p className="text-gray-500">No complaints found matching your criteria.</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {filteredComplaints.map((complaint) => (
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
                              <p><strong>Student:</strong> {complaint.studentName}</p>
                              <p><strong>Location:</strong> {complaint.location.building}, Room {complaint.location.roomNumber}</p>
                              <p><strong>Category:</strong> {complaint.category}</p>
                              <p><strong>Submitted:</strong> {new Date(complaint.createdAt).toLocaleDateString()}</p>
                              {complaint.assignedToName && (
                                <p><strong>Assigned to:</strong> {complaint.assignedToName}</p>
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
                            
                            {!complaint.assignedTo && (
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
                        <Badge 
                          className={getPriorityColor(priority)}
                          variant="secondary"
                        >
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
            <Card>
              <CardHeader>
                <CardTitle>Maintenance Team</CardTitle>
                <CardDescription>Manage maintenance crew assignments</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {maintenanceUsers.map((user) => {
                    const assignedComplaints = complaints.filter(c => c.assignedTo === user.id);
                    const activeComplaints = assignedComplaints.filter(c => 
                      ['assigned', 'in-progress'].includes(c.status)
                    );
                    
                    return (
                      <div key={user.id} className="border rounded-lg p-4">
                        <div className="flex items-center justify-between">
                          <div>
                            <h3 className="font-semibold">{user.name}</h3>
                            <p className="text-sm text-gray-600">{user.email}</p>
                            <p className="text-xs text-gray-500">
                              Active: {activeComplaints.length} | Total: {assignedComplaints.length}
                            </p>
                          </div>
                          <div className="flex items-center space-x-2">
                            <Badge variant="secondary">
                              {activeComplaints.length} active
                            </Badge>
                            <Button variant="outline" size="sm">
                              <Users className="h-4 w-4 mr-2" />
                              View Details
                            </Button>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default AdminDashboard;
