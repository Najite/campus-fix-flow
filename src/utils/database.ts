
import { User, Complaint, ChatMessage } from '../types';

// Initialize default users and data
const initializeDefaultData = () => {
  const defaultUsers: User[] = [
    {
      id: '1',
      username: 'admin',
      password: 'admin123',
      role: 'admin',
      name: 'Campus Administrator',
      email: 'admin@campus.edu',
      phone: '555-0001',
      createdAt: new Date().toISOString(),
    },
    {
      id: '2',
      username: 'student',
      password: 'student123',
      role: 'student',
      name: 'John Student',
      email: 'john.student@campus.edu',
      phone: '555-0002',
      createdAt: new Date().toISOString(),
    },
    {
      id: '3',
      username: 'maintenance',
      password: 'maintenance123',
      role: 'maintenance',
      name: 'Mike Technician',
      email: 'mike.tech@campus.edu',
      phone: '555-0003',
      createdAt: new Date().toISOString(),
    },
    {
      id: '4',
      username: 'jane.doe',
      password: 'jane123',
      role: 'student',
      name: 'Jane Doe',
      email: 'jane.doe@campus.edu',
      phone: '555-0004',
      createdAt: new Date().toISOString(),
    },
    {
      id: '5',
      username: 'tom.fix',
      password: 'tom123',
      role: 'maintenance',
      name: 'Tom Fixit',
      email: 'tom.fix@campus.edu',
      phone: '555-0005',
      createdAt: new Date().toISOString(),
    }
  ];

  const defaultComplaints: Complaint[] = [
    {
      id: '1',
      studentId: '2',
      studentName: 'John Student',
      title: 'Leaky Faucet in Dorm Room',
      description: 'The bathroom faucet in my dorm room has been leaking constantly for the past week. Water is dripping every few seconds.',
      category: 'plumbing',
      priority: 'medium',
      status: 'assigned',
      location: {
        building: 'Johnson Hall',
        roomNumber: '204',
        specificLocation: 'Bathroom sink faucet'
      },
      images: [],
      assignedTo: '3',
      assignedToName: 'Mike Technician',
      createdAt: new Date(Date.now() - 86400000 * 2).toISOString(),
      updatedAt: new Date(Date.now() - 86400000 * 1).toISOString(),
      notes: ['Initial assessment completed', 'Parts ordered']
    },
    {
      id: '2',
      studentId: '4',
      studentName: 'Jane Doe',
      title: 'Broken AC Unit',
      description: 'The air conditioning unit in our classroom is not working. Room temperature is very uncomfortable.',
      category: 'hvac',
      priority: 'high',
      status: 'in-progress',
      location: {
        building: 'Science Building',
        roomNumber: '301',
        specificLocation: 'Main AC unit'
      },
      images: [],
      assignedTo: '5',
      assignedToName: 'Tom Fixit',
      createdAt: new Date(Date.now() - 86400000 * 1).toISOString(),
      updatedAt: new Date(Date.now() - 3600000 * 2).toISOString(),
      notes: ['Technician dispatched', 'Diagnosis in progress']
    },
    {
      id: '3',
      studentId: '2',
      studentName: 'John Student',
      title: 'Flickering Lights in Library',
      description: 'Several fluorescent lights on the second floor are flickering intermittently.',
      category: 'electrical',
      priority: 'low',
      status: 'submitted',
      location: {
        building: 'Main Library',
        roomNumber: '2nd Floor',
        specificLocation: 'Study area near windows'
      },
      images: [],
      createdAt: new Date(Date.now() - 3600000 * 6).toISOString(),
      updatedAt: new Date(Date.now() - 3600000 * 6).toISOString(),
      notes: []
    }
  ];

  // Store in localStorage if not already present
  if (!localStorage.getItem('campus_users')) {
    localStorage.setItem('campus_users', JSON.stringify(defaultUsers));
  }
  
  if (!localStorage.getItem('campus_complaints')) {
    localStorage.setItem('campus_complaints', JSON.stringify(defaultComplaints));
  }

  if (!localStorage.getItem('campus_messages')) {
    localStorage.setItem('campus_messages', JSON.stringify([]));
  }
};

// Database operations
export const db = {
  users: {
    getAll: (): User[] => {
      initializeDefaultData();
      return JSON.parse(localStorage.getItem('campus_users') || '[]');
    },
    
    getById: (id: string): User | null => {
      const users = db.users.getAll();
      return users.find(user => user.id === id) || null;
    },
    
    getByUsername: (username: string): User | null => {
      const users = db.users.getAll();
      return users.find(user => user.username === username) || null;
    },
    
    create: (user: User): User => {
      const users = db.users.getAll();
      users.push(user);
      localStorage.setItem('campus_users', JSON.stringify(users));
      return user;
    },
    
    update: (id: string, updates: Partial<User>): User | null => {
      const users = db.users.getAll();
      const index = users.findIndex(user => user.id === id);
      if (index !== -1) {
        users[index] = { ...users[index], ...updates };
        localStorage.setItem('campus_users', JSON.stringify(users));
        return users[index];
      }
      return null;
    }
  },
  
  complaints: {
    getAll: (): Complaint[] => {
      initializeDefaultData();
      return JSON.parse(localStorage.getItem('campus_complaints') || '[]');
    },
    
    getById: (id: string): Complaint | null => {
      const complaints = db.complaints.getAll();
      return complaints.find(complaint => complaint.id === id) || null;
    },
    
    getByStudentId: (studentId: string): Complaint[] => {
      const complaints = db.complaints.getAll();
      return complaints.filter(complaint => complaint.studentId === studentId);
    },
    
    getByAssignedTo: (maintenanceId: string): Complaint[] => {
      const complaints = db.complaints.getAll();
      return complaints.filter(complaint => complaint.assignedTo === maintenanceId);
    },
    
    create: (complaint: Complaint): Complaint => {
      const complaints = db.complaints.getAll();
      complaints.push(complaint);
      localStorage.setItem('campus_complaints', JSON.stringify(complaints));
      return complaint;
    },
    
    update: (id: string, updates: Partial<Complaint>): Complaint | null => {
      const complaints = db.complaints.getAll();
      const index = complaints.findIndex(complaint => complaint.id === id);
      if (index !== -1) {
        complaints[index] = { ...complaints[index], ...updates, updatedAt: new Date().toISOString() };
        localStorage.setItem('campus_complaints', JSON.stringify(complaints));
        return complaints[index];
      }
      return null;
    }
  },
  
  messages: {
    getAll: (): ChatMessage[] => {
      return JSON.parse(localStorage.getItem('campus_messages') || '[]');
    },
    
    getByComplaintId: (complaintId: string): ChatMessage[] => {
      const messages = db.messages.getAll();
      return messages.filter(message => message.complaintId === complaintId);
    },
    
    create: (message: ChatMessage): ChatMessage => {
      const messages = db.messages.getAll();
      messages.push(message);
      localStorage.setItem('campus_messages', JSON.stringify(messages));
      return message;
    }
  }
};

// Initialize data on first load
initializeDefaultData();
