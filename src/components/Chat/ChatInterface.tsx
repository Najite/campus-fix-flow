
import React, { useState, useEffect, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { ArrowLeft, Send, User, Building2, Wrench, Upload, X, Image as ImageIcon } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

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
  const [selectedImages, setSelectedImages] = useState<File[]>([]);
  const [imageUrls, setImageUrls] = useState<string[]>([]);
  const [isUploadingImages, setIsUploadingImages] = useState(false);
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

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
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
        setSelectedImages(prev => [...prev, ...validFiles]);
        
        // Create preview URLs
        const newUrls = validFiles.map(file => URL.createObjectURL(file));
        setImageUrls(prev => [...prev, ...newUrls]);
      }
    }
  };

  const removeImage = (index: number) => {
    // Revoke the object URL to free memory
    URL.revokeObjectURL(imageUrls[index]);
    
    setSelectedImages(prev => prev.filter((_, i) => i !== index));
    setImageUrls(prev => prev.filter((_, i) => i !== index));
  };

  const uploadImages = async (): Promise<string[]> => {
    if (selectedImages.length === 0) return [];
    
    setIsUploadingImages(true);
    const uploadedUrls: string[] = [];
    
    try {
      for (const image of selectedImages) {
        const fileExt = image.name.split('.').pop();
        const fileName = `chat-${Date.now()}-${Math.random().toString(36).substring(2)}.${fileExt}`;
        const filePath = `chat/${fileName}`;
        
        const { data, error } = await supabase.storage
          .from('complaint-images')
          .upload(filePath, image);
        
        if (error) {
          console.error('Error uploading image:', error);
          continue;
        }
        
        // Get the public URL
        const { data: { publicUrl } } = supabase.storage
          .from('complaint-images')
          .getPublicUrl(filePath);
        
        uploadedUrls.push(publicUrl);
      }
    } catch (error) {
      console.error('Error during image upload:', error);
    } finally {
      setIsUploadingImages(false);
    }
    
    return uploadedUrls;
  };

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if ((!newMessage.trim() && selectedImages.length === 0) || !user || !profile) return;

    // Upload images first if any
    const uploadedImageUrls = await uploadImages();
    
    let messageText = newMessage.trim();
    if (uploadedImageUrls.length > 0) {
      const imageLinks = uploadedImageUrls.map(url => `[Image](${url})`).join(' ');
      messageText = messageText ? `${messageText}\n\n${imageLinks}` : imageLinks;
    }

    const messageData = {
      complaint_id: complaint.id,
      user_id: profile.id,
      message: messageText,
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
      setSelectedImages([]);
      setImageUrls([]);

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

  const renderMessageContent = (message: string) => {
    // Check if message contains image links
    const imageRegex = /\[Image\]\((https?:\/\/[^\)]+)\)/g;
    const parts = message.split(imageRegex);
    
    return (
      <div className="space-y-2">
        {parts.map((part, index) => {
          if (part.match(/^https?:\/\//)) {
            // This is an image URL
            return (
              <div key={index} className="mt-2">
                <img
                  src={part}
                  alt="Shared image"
                  className="max-w-xs rounded-lg cursor-pointer hover:opacity-80 transition-opacity"
                  onClick={() => window.open(part, '_blank')}
                />
              </div>
            );
          } else if (part.trim()) {
            // This is regular text
            return (
              <p key={index} className="text-sm whitespace-pre-wrap">
                {part}
              </p>
            );
          }
          return null;
        })}
      </div>
    );
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
                          <div>{renderMessageContent(message.message)}</div>
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

                {/* Image Preview */}
                {imageUrls.length > 0 && (
                  <div className="mb-4 p-3 border rounded-lg bg-gray-50">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-medium">Selected Images ({selectedImages.length})</span>
                    </div>
                    <div className="grid grid-cols-3 gap-2">
                      {imageUrls.map((url, index) => (
                        <div key={index} className="relative group">
                          <div className="aspect-square rounded-lg overflow-hidden bg-gray-100 border">
                            <img
                              src={url}
                              alt={`Preview ${index + 1}`}
                              className="w-full h-full object-cover"
                            />
                          </div>
                          <button
                            type="button"
                            onClick={() => removeImage(index)}
                            className="absolute -top-1 -right-1 bg-red-500 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-600"
                          >
                            <X className="h-3 w-3" />
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Message Input */}
                <form onSubmit={handleSendMessage} className="space-y-2">
                  <div className="flex items-center space-x-2">
                    <label htmlFor="image-upload" className="cursor-pointer">
                      <div className="p-2 rounded-lg border hover:bg-gray-50 transition-colors">
                        <Upload className="h-4 w-4 text-gray-500" />
                      </div>
                      <input
                        id="image-upload"
                        type="file"
                        multiple
                        accept="image/*"
                        className="hidden"
                        onChange={handleImageUpload}
                      />
                    </label>
                    <Input
                      value={newMessage}
                      onChange={(e) => setNewMessage(e.target.value)}
                      placeholder="Type your message..."
                      className="flex-1"
                    />
                    <Button 
                      type="submit" 
                      disabled={(!newMessage.trim() && selectedImages.length === 0) || isUploadingImages}
                    >
                      {isUploadingImages ? (
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                      ) : (
                        <Send className="h-4 w-4" />
                      )}
                    </Button>
                  </div>
                </form>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
};

                <form onSubmit={handleSendMessage} className="space-y-2">
                  <div className="flex items-center space-x-2">
                    <label htmlFor="image-upload" className="cursor-pointer">
                      <div className="p-2 rounded-lg border hover:bg-gray-50 transition-colors">
                        <Upload className="h-4 w-4 text-gray-500" />
                      </div>
                      <input
                        id="image-upload"
                        type="file"
                        multiple
                        accept="image/*"
                        className="hidden"
                        onChange={handleImageUpload}
                      />
                    </label>
                    <Input
                      value={newMessage}
                      onChange={(e) => setNewMessage(e.target.value)}
                      placeholder="Type your message..."
                      className="flex-1"
                    />
                    <Button 
                      type="submit" 
                      disabled={(!newMessage.trim() && selectedImages.length === 0) || isUploadingImages}
                    >
                      {isUploadingImages ? (
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                      ) : (
                        <Send className="h-4 w-4" />
                      )}
                    </Button>
                  </div>
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
