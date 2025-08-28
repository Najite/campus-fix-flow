
// Email service using EmailJS
export interface EmailData {
  to_email: string;
  to_name: string;
  subject: string;
  message: string;
  complaint_id?: string;
  complaint_title?: string;
}

class EmailService {
  private serviceId = 'your_service_id'; // Replace with your EmailJS service ID
  private templateId = 'your_template_id'; // Replace with your EmailJS template ID
  private publicKey = 'your_public_key'; // Replace with your EmailJS public key

  async sendEmail(emailData: EmailData): Promise<boolean> {
    try {
      // For demo purposes, we'll simulate email sending
      console.log('📧 Email would be sent:', emailData);
      
      // In a real implementation, you would use EmailJS like this:
      /*
      const response = await emailjs.send(
        this.serviceId,
        this.templateId,
        emailData,
        this.publicKey
      );
      return response.status === 200;
      */
      
      // Simulate successful email sending
      return new Promise((resolve) => {
        setTimeout(() => {
          resolve(true);
        }, 1000);
      });
    } catch (error) {
      console.error('Failed to send email:', error);
      return false;
    }
  }

  async sendComplaintSubmissionEmail(userEmail: string, userName: string, complaintId: string, complaintTitle: string) {
    return this.sendEmail({
      to_email: userEmail,
      to_name: userName,
      subject: 'Complaint Submitted Successfully',
      message: `Your maintenance complaint "${complaintTitle}" has been submitted successfully. Complaint ID: ${complaintId}`,
      complaint_id: complaintId,
      complaint_title: complaintTitle
    });
  }

  async sendStatusUpdateEmail(userEmail: string, userName: string, complaintId: string, complaintTitle: string, newStatus: string) {
    return this.sendEmail({
      to_email: userEmail,
      to_name: userName,
      subject: 'Complaint Status Update',
      message: `Your complaint "${complaintTitle}" status has been updated to: ${newStatus}`,
      complaint_id: complaintId,
      complaint_title: complaintTitle
    });
  }

  async sendAdminNotificationEmail(adminEmail: string, adminName: string, complaintId: string, complaintTitle: string) {
    return this.sendEmail({
      to_email: adminEmail,  
      to_name: adminName,
      subject: 'New Maintenance Complaint',
      message: `A new maintenance complaint has been submitted: "${complaintTitle}" (ID: ${complaintId})`,
      complaint_id: complaintId,
      complaint_title: complaintTitle
    });
  }
}

export const emailService = new EmailService();
