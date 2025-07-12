
import React, { useState, useEffect, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { ArrowLeft, Send, User, Building2, Wrench } from 'lucide-react';
import { getCurrentUser } from '@/utils/auth';
import { db } from '@/utils/database';
import { Complaint, ChatMessage } from '@/types';
import { useToast } from '@/hooks/use-toast';

interface ChatInterfaceProps {
  complaint: Complaint;
  onBack: () => void;
}

const ChatInterface = ({ complaint, onBack }: ChatInterfaceProps) => {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const currentUser = getCurrentUser();
  const { toast } = useToast();

  useEffect(() => {
    loadMessages();
  }, [complaint.id]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const loadMessages = () => {
    const complaintMessages = db.messages.getByComplaintId(complaint.id);
    setMessages(complaintMessages);
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim() || !currentUser) return;

    const messageId = `msg-${Date.now()}`;
    const message: ChatMessage = {
      id: messageId,
      complaintId: complaint.id,
      userId: currentUser.id,
      userName: currentUser.name,
      userRole: currentUser.role,
      message: newMessage.trim(),
      timestamp: new Date().toISOString(),
    };

    try {
      db.messages.create(message);
      setMessages(prev => [...prev, message]);
      setNewMessage('');

      // Simulate typing indicator for demo
      if (currentUser.role === 'student') {
        setIsTyping(true);
        setTimeout(() => {
          setIsTyping(false);
          // Simulate admin response
          const adminResponse: ChatMessage = {
            id: `msg-${Date.now() + 1}`,
            complaintId: complaint.id,
            userId: '1',
            userName: 'Campus Administrator',
            userRole: 'admin',
            message: 'Thank you for the additional information. We will review your complaint and update you soon.',
            timestamp: new Date().toISOString(),
          };
          db.messages.create(adminResponse);
          setMessages(prev => [...prev, adminResponse]);
        }, 2000);
      }

      toast({
        title: 'Message Sent',
        description: 'Your message has been sent successfully.',
      });
    } catch (error) {
      toast({
        title: 'Failed to Send',
        description: 'Failed to send message. Please try again.',
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
                    {complaint.location.building}, Room {complaint.location.roomNumber}
                    {complaint.location.specificLocation && (
                      <><br />{complaint.location.specificLocation}</>
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
                <div>
                  <h4 className="font-semibold text-sm text-gray-600">Submitted</h4>
                  <p className="text-sm">{new Date(complaint.createdAt).toLocaleString()}</p>
                </div>
                {complaint.assignedToName && (
                  <div>
                    <h4 className="font-semibold text-sm text-gray-600">Assigned To</h4>
                    <p className="text-sm">{complaint.assignedToName}</p>
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
                          message.userId === currentUser?.id ? 'justify-end' : 'justify-start'
                        }`}
                      >
                        <div
                          className={`max-w-xs lg:max-w-md px-4 py-2 rounded-lg ${
                            message.userId === currentUser?.id
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
