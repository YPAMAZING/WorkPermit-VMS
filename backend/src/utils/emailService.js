// Email Service using Nodemailer with Hostinger SMTP
const nodemailer = require('nodemailer');

// Create reusable transporter
const createTransporter = () => {
  return nodemailer.createTransport({
    host: process.env.SMTP_HOST || 'smtp.hostinger.com',
    port: parseInt(process.env.SMTP_PORT) || 465,
    secure: true, // true for 465, false for other ports
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
  });
};

// Base email template with professional styling
const getBaseTemplate = (content, title = 'Notification') => {
  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${title}</title>
</head>
<body style="margin: 0; padding: 0; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #f4f4f4;">
  <table role="presentation" style="width: 100%; border-collapse: collapse;">
    <tr>
      <td style="padding: 40px 0;">
        <table role="presentation" style="width: 100%; max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);">
          <!-- Header -->
          <tr>
            <td style="background: linear-gradient(135deg, #0d9488 0%, #0f766e 100%); padding: 30px 40px; text-align: center;">
              <h1 style="color: #ffffff; margin: 0; font-size: 24px; font-weight: 600;">
                ${process.env.COMPANY_NAME || 'RG DG Tech Park'}
              </h1>
            </td>
          </tr>
          <!-- Content -->
          <tr>
            <td style="padding: 40px;">
              ${content}
            </td>
          </tr>
          <!-- Footer -->
          <tr>
            <td style="background-color: #f8f9fa; padding: 20px 40px; text-align: center; border-top: 1px solid #e9ecef;">
              <p style="margin: 0; font-size: 12px; color: #6c757d;">
                This is an automated message from ${process.env.COMPANY_NAME || 'RG DG Tech Park'} Management System.
              </p>
              <p style="margin: 10px 0 0 0; font-size: 12px; color: #6c757d;">
                © ${new Date().getFullYear()} All rights reserved.
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
`;
};

// ================================
// VMS EMAIL TEMPLATES
// ================================

// Visitor Approved Email
const getVisitorApprovedTemplate = (data) => {
  const { visitorName, companyToVisit, personToMeet, purpose, passNumber, validFrom, validUntil, qrCodeUrl } = data;
  
  const content = `
    <div style="text-align: center; margin-bottom: 30px;">
      <div style="width: 80px; height: 80px; background-color: #d1fae5; border-radius: 50%; display: inline-flex; align-items: center; justify-content: center; margin-bottom: 15px;">
        <span style="font-size: 40px;">✓</span>
      </div>
      <h2 style="color: #059669; margin: 0; font-size: 24px;">Visit Approved!</h2>
    </div>
    
    <p style="color: #374151; font-size: 16px; line-height: 1.6; margin-bottom: 20px;">
      Dear <strong>${visitorName}</strong>,
    </p>
    
    <p style="color: #374151; font-size: 16px; line-height: 1.6; margin-bottom: 25px;">
      Your visit request has been approved. Please find your visitor pass details below:
    </p>
    
    <table style="width: 100%; background-color: #f0fdf4; border-radius: 8px; padding: 20px; margin-bottom: 25px;">
      <tr>
        <td style="padding: 10px 15px; border-bottom: 1px solid #dcfce7;">
          <strong style="color: #374151;">Pass Number:</strong>
        </td>
        <td style="padding: 10px 15px; border-bottom: 1px solid #dcfce7; color: #059669; font-weight: bold; font-size: 18px;">
          ${passNumber}
        </td>
      </tr>
      <tr>
        <td style="padding: 10px 15px; border-bottom: 1px solid #dcfce7;">
          <strong style="color: #374151;">Company:</strong>
        </td>
        <td style="padding: 10px 15px; border-bottom: 1px solid #dcfce7; color: #374151;">
          ${companyToVisit}
        </td>
      </tr>
      <tr>
        <td style="padding: 10px 15px; border-bottom: 1px solid #dcfce7;">
          <strong style="color: #374151;">Person to Meet:</strong>
        </td>
        <td style="padding: 10px 15px; border-bottom: 1px solid #dcfce7; color: #374151;">
          ${personToMeet || 'N/A'}
        </td>
      </tr>
      <tr>
        <td style="padding: 10px 15px; border-bottom: 1px solid #dcfce7;">
          <strong style="color: #374151;">Purpose:</strong>
        </td>
        <td style="padding: 10px 15px; border-bottom: 1px solid #dcfce7; color: #374151;">
          ${purpose}
        </td>
      </tr>
      <tr>
        <td style="padding: 10px 15px;">
          <strong style="color: #374151;">Valid:</strong>
        </td>
        <td style="padding: 10px 15px; color: #374151;">
          ${new Date(validFrom).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })} - 
          ${new Date(validUntil).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
        </td>
      </tr>
    </table>
    
    <div style="background-color: #fef3c7; border-left: 4px solid #f59e0b; padding: 15px; margin-bottom: 25px; border-radius: 4px;">
      <p style="margin: 0; color: #92400e; font-size: 14px;">
        <strong>Important:</strong> Please show this email or your pass number at the reception desk upon arrival.
      </p>
    </div>
    
    <p style="color: #6b7280; font-size: 14px; text-align: center;">
      We look forward to your visit!
    </p>
  `;
  
  return getBaseTemplate(content, 'Visit Approved');
};

// New Visitor Registration Email (to company)
const getNewVisitorNotificationTemplate = (data) => {
  const { visitorName, phone, email, companyFrom, companyToVisit, personToMeet, purpose, numberOfVisitors, dashboardUrl } = data;
  
  const content = `
    <div style="text-align: center; margin-bottom: 30px;">
      <div style="width: 80px; height: 80px; background-color: #dbeafe; border-radius: 50%; display: inline-flex; align-items: center; justify-content: center; margin-bottom: 15px;">
        <span style="font-size: 40px;">👤</span>
      </div>
      <h2 style="color: #1d4ed8; margin: 0; font-size: 24px;">New Visitor Request</h2>
    </div>
    
    <p style="color: #374151; font-size: 16px; line-height: 1.6; margin-bottom: 25px;">
      A new visitor is requesting access to your company. Please review and take action:
    </p>
    
    <table style="width: 100%; background-color: #eff6ff; border-radius: 8px; padding: 20px; margin-bottom: 25px;">
      <tr>
        <td style="padding: 10px 15px; border-bottom: 1px solid #dbeafe; width: 40%;">
          <strong style="color: #374151;">Visitor Name:</strong>
        </td>
        <td style="padding: 10px 15px; border-bottom: 1px solid #dbeafe; color: #1d4ed8; font-weight: bold;">
          ${visitorName}
        </td>
      </tr>
      <tr>
        <td style="padding: 10px 15px; border-bottom: 1px solid #dbeafe;">
          <strong style="color: #374151;">Phone:</strong>
        </td>
        <td style="padding: 10px 15px; border-bottom: 1px solid #dbeafe; color: #374151;">
          ${phone}
        </td>
      </tr>
      ${email ? `
      <tr>
        <td style="padding: 10px 15px; border-bottom: 1px solid #dbeafe;">
          <strong style="color: #374151;">Email:</strong>
        </td>
        <td style="padding: 10px 15px; border-bottom: 1px solid #dbeafe; color: #374151;">
          ${email}
        </td>
      </tr>
      ` : ''}
      <tr>
        <td style="padding: 10px 15px; border-bottom: 1px solid #dbeafe;">
          <strong style="color: #374151;">Coming From:</strong>
        </td>
        <td style="padding: 10px 15px; border-bottom: 1px solid #dbeafe; color: #374151;">
          ${companyFrom || 'N/A'}
        </td>
      </tr>
      <tr>
        <td style="padding: 10px 15px; border-bottom: 1px solid #dbeafe;">
          <strong style="color: #374151;">Person to Meet:</strong>
        </td>
        <td style="padding: 10px 15px; border-bottom: 1px solid #dbeafe; color: #374151;">
          ${personToMeet || 'N/A'}
        </td>
      </tr>
      <tr>
        <td style="padding: 10px 15px; border-bottom: 1px solid #dbeafe;">
          <strong style="color: #374151;">Purpose:</strong>
        </td>
        <td style="padding: 10px 15px; border-bottom: 1px solid #dbeafe; color: #374151;">
          ${purpose}
        </td>
      </tr>
      <tr>
        <td style="padding: 10px 15px;">
          <strong style="color: #374151;">Number of Visitors:</strong>
        </td>
        <td style="padding: 10px 15px; color: #374151;">
          ${numberOfVisitors || 1}
        </td>
      </tr>
    </table>
    
    <div style="text-align: center; margin-bottom: 25px;">
      <a href="${dashboardUrl || '#'}" style="display: inline-block; background-color: #0d9488; color: #ffffff; text-decoration: none; padding: 14px 32px; border-radius: 8px; font-weight: 600; font-size: 16px;">
        Review & Approve
      </a>
    </div>
    
    <div style="background-color: #fef3c7; border-left: 4px solid #f59e0b; padding: 15px; border-radius: 4px;">
      <p style="margin: 0; color: #92400e; font-size: 14px;">
        <strong>Action Required:</strong> Please approve or reject this visitor request from your dashboard.
      </p>
    </div>
  `;
  
  return getBaseTemplate(content, 'New Visitor Request');
};

// Pre-Approval Created Email (to visitor)
const getPreApprovalCreatedTemplate = (data) => {
  const { visitorName, companyName, personToMeet, purpose, passNumber, validFrom, validUntil, remarks } = data;
  
  const content = `
    <div style="text-align: center; margin-bottom: 30px;">
      <div style="width: 80px; height: 80px; background-color: #e0e7ff; border-radius: 50%; display: inline-flex; align-items: center; justify-content: center; margin-bottom: 15px;">
        <span style="font-size: 40px;">🎫</span>
      </div>
      <h2 style="color: #4f46e5; margin: 0; font-size: 24px;">You're Pre-Approved!</h2>
    </div>
    
    <p style="color: #374151; font-size: 16px; line-height: 1.6; margin-bottom: 20px;">
      Dear <strong>${visitorName}</strong>,
    </p>
    
    <p style="color: #374151; font-size: 16px; line-height: 1.6; margin-bottom: 25px;">
      You have been pre-approved for a visit to <strong>${companyName}</strong>. Please find your pre-approval pass details below:
    </p>
    
    <table style="width: 100%; background-color: #eef2ff; border-radius: 8px; padding: 20px; margin-bottom: 25px;">
      <tr>
        <td style="padding: 10px 15px; border-bottom: 1px solid #c7d2fe;">
          <strong style="color: #374151;">Pass Number:</strong>
        </td>
        <td style="padding: 10px 15px; border-bottom: 1px solid #c7d2fe; color: #4f46e5; font-weight: bold; font-size: 18px;">
          ${passNumber || 'Will be assigned at check-in'}
        </td>
      </tr>
      <tr>
        <td style="padding: 10px 15px; border-bottom: 1px solid #c7d2fe;">
          <strong style="color: #374151;">Company:</strong>
        </td>
        <td style="padding: 10px 15px; border-bottom: 1px solid #c7d2fe; color: #374151;">
          ${companyName}
        </td>
      </tr>
      <tr>
        <td style="padding: 10px 15px; border-bottom: 1px solid #c7d2fe;">
          <strong style="color: #374151;">Person to Meet:</strong>
        </td>
        <td style="padding: 10px 15px; border-bottom: 1px solid #c7d2fe; color: #374151;">
          ${personToMeet || 'N/A'}
        </td>
      </tr>
      <tr>
        <td style="padding: 10px 15px; border-bottom: 1px solid #c7d2fe;">
          <strong style="color: #374151;">Purpose:</strong>
        </td>
        <td style="padding: 10px 15px; border-bottom: 1px solid #c7d2fe; color: #374151;">
          ${purpose}
        </td>
      </tr>
      <tr>
        <td style="padding: 10px 15px;">
          <strong style="color: #374151;">Valid Period:</strong>
        </td>
        <td style="padding: 10px 15px; color: #374151;">
          ${new Date(validFrom).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })} - 
          ${new Date(validUntil).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
        </td>
      </tr>
    </table>
    
    ${remarks ? `
    <div style="background-color: #f3f4f6; padding: 15px; margin-bottom: 25px; border-radius: 8px;">
      <p style="margin: 0; color: #374151; font-size: 14px;">
        <strong>Additional Notes:</strong> ${remarks}
      </p>
    </div>
    ` : ''}
    
    <div style="background-color: #d1fae5; border-left: 4px solid #059669; padding: 15px; margin-bottom: 25px; border-radius: 4px;">
      <p style="margin: 0; color: #065f46; font-size: 14px;">
        <strong>How to use:</strong> Show this email at the reception desk when you arrive. Your entry will be fast-tracked as you're already pre-approved.
      </p>
    </div>
    
    <p style="color: #6b7280; font-size: 14px; text-align: center;">
      We look forward to your visit!
    </p>
  `;
  
  return getBaseTemplate(content, 'Pre-Approval Pass');
};

// Employee Pass Created Email
const getEmployeePassCreatedTemplate = (data) => {
  const { employeeName, department, designation, passNumber, validFrom, validUntil, companyName } = data;
  
  const content = `
    <div style="text-align: center; margin-bottom: 30px;">
      <div style="width: 80px; height: 80px; background-color: #fce7f3; border-radius: 50%; display: inline-flex; align-items: center; justify-content: center; margin-bottom: 15px;">
        <span style="font-size: 40px;">🪪</span>
      </div>
      <h2 style="color: #db2777; margin: 0; font-size: 24px;">Welcome to ${companyName || 'the Team'}!</h2>
    </div>
    
    <p style="color: #374151; font-size: 16px; line-height: 1.6; margin-bottom: 20px;">
      Dear <strong>${employeeName}</strong>,
    </p>
    
    <p style="color: #374151; font-size: 16px; line-height: 1.6; margin-bottom: 25px;">
      Your temporary employee pass has been created. Please use this pass for entry until your permanent ID card is issued.
    </p>
    
    <div style="background: linear-gradient(135deg, #0d9488 0%, #0f766e 100%); border-radius: 12px; padding: 25px; margin-bottom: 25px; color: #ffffff;">
      <div style="text-align: center; margin-bottom: 15px;">
        <p style="margin: 0; font-size: 12px; text-transform: uppercase; letter-spacing: 1px; opacity: 0.9;">Temporary Employee Pass</p>
        <p style="margin: 10px 0 0 0; font-size: 28px; font-weight: bold; letter-spacing: 2px;">${passNumber}</p>
      </div>
      <hr style="border: none; border-top: 1px solid rgba(255,255,255,0.3); margin: 15px 0;">
      <table style="width: 100%;">
        <tr>
          <td style="padding: 5px 0; font-size: 14px; opacity: 0.9;">Name:</td>
          <td style="padding: 5px 0; font-size: 14px; font-weight: 600; text-align: right;">${employeeName}</td>
        </tr>
        <tr>
          <td style="padding: 5px 0; font-size: 14px; opacity: 0.9;">Department:</td>
          <td style="padding: 5px 0; font-size: 14px; font-weight: 600; text-align: right;">${department}</td>
        </tr>
        ${designation ? `
        <tr>
          <td style="padding: 5px 0; font-size: 14px; opacity: 0.9;">Designation:</td>
          <td style="padding: 5px 0; font-size: 14px; font-weight: 600; text-align: right;">${designation}</td>
        </tr>
        ` : ''}
        <tr>
          <td style="padding: 5px 0; font-size: 14px; opacity: 0.9;">Valid Until:</td>
          <td style="padding: 5px 0; font-size: 14px; font-weight: 600; text-align: right;">
            ${new Date(validUntil).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
          </td>
        </tr>
      </table>
    </div>
    
    <div style="background-color: #fef3c7; border-left: 4px solid #f59e0b; padding: 15px; margin-bottom: 25px; border-radius: 4px;">
      <p style="margin: 0; color: #92400e; font-size: 14px;">
        <strong>Important:</strong> This is a temporary pass valid until ${new Date(validUntil).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}. Please collect your permanent ID card from HR before expiry.
      </p>
    </div>
    
    <p style="color: #6b7280; font-size: 14px; text-align: center;">
      Welcome aboard! We're excited to have you join us.
    </p>
  `;
  
  return getBaseTemplate(content, 'Employee Pass');
};

// ================================
// WORK PERMIT EMAIL TEMPLATES
// ================================

// Permit Approved Email
const getPermitApprovedTemplate = (data) => {
  const { permitNumber, title, requestorName, location, workType, startDate, endDate, approverName, approverRole } = data;
  
  const content = `
    <div style="text-align: center; margin-bottom: 30px;">
      <div style="width: 80px; height: 80px; background-color: #d1fae5; border-radius: 50%; display: inline-flex; align-items: center; justify-content: center; margin-bottom: 15px;">
        <span style="font-size: 40px;">✓</span>
      </div>
      <h2 style="color: #059669; margin: 0; font-size: 24px;">Permit Approved!</h2>
    </div>
    
    <p style="color: #374151; font-size: 16px; line-height: 1.6; margin-bottom: 20px;">
      Dear <strong>${requestorName}</strong>,
    </p>
    
    <p style="color: #374151; font-size: 16px; line-height: 1.6; margin-bottom: 25px;">
      Great news! Your work permit has been approved. Please find the details below:
    </p>
    
    <table style="width: 100%; background-color: #f0fdf4; border-radius: 8px; padding: 20px; margin-bottom: 25px;">
      <tr>
        <td style="padding: 10px 15px; border-bottom: 1px solid #dcfce7;">
          <strong style="color: #374151;">Permit Number:</strong>
        </td>
        <td style="padding: 10px 15px; border-bottom: 1px solid #dcfce7; color: #059669; font-weight: bold; font-size: 18px;">
          ${permitNumber}
        </td>
      </tr>
      <tr>
        <td style="padding: 10px 15px; border-bottom: 1px solid #dcfce7;">
          <strong style="color: #374151;">Title:</strong>
        </td>
        <td style="padding: 10px 15px; border-bottom: 1px solid #dcfce7; color: #374151;">
          ${title}
        </td>
      </tr>
      <tr>
        <td style="padding: 10px 15px; border-bottom: 1px solid #dcfce7;">
          <strong style="color: #374151;">Work Type:</strong>
        </td>
        <td style="padding: 10px 15px; border-bottom: 1px solid #dcfce7; color: #374151;">
          ${workType}
        </td>
      </tr>
      <tr>
        <td style="padding: 10px 15px; border-bottom: 1px solid #dcfce7;">
          <strong style="color: #374151;">Location:</strong>
        </td>
        <td style="padding: 10px 15px; border-bottom: 1px solid #dcfce7; color: #374151;">
          ${location}
        </td>
      </tr>
      <tr>
        <td style="padding: 10px 15px; border-bottom: 1px solid #dcfce7;">
          <strong style="color: #374151;">Duration:</strong>
        </td>
        <td style="padding: 10px 15px; border-bottom: 1px solid #dcfce7; color: #374151;">
          ${new Date(startDate).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })} - 
          ${new Date(endDate).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
        </td>
      </tr>
      <tr>
        <td style="padding: 10px 15px;">
          <strong style="color: #374151;">Approved By:</strong>
        </td>
        <td style="padding: 10px 15px; color: #374151;">
          ${approverName} (${approverRole})
        </td>
      </tr>
    </table>
    
    <div style="background-color: #d1fae5; border-left: 4px solid #059669; padding: 15px; margin-bottom: 25px; border-radius: 4px;">
      <p style="margin: 0; color: #065f46; font-size: 14px;">
        <strong>You may now proceed with the work.</strong> Please ensure all safety protocols are followed.
      </p>
    </div>
    
    <div style="background-color: #fef3c7; border-left: 4px solid #f59e0b; padding: 15px; border-radius: 4px;">
      <p style="margin: 0; color: #92400e; font-size: 14px;">
        <strong>Reminder:</strong> Please close the permit once work is completed.
      </p>
    </div>
  `;
  
  return getBaseTemplate(content, 'Work Permit Approved');
};

// Permit Rejected Email
const getPermitRejectedTemplate = (data) => {
  const { permitNumber, title, requestorName, location, workType, rejectedBy, rejectionReason, comment } = data;
  
  const content = `
    <div style="text-align: center; margin-bottom: 30px;">
      <div style="width: 80px; height: 80px; background-color: #fee2e2; border-radius: 50%; display: inline-flex; align-items: center; justify-content: center; margin-bottom: 15px;">
        <span style="font-size: 40px;">✕</span>
      </div>
      <h2 style="color: #dc2626; margin: 0; font-size: 24px;">Permit Not Approved</h2>
    </div>
    
    <p style="color: #374151; font-size: 16px; line-height: 1.6; margin-bottom: 20px;">
      Dear <strong>${requestorName}</strong>,
    </p>
    
    <p style="color: #374151; font-size: 16px; line-height: 1.6; margin-bottom: 25px;">
      Unfortunately, your work permit request has not been approved. Please review the details and feedback below:
    </p>
    
    <table style="width: 100%; background-color: #fef2f2; border-radius: 8px; padding: 20px; margin-bottom: 25px;">
      <tr>
        <td style="padding: 10px 15px; border-bottom: 1px solid #fecaca;">
          <strong style="color: #374151;">Permit Number:</strong>
        </td>
        <td style="padding: 10px 15px; border-bottom: 1px solid #fecaca; color: #dc2626; font-weight: bold; font-size: 18px;">
          ${permitNumber}
        </td>
      </tr>
      <tr>
        <td style="padding: 10px 15px; border-bottom: 1px solid #fecaca;">
          <strong style="color: #374151;">Title:</strong>
        </td>
        <td style="padding: 10px 15px; border-bottom: 1px solid #fecaca; color: #374151;">
          ${title}
        </td>
      </tr>
      <tr>
        <td style="padding: 10px 15px; border-bottom: 1px solid #fecaca;">
          <strong style="color: #374151;">Work Type:</strong>
        </td>
        <td style="padding: 10px 15px; border-bottom: 1px solid #fecaca; color: #374151;">
          ${workType}
        </td>
      </tr>
      <tr>
        <td style="padding: 10px 15px; border-bottom: 1px solid #fecaca;">
          <strong style="color: #374151;">Location:</strong>
        </td>
        <td style="padding: 10px 15px; border-bottom: 1px solid #fecaca; color: #374151;">
          ${location}
        </td>
      </tr>
      <tr>
        <td style="padding: 10px 15px;">
          <strong style="color: #374151;">Rejected By:</strong>
        </td>
        <td style="padding: 10px 15px; color: #374151;">
          ${rejectedBy}
        </td>
      </tr>
    </table>
    
    <div style="background-color: #fee2e2; border-left: 4px solid #dc2626; padding: 15px; margin-bottom: 25px; border-radius: 4px;">
      <p style="margin: 0 0 10px 0; color: #991b1b; font-size: 14px; font-weight: bold;">
        Reason for Rejection:
      </p>
      <p style="margin: 0; color: #991b1b; font-size: 14px;">
        ${comment || rejectionReason || 'No specific reason provided.'}
      </p>
    </div>
    
    <div style="background-color: #dbeafe; border-left: 4px solid #2563eb; padding: 15px; border-radius: 4px;">
      <p style="margin: 0; color: #1e40af; font-size: 14px;">
        <strong>Next Steps:</strong> Please address the concerns mentioned above and submit a new permit request if needed.
      </p>
    </div>
  `;
  
  return getBaseTemplate(content, 'Work Permit Rejected');
};

// User Credentials Created Email (Work Permit System)
const getUserCredentialsTemplate = (data) => {
  const { userName, email, password, role, loginUrl } = data;
  
  const content = `
    <div style="text-align: center; margin-bottom: 30px;">
      <div style="width: 80px; height: 80px; background-color: #dbeafe; border-radius: 50%; display: inline-flex; align-items: center; justify-content: center; margin-bottom: 15px;">
        <span style="font-size: 40px;">🔐</span>
      </div>
      <h2 style="color: #1d4ed8; margin: 0; font-size: 24px;">Your Account is Ready!</h2>
    </div>
    
    <p style="color: #374151; font-size: 16px; line-height: 1.6; margin-bottom: 20px;">
      Dear <strong>${userName}</strong>,
    </p>
    
    <p style="color: #374151; font-size: 16px; line-height: 1.6; margin-bottom: 25px;">
      Your account has been created for the Work Permit Management System. Please find your login credentials below:
    </p>
    
    <div style="background: linear-gradient(135deg, #1e40af 0%, #1e3a8a 100%); border-radius: 12px; padding: 25px; margin-bottom: 25px; color: #ffffff;">
      <table style="width: 100%;">
        <tr>
          <td style="padding: 8px 0; font-size: 14px; opacity: 0.9;">Email:</td>
          <td style="padding: 8px 0; font-size: 14px; font-weight: 600; text-align: right;">${email}</td>
        </tr>
        <tr>
          <td style="padding: 8px 0; font-size: 14px; opacity: 0.9;">Password:</td>
          <td style="padding: 8px 0; font-size: 16px; font-weight: 600; text-align: right; font-family: monospace; background-color: rgba(255,255,255,0.1); padding: 5px 10px; border-radius: 4px;">${password}</td>
        </tr>
        <tr>
          <td style="padding: 8px 0; font-size: 14px; opacity: 0.9;">Role:</td>
          <td style="padding: 8px 0; font-size: 14px; font-weight: 600; text-align: right;">${role}</td>
        </tr>
      </table>
    </div>
    
    <div style="text-align: center; margin-bottom: 25px;">
      <a href="${loginUrl || '#'}" style="display: inline-block; background-color: #0d9488; color: #ffffff; text-decoration: none; padding: 14px 32px; border-radius: 8px; font-weight: 600; font-size: 16px;">
        Login Now
      </a>
    </div>
    
    <div style="background-color: #fee2e2; border-left: 4px solid #dc2626; padding: 15px; margin-bottom: 25px; border-radius: 4px;">
      <p style="margin: 0; color: #991b1b; font-size: 14px;">
        <strong>Security Notice:</strong> Please change your password after your first login. Do not share your credentials with anyone.
      </p>
    </div>
    
    <p style="color: #6b7280; font-size: 14px; text-align: center;">
      If you did not request this account, please contact the administrator immediately.
    </p>
  `;
  
  return getBaseTemplate(content, 'Account Created');
};

// ================================
// SEND EMAIL FUNCTION
// ================================

const sendEmail = async ({ to, subject, html, text }) => {
  try {
    // Check if email is configured
    if (!process.env.SMTP_USER || !process.env.SMTP_PASS) {
      console.log('Email not configured. SMTP_USER and SMTP_PASS required.');
      console.log('Would have sent email to:', to);
      console.log('Subject:', subject);
      return { success: false, message: 'Email not configured' };
    }
    
    const transporter = createTransporter();
    
    const mailOptions = {
      from: `"${process.env.EMAIL_FROM_NAME || 'RG DG Tech Park'}" <${process.env.SMTP_USER}>`,
      to: Array.isArray(to) ? to.join(', ') : to,
      subject,
      html,
      text: text || subject,
    };
    
    const info = await transporter.sendMail(mailOptions);
    console.log('Email sent successfully:', info.messageId);
    return { success: true, messageId: info.messageId };
  } catch (error) {
    console.error('Failed to send email:', error);
    return { success: false, error: error.message };
  }
};

// ================================
// EXPORT EMAIL FUNCTIONS
// ================================

module.exports = {
  sendEmail,
  // VMS Templates
  sendVisitorApprovedEmail: async (data) => {
    if (!data.email) return { success: false, message: 'No email provided' };
    return sendEmail({
      to: data.email,
      subject: `Visit Approved - ${data.passNumber}`,
      html: getVisitorApprovedTemplate(data),
    });
  },
  sendNewVisitorNotification: async (data) => {
    if (!data.companyEmail) return { success: false, message: 'No company email provided' };
    return sendEmail({
      to: data.companyEmail,
      subject: `New Visitor Request - ${data.visitorName}`,
      html: getNewVisitorNotificationTemplate(data),
    });
  },
  sendPreApprovalCreatedEmail: async (data) => {
    if (!data.email) return { success: false, message: 'No email provided' };
    return sendEmail({
      to: data.email,
      subject: `You're Pre-Approved to Visit ${data.companyName}`,
      html: getPreApprovalCreatedTemplate(data),
    });
  },
  sendEmployeePassCreatedEmail: async (data) => {
    if (!data.email) return { success: false, message: 'No email provided' };
    return sendEmail({
      to: data.email,
      subject: `Your Employee Pass - ${data.passNumber}`,
      html: getEmployeePassCreatedTemplate(data),
    });
  },
  // Work Permit Templates
  sendPermitApprovedEmail: async (data) => {
    if (!data.email) return { success: false, message: 'No email provided' };
    return sendEmail({
      to: data.email,
      subject: `Work Permit Approved - ${data.permitNumber}`,
      html: getPermitApprovedTemplate(data),
    });
  },
  sendPermitRejectedEmail: async (data) => {
    if (!data.email) return { success: false, message: 'No email provided' };
    return sendEmail({
      to: data.email,
      subject: `Work Permit Not Approved - ${data.permitNumber}`,
      html: getPermitRejectedTemplate(data),
    });
  },
  sendUserCredentialsEmail: async (data) => {
    if (!data.email) return { success: false, message: 'No email provided' };
    return sendEmail({
      to: data.email,
      subject: `Your Account Credentials - ${process.env.COMPANY_NAME || 'Work Permit System'}`,
      html: getUserCredentialsTemplate(data),
    });
  },
};
