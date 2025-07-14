import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { MessageSquare, CheckCircle, Clock, AlertTriangle, Wrench, Calendar } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { db } from '@/utils/database';
import { Complaint } from '@/types';
import { emailService } from '@/utils/emailService';
import { useToast } from '@/hooks/use-toast';
import ChatInterface from '../Chat/ChatInterface';

const MaintenanceDashboard = () => {
  const [assignedComplaints, setAssignedComplaints] = useState<Complaint[]>([]);
  const [selectedComplaintId, setSelectedComplaintId] = useState<string | null>(null);
  const [workNotes, setWorkNotes] = useState<Record<string, string>>({});
  const { user, profile } = useAuth();
  const { toast } = useToast();

  useEffect(() => {
    if (user) {
      loadAssignedComplaints();
    }
  }, [user]);

  const loadAssignedComplaints = () => {
    if (user) {
      const complaints = db.complaints.getByAssignedTo(user.id);
      setAssignedComplaints(complaints);
    }
  };

  const handleStatusUpdate = async (complaintId: string, newStatus: string) => {
    const updatedComplaint = db.complaints.update(complaintId, {
      status: newStatus as any,
      ...(newStatus === 'resolved' ? { resolvedAt: new Date().toISOString() } : {}),
    });

    if (updatedComplaint) {
      // Add work note if provided
      const note = workNotes[complaintId];
      if (note && note.trim()) {
        const existingComplaint = db.complaints.getById(complaintId);
        if (existingComplaint) {
          const updatedNotes = [...existingComplaint.notes, `${profile?.name}: ${note.trim()}`];
          db.complaints.update(complaintId, { notes: updatedNotes });
        }
        setWorkNotes(prev => ({ ...prev, [complaintId]: '' }));
      }

      loadAssignedComplaints();
      
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

  const handleAddNote = async (complaintId: string) => {
    const note = workNotes[complaintId];
    if (!note || !note.trim()) return;

    const existingComplaint = db.complaints.getById(complaintId);
    if (existingComplaint) {
      const updatedNotes = [...existingComplaint.notes, `${profile?.name}: ${note.trim()}`];
      db.complaints.update(complaintId, { notes: updatedNotes });
      setWorkNotes(prev => ({ ...prev, [complaintId]: '' }));
      loadAssignedComplaints();
      
      toast({
        title: 'Note Added',
        description: 'Work note has been added to the complaint.',
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

  const stats = {
    total: assignedComplaints.length,
    pending: assignedComplaints.filter(c => ['assigned', 'in-progress'].includes(c.status)).length,
    completed: assignedComplaints.filter(c => c.status === 'resolved').length,
    urgent: assignedComplaints.filter(c => c.priority === 'urgent').length,
  };

  if (selectedComplaintId) {
    const selectedComplaint = assignedComplaints.find(c => c.id === selectedComplaintId);
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
                <h1 className="text-2xl font-bold text-gray-900">Maintenance Dashboard</h1>
                <p className="text-gray-600">Welcome back, {profile?.name}</p>
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
              <CardTitle className="text-sm font-medium">Assigned to Me</CardTitle>
              <Wrench className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.total}</div>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Pending Work</CardTitle>
              <Clock className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-orange-600">{stats.pending}</div>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Completed</CardTitle>
              <CheckCircle className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">{stats.completed}</div>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Urgent Tasks</CardTitle>
              <AlertTriangle className="h-4 w-4 text-red-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-red-600">{stats.urgent}</div>
            </CardContent>
          </Card>
        </div>

        <Tabs defaultValue="active" className="space-y-4">
          <TabsList>
            <TabsTrigger value="active">Active Work Orders</TabsTrigger>
            <TabsTrigger value="completed">Completed Work</TabsTrigger>
            <TabsTrigger value="schedule">Schedule</TabsTrigger>
          </TabsList>
          
          <TabsContent value="active" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Active Work Orders</CardTitle>
                <CardDescription>Complaints assigned to you that need attention</CardDescription>
              </CardHeader>
              <CardContent>
                {assignedComplaints.filter(c => ['assigned', 'in-progress'].includes(c.status)).length === 0 ? (
                  <div className="text-center py-8">
                    <CheckCircle className="mx-auto h-12 w-12 text-green-500 mb-4" />
                    <p className="text-gray-500 mb-2">Great job! No active work orders.</p>
                    <p className="text-sm text-gray-400">All assigned complaints have been completed.</p>
                  </div>
                ) : (
                  <div className="space-y-6">
                    {assignedComplaints
                      .filter(c => ['assigned', 'in-progress'].includes(c.status))
                      .sort((a, b) => {
                        const priorityOrder = { urgent: 4, high: 3, medium: 2, low: 1 };
                        return priorityOrder[b.priority] - priorityOrder[a.priority];
                      })
                      .map((complaint) => (
                        <div key={complaint.id} className="border rounded-lg p-6 bg-white">
                          <div className="flex items-start justify-between mb-4">
                            <div className="flex-1">
                              <div className="flex items-center space-x-2 mb-2">
                                <h3 className="text-lg font-semibold">{complaint.title}</h3>
                                <Badge className={getStatusColor(complaint.status)}>
                                  {complaint.status.replace('-', ' ')}
                                </Badge>
                                <Badge className={getPriorityColor(complaint.priority)}>
                                  {complaint.priority}
                                </Badge>
                              </div>
                              <p className="text-gray-600 mb-3">{complaint.description}</p>
                              <div className="grid grid-cols-2 gap-4 text-sm text-gray-500 mb-4">
                                <div>
                                  <p><strong>Student:</strong> {complaint.studentName}</p>
                                  <p><strong>Location:</strong> {complaint.location.building}</p>
                                </div>
                                <div>
                                  <p><strong>Room:</strong> {complaint.location.roomNumber}</p>
                                  <p><strong>Category:</strong> {complaint.category}</p>
                                </div>
                              </div>
                              
                              {complaint.location.specificLocation && (
                                <p className="text-sm text-gray-600 mb-3">
                                  <strong>Specific Location:</strong> {complaint.location.specificLocation}
                                </p>
                              )}
                              
                              {complaint.notes.length > 0 && (
                                <div className="mb-4">
                                  <h4 className="font-medium text-sm text-gray-700 mb-2">Work Notes:</h4>
                                  <div className="bg-gray-50 rounded-lg p-3 space-y-2">
                                    {complaint.notes.map((note, index) => (
                                      <p key={index} className="text-sm text-gray-600">• {note}</p>
                                    ))}
                                  </div>
                                </div>
                              )}
                            </div>
                          </div>
                          
                          <div className="space-y-4">
                            <div>
                              <Label htmlFor={`note-${complaint.id}`} className="text-sm font-medium">
                                Add Work Note
                              </Label>
                              <Textarea
                                id={`note-${complaint.id}`}
                                placeholder="Document your progress, findings, or next steps..."
                                value={workNotes[complaint.id] || ''}
                                onChange={(e) => setWorkNotes(prev => ({
                                  ...prev,
                                  [complaint.id]: e.target.value
                                }))}
                                className="mt-1"
                                rows={3}
                              />
                            </div>
                            
                            <div className="flex flex-wrap gap-2">
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => setSelectedComplaintId(complaint.id)}
                              >
                                <MessageSquare className="h-4 w-4 mr-2" />
                                Chat with Student
                              </Button>
                              
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handleAddNote(complaint.id)}
                                disabled={!workNotes[complaint.id]?.trim()}
                              >
                                Add Note
                              </Button>
                              
                              {complaint.status === 'assigned' && (
                                <Button
                                  size="sm"
                                  onClick={() => handleStatusUpdate(complaint.id, 'in-progress')}
                                  className="bg-orange-600 hover:bg-orange-700"
                                >
                                  Start Work
                                </Button>
                              )}
                              
                              {complaint.status === 'in-progress' && (
                                <Button
                                  size="sm"
                                  onClick={() => handleStatusUpdate(complaint.id, 'resolved')}
                                  className="bg-green-600 hover:bg-green-700"
                                >
                                  <CheckCircle className="h-4 w-4 mr-2" />
                                  Mark Complete
                                </Button>
                              )}
                            </div>
                          </div>
                        </div>
                      ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
          
          <TabsContent value="completed" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Completed Work Orders</CardTitle>
                <CardDescription>Recently completed maintenance tasks</CardDescription>
              </CardHeader>
              <CardContent>
                {assignedComplaints.filter(c => c.status === 'resolved').length === 0 ? (
                  <div className="text-center py-8">
                    <p className="text-gray-500">No completed work orders yet.</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {assignedComplaints
                      .filter(c => c.status === 'resolved')
                      .sort((a, b) => new Date(b.resolvedAt || '').getTime() - new Date(a.resolvedAt || '').getTime())
                      .map((complaint) => (
                        <div key={complaint.id} className="border rounded-lg p-4 bg-green-50">
                          <div className="flex items-start justify-between">
                            <div className="flex-1">
                              <div className="flex items-center space-x-2 mb-2">
                                <h3 className="font-semibold">{complaint.title}</h3>
                                <Badge className="bg-green-100 text-green-800">Completed</Badge>
                                <CheckCircle className="h-4 w-4 text-green-600" />
                              </div>
                              <p className="text-gray-600 text-sm mb-2">{complaint.description}</p>
                              <div className="text-xs text-gray-500 space-y-1">
                                <p><strong>Student:</strong> {complaint.studentName}</p>
                                <p><strong>Location:</strong> {complaint.location.building}, Room {complaint.location.roomNumber}</p>
                                <p><strong>Completed:</strong> {complaint.resolvedAt && new Date(complaint.resolvedAt).toLocaleDateString()}</p>
                              </div>
                              {complaint.notes.length > 0 && (
                                <div className="mt-2">
                                  <p className="text-xs text-gray-600"><strong>Final Notes:</strong></p>
                                  <p className="text-xs text-gray-500">{complaint.notes[complaint.notes.length - 1]}</p>
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
          
          <TabsContent value="schedule" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Work Schedule</CardTitle>
                <CardDescription>Your upcoming maintenance tasks</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="text-center py-8">
                    <Calendar className="mx-auto h-12 w-12 text-gray-400 mb-4" />
                    <p className="text-gray-500 mb-2">Schedule view coming soon</p>
                    <p className="text-sm text-gray-400">
                      This will show your scheduled maintenance tasks and appointments.
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default MaintenanceDashboard;
