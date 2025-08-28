
import React from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { MessageSquare } from 'lucide-react';
import { Complaint } from '@/types';

interface ComplaintListProps {
  complaints: Complaint[];
  onChatClick: (complaintId: string) => void;
  showActions?: boolean;
}

const ComplaintList = ({ complaints, onChatClick, showActions = true }: ComplaintListProps) => {
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

  if (complaints.length === 0) {
    return (
      <div className="text-center py-8">
        <p className="text-gray-500">No complaints found.</p>
      </div>
    );
  }

  return (
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
                <p><strong>Student:</strong> {complaint.studentName}</p>
                <p><strong>Location:</strong> {complaint.location.building}, Room {complaint.location.roomNumber}</p>
                <p><strong>Category:</strong> {complaint.category}</p>
                <p><strong>Submitted:</strong> {new Date(complaint.createdAt).toLocaleDateString()}</p>
                {complaint.assignedToName && (
                  <p><strong>Assigned to:</strong> {complaint.assignedToName}</p>
                )}
              </div>
            </div>
            {showActions && (
              <div className="flex flex-col space-y-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => onChatClick(complaint.id)}
                >
                  <MessageSquare className="h-4 w-4 mr-2" />
                  Chat
                </Button>
              </div>
            )}
          </div>
        </div>
      ))}
    </div>
  );
};

export default ComplaintList;
