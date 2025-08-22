
import React, { useState, useEffect, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { ArrowLeft, Send, User, Building2, Wrench } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';

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
  student_name?: string;
  assigned_to_name?: string;
}

interface ChatMessage {
  id: string;
  complaint_id: string;
  user_id: string;
  message: string;
  created_at: string;
  user_name?: string;
  user_role?: string;
}

interface ChatInterfaceProps {
  complaint: Complaint;
  onBack: () => void;
}

const ChatInterface = ({ complaint, onBack }: ChatInterfaceProps) => {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const { user, profile } = useAuth();
  const { toast } = useToast();

  useEffect(() => {
    loadMessages();
  }, [complaint.id]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const loadMessages = () => {
    loadMessagesFromDB();
  };

  const loadMessagesFromDB = async () => {
    try {
      const { data, error } = await supabase
        .from('chat_messages')
        .select(`
          *,
          profiles(name, role)
        `)
        .eq('complaint_id', complaint.id)
        .order('created_at', { ascending: true });

      if (error) {
        console.error('Error loading messages:', error);
        return;
      }

      const transformedMessages = data.map(msg => ({
        id: msg.id,
        complaintId: msg.complaint_id,
        userId: msg.user_id,
        userName: msg.profiles?.name || 'Unknown User',
        userRole: msg.profiles?.role || 'unknown',
        message: msg.message,
        timestamp: msg.created_at,
      }));

      setMessages(transformedMessages);
    } catch (error) {
      console.error('Error loading messages:', error);
    }
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim() || !user || !profile) return;

    const messageData = {
      complaint_id: complaint.id,
      user_id: profile.id,
      message: newMessage.trim(),
    };

    try {
      const { data, error } = await supabase
        .from('chat_messages')
        .insert(messageData)
        .select(`
          *,
          profiles(name, role)
        `)
        .single();

      if (error) {
        throw error;
      }

      const newMsg = {
        id: data.id,
        complaintId: data.complaint_id,
        userId: data.user_id,
        userName: data.profiles?.name || profile.name,
        userRole: data.profiles?.role || profile.role,
        message: data.message,
        timestamp: data.created_at,
      };

      setMessages(prev => [...prev, newMsg]);
      setNewMessage('');

      toast({
        title: 'Message Sent',
        description: 'Your message has been sent successfully.',
      });
    } catch (error) {
      console.error('Error sending message:', error);
      toast({
        title: 'Failed to Send',
        description: error?.message || 'Failed to send message. Please try again.',
        variant: 'destructive',
      });
    }
  };

  const getRoleIcon = (role: string) => {
    switch (role) {
      case 'student':
        return <User className="h-4 w-4" />;
      case 'admin':
        return <Building2 className="h-4 w-4" />;
      case 'maintenance':
        return <Wrench className="h-4 w-4" />;
      default:
        return <User className="h-4 w-4" />;
    }
  };

  const getRoleColor = (role: string) => {
    switch (role) {
      case 'student':
        return 'bg-blue-100 text-blue-800';
      case 'admin':
        return 'bg-green-100 text-green-800';
      case 'maintenance':
        return 'bg-orange-100 text-orange-800';
      default:
        return 'bg-gray-100 text-gray-800';
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

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-white border-b">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="py-6">
            <Button variant="ghost" onClick={onBack} className="mb-4">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Dashboard
            </Button>
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-2xl font-bold text-gray-900">{complaint.title}</h1>
                <p className="text-gray-600">Complaint ID: {complaint.id}</p>
              </div>
              <div className="flex items-center space-x-2">
                <Badge className={getStatusColor(complaint.status)}>
                  {complaint.status.replace('-', ' ')}
                </Badge>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Complaint Details */}
          <div className="lg:col-span-1">
            <Card>
              <CardHeader>
                <CardTitle>Complaint Details</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <h4 className="font-semibold text-sm text-gray-600">Description</h4>
                  <p className="text-sm">{complaint.description}</p>
                </div>
                <div>
                  <h4 className="font-semibold text-sm text-gray-600">Location</h4>
                  <p className="text-sm">
                    {complaint.building}, Room {complaint.room_number}
                    {complaint.specific_location && (
                      <><br />{complaint.specific_location}</>
                    )}
                  </p>
                </div>
                <div>
                  <h4 className="font-semibold text-sm text-gray-600">Category</h4>
                  <p className="text-sm capitalize">{complaint.category}</p>
                </div>
                <div>
                  <h4 className="font-semibold text-sm text-gray-600">Priority</h4>
                  <Badge className={`${
                    complaint.priority === 'urgent' ? 'bg-red-100 text-red-800' :
                    complaint.priority === 'high' ? 'bg-orange-100 text-orange-800' :
                    complaint.priority === 'medium' ? 'bg-yellow-100 text-yellow-800' :
                    'bg-green-100 text-green-800'
                  }`}>
                    {complaint.priority}
                  </Badge>
                </div>
                {complaint.images && complaint.images.length > 0 && (
                  <div>
                    <h4 className="font-semibold text-sm text-gray-600 mb-2">Images</h4>
                    <div className="grid grid-cols-2 gap-2">
                      {complaint.images.map((imageUrl, index) => (
                        <div key={index} className="aspect-square rounded-lg overflow-hidden bg-gray-100 border">
                          <img
                            src={imageUrl}
                            alt={`Complaint image ${index + 1}`}
                            className="w-full h-full object-cover cursor-pointer hover:opacity-80 transition-opacity"
                            onClick={() => window.open(imageUrl, '_blank')}
                          />
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                <div>
                  <h4 className="font-semibold text-sm text-gray-600">Submitted</h4>
                  <p className="text-sm">{new Date(complaint.created_at).toLocaleString()}</p>
                </div>
                {complaint.assigned_to_name && (
                  <div>
                    <h4 className="font-semibold text-sm text-gray-600">Assigned To</h4>
                    <p className="text-sm">{complaint.assigned_to_name}</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Chat Interface */}
          <div className="lg:col-span-2">
            <Card className="h-[600px] flex flex-col">
              <CardHeader>
                <CardTitle>Communication</CardTitle>
              </CardHeader>
              <CardContent className="flex-1 flex flex-col">
                {/* Messages */}
                <div className="flex-1 overflow-y-auto space-y-4 mb-4 border rounded-lg p-4 bg-gray-50">
                  {messages.length === 0 ? (
                    <div className="text-center text-gray-500 py-8">
                      <p>No messages yet. Start the conversation!</p>
                    </div>
                  ) : (
                    messages.map((message) => (
                      <div
                        key={message.id}
                        className={`flex ${
                          message.userId === user?.id ? 'justify-end' : 'justify-start'
                        }`}
                      >
                        <div
                          className={`max-w-xs lg:max-w-md px-4 py-2 rounded-lg ${
                            message.userId === user?.id
                              ? 'bg-blue-600 text-white'
                              : 'bg-white border'
                          }`}
                        >
                          <div className="flex items-center space-x-2 mb-1">
                            <Badge className={getRoleColor(message.userRole)} variant="secondary">
                              <span className="flex items-center space-x-1">
                                {getRoleIcon(message.userRole)}
                                <span className="text-xs">{message.userRole}</span>
                              </span>
                            </Badge>
                            <span className="text-xs opacity-70">
                              {message.userName}
                            </span>
                          </div>
                          <p className="text-sm">{message.message}</p>
                          <p className="text-xs opacity-70 mt-1">
                            {new Date(message.timestamp).toLocaleTimeString()}
                          </p>
                        </div>
                      </div>
                    ))
                  )}
                  
                  {isTyping && (
                    <div className="flex justify-start">
                      <div className="bg-gray-200 px-4 py-2 rounded-lg">
                        <div className="flex space-x-1">
                          <div className="w-2 h-2 bg-gray-500 rounded-full animate-bounce"></div>
                          <div className="w-2 h-2 bg-gray-500 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                          <div className="w-2 h-2 bg-gray-500 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                        </div>
                      </div>
                    </div>
                  )}
                  
                  <div ref={messagesEndRef} />
                </div>

                {/* Message Input */}
                <form onSubmit={handleSendMessage} className="flex space-x-2">
                  <Input
                    value={newMessage}
                    onChange={(e) => setNewMessage(e.target.value)}
                    placeholder="Type your message..."
                    className="flex-1"
                  />
                  <Button type="submit" disabled={!newMessage.trim()}>
                    <Send className="h-4 w-4" />
                  </Button>
                </form>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ChatInterface;
