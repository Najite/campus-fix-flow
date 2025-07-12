
export interface User {
  id: string;
  username: string;
  password: string;
  role: 'student' | 'admin' | 'maintenance';
  name: string;
  email: string;
  phone?: string;
  createdAt: string;
}

export interface Complaint {
  id: string;
  studentId: string;
  studentName: string;
  title: string;
  description: string;
  category: 'plumbing' | 'electrical' | 'hvac' | 'structural' | 'cleaning' | 'other';
  priority: 'low' | 'medium' | 'high' | 'urgent';
  status: 'submitted' | 'assigned' | 'in-progress' | 'resolved' | 'closed';
  location: {
    building: string;
    roomNumber: string;
    specificLocation: string;
  };
  images: string[];
  assignedTo?: string;
  assignedToName?: string;
  createdAt: string;
  updatedAt: string;
  resolvedAt?: string;
  notes: string[];
}

export interface ChatMessage {
  id: string;
  complaintId: string;
  userId: string;
  userName: string;
  userRole: string;
  message: string;
  timestamp: string;
  isTyping?: boolean;
}

export interface SystemStats {
  totalComplaints: number;
  resolvedComplaints: number;
  pendingComplaints: number;
  averageResolutionTime: number;
  complaintsByCategory: Record<string, number>;
  complaintsByPriority: Record<string, number>;
}
