import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { MessageSquare, CheckCircle, Clock, AlertTriangle, Wrench, Calendar, Upload, X, Camera } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
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

const MaintenanceDashboard = () => {
  const [assignedComplaints, setAssignedComplaints] = useState<Complaint[]>([]);
  const [selectedComplaintId, setSelectedComplaintId] = useState<string | null>(null);
  const [workNotes, setWorkNotes] = useState<Record<string, string>>({});
  const [completionImages, setCompletionImages] = useState<Record<string, File[]>>({});
  const [completionImageUrls, setCompletionImageUrls] = useState<Record<string, string[]>>({});
  const [isUploadingImages, setIsUploadingImages] = useState<Record<string, boolean>>({});
  const { user, profile } = useAuth();
  const { toast } = useToast();

  useEffect(() => {
    if (profile) {
      loadAssignedComplaints();
    }
  }, [profile]);

  const loadAssignedComplaints = () => {
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
        .eq('assigned_to', profile.id)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error loading complaints:', error);
        return;
      }

      const transformedComplaints = data.map(complaint => ({
        ...complaint,
        student_name: complaint.student?.name || 'Unknown Student',
        assigned_to_name: complaint.assigned_user?.name || null
      }));

      setAssignedComplaints(transformedComplaints);
    } catch (error) {
      console.error('Error loading complaints:', error);
    }
  };

  const handleCompletionImageUpload = (complaintId: string, e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files) {
      const fileArray = Array.from(files);
      
      // Validate file types and sizes
      const validFiles = fileArray.filter(file => {
        const isValidType = file.type.startsWith('image/');
        const isValidSize = file.size <= 5 * 1024 * 1024; // 5MB limit
        
        if (!isValidType) {
          toast({
            title: 'Invalid File Type',
            description: `${file.name} is not a valid image file.`,
            variant: 'destructive',
          });
          return false;
        }
        
        if (!isValidSize) {
          toast({
            title: 'File Too Large',
            description: `${file.name} is larger than 5MB.`,
            variant: 'destructive',
          });
          return false;
        }
        
        return true;
      });
      
      if (validFiles.length > 0) {
        setCompletionImages(prev => ({
          ...prev,
          [complaintId]: [...(prev[complaintId] || []), ...validFiles]
        }));
        
        // Create preview URLs
        const newUrls = validFiles.map(file => URL.createObjectURL(file));
        setCompletionImageUrls(prev => ({
          ...prev,
          [complaintId]: [...(prev[complaintId] || []), ...newUrls]
        }));
      }
    }
  };

  const removeCompletionImage = (complaintId: string, index: number) => {
    const urls = completionImageUrls[complaintId] || [];
    if (urls[index]) {
      URL.revokeObjectURL(urls[index]);
    }
    
    setCompletionImages(prev => ({
      ...prev,
      [complaintId]: (prev[complaintId] || []).filter((_, i) => i !== index)
    }));
    
    setCompletionImageUrls(prev => ({
      ...prev,
      [complaintId]: (prev[complaintId] || []).filter((_, i) => i !== index)
    }));
  };

  const uploadCompletionImages = async (complaintId: string): Promise<string[]> => {
    const images = completionImages[complaintId] || [];
    if (images.length === 0) return [];
    
    setIsUploadingImages(prev => ({ ...prev, [complaintId]: true }));
    const uploadedUrls: string[] = [];
    
    try {
      for (const image of images) {
        const fileExt = image.name.split('.').pop();
        const fileName = `completion-${Date.now()}-${Math.random().toString(36).substring(2)}.${fileExt}`;
        const filePath = `completion/${fileName}`;
        
        const { data, error } = await supabase.storage
          .from('complaint-images')
          .upload(filePath, image);
        
        if (error) {
          console.error('Error uploading completion image:', error);
          toast({
            title: 'Upload Failed',
            description: `Failed to upload ${image.name}: ${error.message}`,
            variant: 'destructive',
          });
          continue;
        }
        
        // Get the public URL
        const { data: { publicUrl } } = supabase.storage
          .from('complaint-images')
          .getPublicUrl(filePath);
        
        uploadedUrls.push(publicUrl);
      }
      
      if (uploadedUrls.length > 0) {
        toast({
          title: 'Completion Images Uploaded',
          description: `Successfully uploaded ${uploadedUrls.length} completion image(s)`,
        });
      } else if (images.length > 0) {
        toast({
          title: 'Upload Failed',
          description: 'No completion images were uploaded successfully. Please try again.',
          variant: 'destructive',
        });
      }
    } catch (error) {
      console.error('Error during completion image upload:', error);
      toast({
        title: 'Upload Error',
        description: `An error occurred while uploading completion images: ${error.message}`,
        variant: 'destructive',
      });
    } finally {
      setIsUploadingImages(prev => ({ ...prev, [complaintId]: false }));
    }
    
    return uploadedUrls;
  };

  const handleStatusUpdate = async (complaintId: string, newStatus: string) => {
    try {
      // Upload completion images if resolving
      let completionImageUrls: string[] = [];
      if (newStatus === 'resolved') {
        completionImageUrls = await uploadCompletionImages(complaintId);
      }

      const updateData = {
        status: newStatus,
        updated_at: new Date().toISOString(),
        ...(newStatus === 'resolved' ? { 
          resolved_at: new Date().toISOString(),
          completion_images: completionImageUrls
        } : {})
      };

      const { error } = await supabase
        .from('complaints')
        .update(updateData)
        .eq('id', complaintId);

      if (error) throw error;

      // Add work note if provided
      const note = workNotes[complaintId];
      if (note && note.trim()) {
        const { error: noteError } = await supabase
          .from('complaint_notes')
          .insert({
            complaint_id: complaintId,
            user_id: profile.id,
            note: note.trim()
          });

        if (noteError) {
          console.error('Error adding note:', noteError);
        } else {
          setWorkNotes(prev => ({ ...prev, [complaintId]: '' }));
        }
      }

      // Clear completion images after successful update
      if (newStatus === 'resolved') {
        setCompletionImages(prev => ({ ...prev, [complaintId]: [] }));
        setCompletionImageUrls(prev => ({ ...prev, [complaintId]: [] }));
      }

      loadAssignedComplaints();

      toast({
        title: 'Status Updated',
        description: `Complaint status updated to ${newStatus}`,
      });
    } catch (error) {
      console.error('Error updating status:', error);
      toast({
        title: 'Update Failed',
        description: error?.message || 'Failed to update status. Please try again.',
        variant: 'destructive',
      });
    }
  };

  const handleAddNote = async (complaintId: string) => {
    const note = workNotes[complaintId];
    if (!note || !note.trim()) return;

    try {
      const { error } = await supabase
        .from('complaint_notes')
        .insert({
          complaint_id: complaintId,
          user_id: profile.id,
          note: note.trim()
        });

      if (error) throw error;

      setWorkNotes(prev => ({ ...prev, [complaintId]: '' }));
      loadAssignedComplaints();
      
      toast({
        title: 'Note Added',
        description: 'Work note has been added to the complaint.',
      });
    } catch (error) {
      console.error('Error adding note:', error);
      toast({
        title: 'Failed to Add Note',
        description: error?.message || 'Failed to add note. Please try again.',
        variant: 'destructive',
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
      // Transform to match ChatInterface expected format
      const transformedComplaint = {
        id: selectedComplaint.id,
        studentId: selectedComplaint.student_id,
        studentName: selectedComplaint.student_name || 'Unknown Student',
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
                                  <p><strong>Student:</strong> {complaint.student_name}</p>
                                  <p><strong>Location:</strong> {complaint.building}</p>
                                </div>
                                <div>
                                  <p><strong>Room:</strong> {complaint.room_number}</p>
                                  <p><strong>Category:</strong> {complaint.category}</p>
                                </div>
                              </div>
                              
                              {complaint.specific_location && (
                                <p className="text-sm text-gray-600 mb-3">
                                  <strong>Specific Location:</strong> {complaint.specific_location}
                                </p>
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
                            
                            {/* Completion Images Section - Only show when marking as complete */}
                            {complaint.status === 'in-progress' && (
                              <div className="space-y-3 p-4 bg-green-50 rounded-lg border border-green-200">
                                <div className="flex items-center space-x-2">
                                  <Camera className="h-4 w-4 text-green-600" />
                                  <Label className="text-sm font-medium text-green-800">
                                    Add Completion Photos (Optional)
                                  </Label>
                                </div>
                                <p className="text-xs text-green-600">
                                  Upload photos showing the completed work for verification
                                </p>
                                
                                <div className="border-2 border-dashed border-green-300 rounded-lg p-4">
                                  <div className="text-center">
                                    <label htmlFor={`completion-images-${complaint.id}`} className="cursor-pointer">
                                      <Upload className="mx-auto h-8 w-8 text-green-400 mb-2" />
                                      <span className="text-sm text-green-700">
                                        Click to upload completion photos
                                      </span>
                                      <input
                                        id={`completion-images-${complaint.id}`}
                                        type="file"
                                        multiple
                                        accept="image/*"
                                        className="hidden"
                                        onChange={(e) => handleCompletionImageUpload(complaint.id, e)}
                                      />
                                    </label>
                                  </div>
                                </div>
                                
                                {/* Image Preview */}
                                {completionImageUrls[complaint.id] && completionImageUrls[complaint.id].length > 0 && (
                                  <div className="grid grid-cols-3 gap-2">
                                    {completionImageUrls[complaint.id].map((url, index) => (
                                      <div key={index} className="relative group">
                                        <div className="aspect-square rounded-lg overflow-hidden bg-gray-100 border">
                                          <img
                                            src={url}
                                            alt={`Completion ${index + 1}`}
                                            className="w-full h-full object-cover"
                                          />
                                        </div>
                                        <button
                                          type="button"
                                          onClick={() => removeCompletionImage(complaint.id, index)}
                                          className="absolute -top-1 -right-1 bg-red-500 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-600"
                                        >
                                          <X className="h-3 w-3" />
                                        </button>
                                      </div>
                                    ))}
                                  </div>
                                )}
                              </div>
                            )}
                            
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
                                  disabled={isUploadingImages[complaint.id]}
                                >
                                  {isUploadingImages[complaint.id] ? (
                                    <>
                                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                                      Uploading...
                                    </>
                                  ) : (
                                    <>
                                      <CheckCircle className="h-4 w-4 mr-2" />
                                      Mark Complete
                                    </>
                                  )}
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
                                <p><strong>Student:</strong> {complaint.student_name}</p>
                                <p><strong>Location:</strong> {complaint.building}, Room {complaint.room_number}</p>
                                <p><strong>Completed:</strong> {complaint.resolved_at && new Date(complaint.resolved_at).toLocaleDateString()}</p>
                              </div>
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
