// Email Service using Nodemailer with Hostinger SMTP
// Updated for Outlook and Gmail compatibility
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

// Outlook-compatible email wrapper
const getEmailWrapper = (content, title = 'Notification') => {
  return `
<!DOCTYPE html PUBLIC "-//W3C//DTD XHTML 1.0 Transitional//EN" "http://www.w3.org/TR/xhtml1/DTD/xhtml1-transitional.dtd">
<html xmlns="http://www.w3.org/1999/xhtml">
<head>
  <meta http-equiv="Content-Type" content="text/html; charset=UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0"/>
  <title>${title}</title>
  <!--[if mso]>
  <style type="text/css">
    body, table, td {font-family: Arial, sans-serif !important;}
    table {border-collapse: collapse;}
  </style>
  <![endif]-->
</head>
<body style="margin: 0; padding: 0; background-color: #f4f4f4;">
  <table border="0" cellpadding="0" cellspacing="0" width="100%" style="background-color: #f4f4f4;">
    <tr>
      <td align="center" style="padding: 40px 0;">
        <table border="0" cellpadding="0" cellspacing="0" width="600" style="background-color: #ffffff; border-radius: 8px;">
          ${content}
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
`;
};

// Email header with logo and system badges
const getEmailHeader = () => {
  return `
    <tr>
      <td align="center" style="background-color: #0d9488; padding: 30px 40px;">
        <table border="0" cellpadding="0" cellspacing="0">
          <tr>
            <td align="center">
              <img src="https://reliablespaces.cloud/logo.png" alt="Reliable Group" width="100" style="display: block; max-width: 100px; height: auto; margin-bottom: 15px;" />
            </td>
          </tr>
          <tr>
            <td align="center">
              <h1 style="color: #ffffff; margin: 0; font-family: Arial, sans-serif; font-size: 22px; font-weight: 600;">
                ${process.env.COMPANY_NAME || 'Reliable Group Digital System'}
              </h1>
            </td>
          </tr>
          <tr>
            <td align="center" style="padding-top: 12px;">
              <table border="0" cellpadding="0" cellspacing="0">
                <tr>
                  <td style="padding: 0 4px;">
                    <table border="0" cellpadding="0" cellspacing="0" style="background-color: #1e3a6e; border-radius: 12px;">
                      <tr>
                        <td style="padding: 4px 10px; color: #ffffff; font-family: Arial, sans-serif; font-size: 10px;">&#128295; Work Permit</td>
                      </tr>
                    </table>
                  </td>
                  <td style="padding: 0 4px;">
                    <table border="0" cellpadding="0" cellspacing="0" style="background-color: #059669; border-radius: 12px;">
                      <tr>
                        <td style="padding: 4px 10px; color: #ffffff; font-family: Arial, sans-serif; font-size: 10px;">&#128101; Visitor Management</td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  `;
};

// Email footer
const getEmailFooter = () => {
  return `
    <tr>
      <td style="background-color: #f8f9fa; padding: 20px 40px; border-top: 1px solid #e9ecef;">
        <table border="0" cellpadding="0" cellspacing="0" width="100%">
          <tr>
            <td align="center">
              <p style="margin: 0; font-family: Arial, sans-serif; font-size: 12px; color: #6c757d;">
                This is an automated message from ${process.env.COMPANY_NAME || 'Reliable Group Digital System'} Management System.
              </p>
              <p style="margin: 10px 0 0 0; font-family: Arial, sans-serif; font-size: 12px; color: #6c757d;">
                &copy; ${new Date().getFullYear()} YP SECURITY SERVICES PVT LTD. All rights reserved.
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  `;
};

// ================================
// VMS EMAIL TEMPLATES
// ================================

// Visitor Approved Email
const getVisitorApprovedTemplate = (data) => {
  const { visitorName, companyToVisit, personToMeet, purpose, passNumber, validFrom, validUntil, qrCodeUrl } = data;
  
  const content = `
    ${getEmailHeader()}
    <tr>
      <td style="padding: 40px;">
        <table border="0" cellpadding="0" cellspacing="0" width="100%">
          <tr>
            <td align="center" style="padding-bottom: 30px;">
              <table border="0" cellpadding="0" cellspacing="0" style="background-color: #d1fae5; border-radius: 50%; width: 80px; height: 80px;">
                <tr>
                  <td align="center" valign="middle" style="font-size: 40px;">&#10003;</td>
                </tr>
              </table>
            </td>
          </tr>
          <tr>
            <td align="center" style="padding-bottom: 20px;">
              <h2 style="color: #059669; margin: 0; font-family: Arial, sans-serif; font-size: 24px;">Visit Approved!</h2>
            </td>
          </tr>
          <tr>
            <td style="padding-bottom: 20px;">
              <p style="color: #374151; font-family: Arial, sans-serif; font-size: 16px; line-height: 1.6; margin: 0;">
                Dear <strong>${visitorName}</strong>,
              </p>
            </td>
          </tr>
          <tr>
            <td style="padding-bottom: 25px;">
              <p style="color: #374151; font-family: Arial, sans-serif; font-size: 16px; line-height: 1.6; margin: 0;">
                Your visit request has been approved. Please find your visitor pass details below:
              </p>
            </td>
          </tr>
          <tr>
            <td style="padding-bottom: 25px;">
              <table border="0" cellpadding="0" cellspacing="0" width="100%" style="background-color: #f0fdf4; border-radius: 8px;">
                <tr>
                  <td width="40%" style="padding: 12px 15px; border-bottom: 1px solid #dcfce7;">
                    <strong style="color: #374151; font-family: Arial, sans-serif; font-size: 14px;">Pass Number:</strong>
                  </td>
                  <td style="padding: 12px 15px; border-bottom: 1px solid #dcfce7; color: #059669; font-family: Arial, sans-serif; font-size: 18px; font-weight: bold;">
                    ${passNumber}
                  </td>
                </tr>
                <tr>
                  <td style="padding: 12px 15px; border-bottom: 1px solid #dcfce7;">
                    <strong style="color: #374151; font-family: Arial, sans-serif; font-size: 14px;">Company:</strong>
                  </td>
                  <td style="padding: 12px 15px; border-bottom: 1px solid #dcfce7; color: #374151; font-family: Arial, sans-serif; font-size: 14px;">
                    ${companyToVisit}
                  </td>
                </tr>
                <tr>
                  <td style="padding: 12px 15px; border-bottom: 1px solid #dcfce7;">
                    <strong style="color: #374151; font-family: Arial, sans-serif; font-size: 14px;">Person to Meet:</strong>
                  </td>
                  <td style="padding: 12px 15px; border-bottom: 1px solid #dcfce7; color: #374151; font-family: Arial, sans-serif; font-size: 14px;">
                    ${personToMeet || 'N/A'}
                  </td>
                </tr>
                <tr>
                  <td style="padding: 12px 15px; border-bottom: 1px solid #dcfce7;">
                    <strong style="color: #374151; font-family: Arial, sans-serif; font-size: 14px;">Purpose:</strong>
                  </td>
                  <td style="padding: 12px 15px; border-bottom: 1px solid #dcfce7; color: #374151; font-family: Arial, sans-serif; font-size: 14px;">
                    ${purpose}
                  </td>
                </tr>
                <tr>
                  <td style="padding: 12px 15px;">
                    <strong style="color: #374151; font-family: Arial, sans-serif; font-size: 14px;">Valid:</strong>
                  </td>
                  <td style="padding: 12px 15px; color: #374151; font-family: Arial, sans-serif; font-size: 14px;">
                    ${new Date(validFrom).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })} - 
                    ${new Date(validUntil).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          <tr>
            <td style="padding-bottom: 25px;">
              <table border="0" cellpadding="0" cellspacing="0" width="100%" style="background-color: #fef3c7; border-left: 4px solid #f59e0b; border-radius: 4px;">
                <tr>
                  <td style="padding: 15px;">
                    <p style="margin: 0; color: #92400e; font-family: Arial, sans-serif; font-size: 14px;">
                      <strong>Important:</strong> Please show this email or your pass number at the reception desk upon arrival.
                    </p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          <tr>
            <td align="center">
              <p style="color: #6b7280; font-family: Arial, sans-serif; font-size: 14px; margin: 0;">
                We look forward to your visit!
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
    ${getEmailFooter()}
  `;
  
  return getEmailWrapper(content, 'Visit Approved');
};

// New Visitor Registration Email (to company)
const getNewVisitorNotificationTemplate = (data) => {
  const { visitorName, phone, email, companyFrom, companyToVisit, personToMeet, purpose, numberOfVisitors, dashboardUrl } = data;
  
  const content = `
    ${getEmailHeader()}
    <tr>
      <td style="padding: 40px;">
        <table border="0" cellpadding="0" cellspacing="0" width="100%">
          <tr>
            <td align="center" style="padding-bottom: 30px;">
              <table border="0" cellpadding="0" cellspacing="0" style="background-color: #dbeafe; border-radius: 50%; width: 80px; height: 80px;">
                <tr>
                  <td align="center" valign="middle" style="font-size: 40px;">&#128100;</td>
                </tr>
              </table>
            </td>
          </tr>
          <tr>
            <td align="center" style="padding-bottom: 20px;">
              <h2 style="color: #1d4ed8; margin: 0; font-family: Arial, sans-serif; font-size: 24px;">New Visitor Request</h2>
            </td>
          </tr>
          <tr>
            <td style="padding-bottom: 25px;">
              <p style="color: #374151; font-family: Arial, sans-serif; font-size: 16px; line-height: 1.6; margin: 0;">
                A new visitor is requesting access to your company. Please review and take action:
              </p>
            </td>
          </tr>
          <tr>
            <td style="padding-bottom: 25px;">
              <table border="0" cellpadding="0" cellspacing="0" width="100%" style="background-color: #eff6ff; border-radius: 8px;">
                <tr>
                  <td width="40%" style="padding: 12px 15px; border-bottom: 1px solid #dbeafe;">
                    <strong style="color: #374151; font-family: Arial, sans-serif; font-size: 14px;">Visitor Name:</strong>
                  </td>
                  <td style="padding: 12px 15px; border-bottom: 1px solid #dbeafe; color: #1d4ed8; font-family: Arial, sans-serif; font-size: 14px; font-weight: bold;">
                    ${visitorName}
                  </td>
                </tr>
                <tr>
                  <td style="padding: 12px 15px; border-bottom: 1px solid #dbeafe;">
                    <strong style="color: #374151; font-family: Arial, sans-serif; font-size: 14px;">Phone:</strong>
                  </td>
                  <td style="padding: 12px 15px; border-bottom: 1px solid #dbeafe; color: #374151; font-family: Arial, sans-serif; font-size: 14px;">
                    ${phone}
                  </td>
                </tr>
                ${email ? `
                <tr>
                  <td style="padding: 12px 15px; border-bottom: 1px solid #dbeafe;">
                    <strong style="color: #374151; font-family: Arial, sans-serif; font-size: 14px;">Email:</strong>
                  </td>
                  <td style="padding: 12px 15px; border-bottom: 1px solid #dbeafe; color: #374151; font-family: Arial, sans-serif; font-size: 14px;">
                    ${email}
                  </td>
                </tr>
                ` : ''}
                <tr>
                  <td style="padding: 12px 15px; border-bottom: 1px solid #dbeafe;">
                    <strong style="color: #374151; font-family: Arial, sans-serif; font-size: 14px;">Coming From:</strong>
                  </td>
                  <td style="padding: 12px 15px; border-bottom: 1px solid #dbeafe; color: #374151; font-family: Arial, sans-serif; font-size: 14px;">
                    ${companyFrom || 'N/A'}
                  </td>
                </tr>
                <tr>
                  <td style="padding: 12px 15px; border-bottom: 1px solid #dbeafe;">
                    <strong style="color: #374151; font-family: Arial, sans-serif; font-size: 14px;">Person to Meet:</strong>
                  </td>
                  <td style="padding: 12px 15px; border-bottom: 1px solid #dbeafe; color: #374151; font-family: Arial, sans-serif; font-size: 14px;">
                    ${personToMeet || 'N/A'}
                  </td>
                </tr>
                <tr>
                  <td style="padding: 12px 15px; border-bottom: 1px solid #dbeafe;">
                    <strong style="color: #374151; font-family: Arial, sans-serif; font-size: 14px;">Purpose:</strong>
                  </td>
                  <td style="padding: 12px 15px; border-bottom: 1px solid #dbeafe; color: #374151; font-family: Arial, sans-serif; font-size: 14px;">
                    ${purpose}
                  </td>
                </tr>
                <tr>
                  <td style="padding: 12px 15px;">
                    <strong style="color: #374151; font-family: Arial, sans-serif; font-size: 14px;">Number of Visitors:</strong>
                  </td>
                  <td style="padding: 12px 15px; color: #374151; font-family: Arial, sans-serif; font-size: 14px;">
                    ${numberOfVisitors || 1}
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          <tr>
            <td align="center" style="padding-bottom: 25px;">
              <table border="0" cellpadding="0" cellspacing="0">
                <tr>
                  <td align="center" style="background-color: #0d9488; border-radius: 8px;">
                    <a href="${dashboardUrl || '#'}" target="_blank" style="display: inline-block; padding: 14px 32px; color: #ffffff; font-family: Arial, sans-serif; font-size: 16px; font-weight: 600; text-decoration: none;">
                      Review &amp; Approve
                    </a>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          <tr>
            <td>
              <table border="0" cellpadding="0" cellspacing="0" width="100%" style="background-color: #fef3c7; border-left: 4px solid #f59e0b; border-radius: 4px;">
                <tr>
                  <td style="padding: 15px;">
                    <p style="margin: 0; color: #92400e; font-family: Arial, sans-serif; font-size: 14px;">
                      <strong>Action Required:</strong> Please approve or reject this visitor request from your dashboard.
                    </p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
        </table>
      </td>
    </tr>
    ${getEmailFooter()}
  `;
  
  return getEmailWrapper(content, 'New Visitor Request');
};

// Pre-Approval Created Email (to visitor)
const getPreApprovalCreatedTemplate = (data) => {
  const { visitorName, companyName, personToMeet, purpose, passNumber, validFrom, validUntil, remarks } = data;
  
  const content = `
    ${getEmailHeader()}
    <tr>
      <td style="padding: 40px;">
        <table border="0" cellpadding="0" cellspacing="0" width="100%">
          <tr>
            <td align="center" style="padding-bottom: 30px;">
              <table border="0" cellpadding="0" cellspacing="0" style="background-color: #e0e7ff; border-radius: 50%; width: 80px; height: 80px;">
                <tr>
                  <td align="center" valign="middle" style="font-size: 40px;">&#127915;</td>
                </tr>
              </table>
            </td>
          </tr>
          <tr>
            <td align="center" style="padding-bottom: 20px;">
              <h2 style="color: #4f46e5; margin: 0; font-family: Arial, sans-serif; font-size: 24px;">You're Pre-Approved!</h2>
            </td>
          </tr>
          <tr>
            <td style="padding-bottom: 20px;">
              <p style="color: #374151; font-family: Arial, sans-serif; font-size: 16px; line-height: 1.6; margin: 0;">
                Dear <strong>${visitorName}</strong>,
              </p>
            </td>
          </tr>
          <tr>
            <td style="padding-bottom: 25px;">
              <p style="color: #374151; font-family: Arial, sans-serif; font-size: 16px; line-height: 1.6; margin: 0;">
                You have been pre-approved for a visit to <strong>${companyName}</strong>. Please find your pre-approval pass details below:
              </p>
            </td>
          </tr>
          <tr>
            <td style="padding-bottom: 25px;">
              <table border="0" cellpadding="0" cellspacing="0" width="100%" style="background-color: #eef2ff; border-radius: 8px;">
                <tr>
                  <td width="40%" style="padding: 12px 15px; border-bottom: 1px solid #c7d2fe;">
                    <strong style="color: #374151; font-family: Arial, sans-serif; font-size: 14px;">Pass Number:</strong>
                  </td>
                  <td style="padding: 12px 15px; border-bottom: 1px solid #c7d2fe; color: #4f46e5; font-family: Arial, sans-serif; font-size: 18px; font-weight: bold;">
                    ${passNumber || 'Will be assigned at check-in'}
                  </td>
                </tr>
                <tr>
                  <td style="padding: 12px 15px; border-bottom: 1px solid #c7d2fe;">
                    <strong style="color: #374151; font-family: Arial, sans-serif; font-size: 14px;">Company:</strong>
                  </td>
                  <td style="padding: 12px 15px; border-bottom: 1px solid #c7d2fe; color: #374151; font-family: Arial, sans-serif; font-size: 14px;">
                    ${companyName}
                  </td>
                </tr>
                <tr>
                  <td style="padding: 12px 15px; border-bottom: 1px solid #c7d2fe;">
                    <strong style="color: #374151; font-family: Arial, sans-serif; font-size: 14px;">Person to Meet:</strong>
                  </td>
                  <td style="padding: 12px 15px; border-bottom: 1px solid #c7d2fe; color: #374151; font-family: Arial, sans-serif; font-size: 14px;">
                    ${personToMeet || 'N/A'}
                  </td>
                </tr>
                <tr>
                  <td style="padding: 12px 15px; border-bottom: 1px solid #c7d2fe;">
                    <strong style="color: #374151; font-family: Arial, sans-serif; font-size: 14px;">Purpose:</strong>
                  </td>
                  <td style="padding: 12px 15px; border-bottom: 1px solid #c7d2fe; color: #374151; font-family: Arial, sans-serif; font-size: 14px;">
                    ${purpose}
                  </td>
                </tr>
                <tr>
                  <td style="padding: 12px 15px;">
                    <strong style="color: #374151; font-family: Arial, sans-serif; font-size: 14px;">Valid Period:</strong>
                  </td>
                  <td style="padding: 12px 15px; color: #374151; font-family: Arial, sans-serif; font-size: 14px;">
                    ${new Date(validFrom).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })} - 
                    ${new Date(validUntil).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          ${remarks ? `
          <tr>
            <td style="padding-bottom: 25px;">
              <table border="0" cellpadding="0" cellspacing="0" width="100%" style="background-color: #f3f4f6; border-radius: 8px;">
                <tr>
                  <td style="padding: 15px;">
                    <p style="margin: 0; color: #374151; font-family: Arial, sans-serif; font-size: 14px;">
                      <strong>Additional Notes:</strong> ${remarks}
                    </p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          ` : ''}
          <tr>
            <td style="padding-bottom: 25px;">
              <table border="0" cellpadding="0" cellspacing="0" width="100%" style="background-color: #d1fae5; border-left: 4px solid #059669; border-radius: 4px;">
                <tr>
                  <td style="padding: 15px;">
                    <p style="margin: 0; color: #065f46; font-family: Arial, sans-serif; font-size: 14px;">
                      <strong>How to use:</strong> Show this email at the reception desk when you arrive. Your entry will be fast-tracked as you're already pre-approved.
                    </p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          <tr>
            <td align="center">
              <p style="color: #6b7280; font-family: Arial, sans-serif; font-size: 14px; margin: 0;">
                We look forward to your visit!
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
    ${getEmailFooter()}
  `;
  
  return getEmailWrapper(content, 'Pre-Approval Pass');
};

// Employee Pass Created Email
const getEmployeePassCreatedTemplate = (data) => {
  const { employeeName, department, designation, passNumber, validFrom, validUntil, companyName } = data;
  
  const content = `
    ${getEmailHeader()}
    <tr>
      <td style="padding: 40px;">
        <table border="0" cellpadding="0" cellspacing="0" width="100%">
          <tr>
            <td align="center" style="padding-bottom: 30px;">
              <table border="0" cellpadding="0" cellspacing="0" style="background-color: #fce7f3; border-radius: 50%; width: 80px; height: 80px;">
                <tr>
                  <td align="center" valign="middle" style="font-size: 40px;">&#129706;</td>
                </tr>
              </table>
            </td>
          </tr>
          <tr>
            <td align="center" style="padding-bottom: 20px;">
              <h2 style="color: #db2777; margin: 0; font-family: Arial, sans-serif; font-size: 24px;">Welcome to ${companyName || 'the Team'}!</h2>
            </td>
          </tr>
          <tr>
            <td style="padding-bottom: 20px;">
              <p style="color: #374151; font-family: Arial, sans-serif; font-size: 16px; line-height: 1.6; margin: 0;">
                Dear <strong>${employeeName}</strong>,
              </p>
            </td>
          </tr>
          <tr>
            <td style="padding-bottom: 25px;">
              <p style="color: #374151; font-family: Arial, sans-serif; font-size: 16px; line-height: 1.6; margin: 0;">
                Your temporary employee pass has been created. Please use this pass for entry until your permanent ID card is issued.
              </p>
            </td>
          </tr>
          <tr>
            <td style="padding-bottom: 25px;">
              <table border="0" cellpadding="0" cellspacing="0" width="100%" style="background-color: #0d9488; border-radius: 12px;">
                <tr>
                  <td style="padding: 25px;">
                    <table border="0" cellpadding="0" cellspacing="0" width="100%">
                      <tr>
                        <td align="center" style="padding-bottom: 15px;">
                          <p style="margin: 0; font-family: Arial, sans-serif; font-size: 12px; text-transform: uppercase; letter-spacing: 1px; color: rgba(255,255,255,0.9);">Temporary Employee Pass</p>
                          <p style="margin: 10px 0 0 0; font-family: Arial, sans-serif; font-size: 28px; font-weight: bold; letter-spacing: 2px; color: #ffffff;">${passNumber}</p>
                        </td>
                      </tr>
                      <tr>
                        <td style="border-top: 1px solid rgba(255,255,255,0.3); padding-top: 15px;">
                          <table border="0" cellpadding="0" cellspacing="0" width="100%">
                            <tr>
                              <td style="padding: 5px 0; font-family: Arial, sans-serif; font-size: 14px; color: rgba(255,255,255,0.9);">Name:</td>
                              <td align="right" style="padding: 5px 0; font-family: Arial, sans-serif; font-size: 14px; font-weight: 600; color: #ffffff;">${employeeName}</td>
                            </tr>
                            <tr>
                              <td style="padding: 5px 0; font-family: Arial, sans-serif; font-size: 14px; color: rgba(255,255,255,0.9);">Department:</td>
                              <td align="right" style="padding: 5px 0; font-family: Arial, sans-serif; font-size: 14px; font-weight: 600; color: #ffffff;">${department}</td>
                            </tr>
                            ${designation ? `
                            <tr>
                              <td style="padding: 5px 0; font-family: Arial, sans-serif; font-size: 14px; color: rgba(255,255,255,0.9);">Designation:</td>
                              <td align="right" style="padding: 5px 0; font-family: Arial, sans-serif; font-size: 14px; font-weight: 600; color: #ffffff;">${designation}</td>
                            </tr>
                            ` : ''}
                            <tr>
                              <td style="padding: 5px 0; font-family: Arial, sans-serif; font-size: 14px; color: rgba(255,255,255,0.9);">Valid Until:</td>
                              <td align="right" style="padding: 5px 0; font-family: Arial, sans-serif; font-size: 14px; font-weight: 600; color: #ffffff;">
                                ${new Date(validUntil).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
                              </td>
                            </tr>
                          </table>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          <tr>
            <td style="padding-bottom: 25px;">
              <table border="0" cellpadding="0" cellspacing="0" width="100%" style="background-color: #fef3c7; border-left: 4px solid #f59e0b; border-radius: 4px;">
                <tr>
                  <td style="padding: 15px;">
                    <p style="margin: 0; color: #92400e; font-family: Arial, sans-serif; font-size: 14px;">
                      <strong>Important:</strong> This is a temporary pass valid until ${new Date(validUntil).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}. Please collect your permanent ID card from HR before expiry.
                    </p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          <tr>
            <td align="center">
              <p style="color: #6b7280; font-family: Arial, sans-serif; font-size: 14px; margin: 0;">
                Welcome aboard! We're excited to have you join us.
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
    ${getEmailFooter()}
  `;
  
  return getEmailWrapper(content, 'Employee Pass');
};

// ================================
// WORK PERMIT EMAIL TEMPLATES
// ================================

// Permit Approved Email
const getPermitApprovedTemplate = (data) => {
  const { permitNumber, title, requestorName, location, workType, startDate, endDate, approverName, approverRole } = data;
  
  const content = `
    ${getEmailHeader()}
    <tr>
      <td style="padding: 40px;">
        <table border="0" cellpadding="0" cellspacing="0" width="100%">
          <tr>
            <td align="center" style="padding-bottom: 30px;">
              <table border="0" cellpadding="0" cellspacing="0" style="background-color: #d1fae5; border-radius: 50%; width: 80px; height: 80px;">
                <tr>
                  <td align="center" valign="middle" style="font-size: 40px;">&#10003;</td>
                </tr>
              </table>
            </td>
          </tr>
          <tr>
            <td align="center" style="padding-bottom: 20px;">
              <h2 style="color: #059669; margin: 0; font-family: Arial, sans-serif; font-size: 24px;">Permit Approved!</h2>
            </td>
          </tr>
          <tr>
            <td style="padding-bottom: 20px;">
              <p style="color: #374151; font-family: Arial, sans-serif; font-size: 16px; line-height: 1.6; margin: 0;">
                Dear <strong>${requestorName}</strong>,
              </p>
            </td>
          </tr>
          <tr>
            <td style="padding-bottom: 25px;">
              <p style="color: #374151; font-family: Arial, sans-serif; font-size: 16px; line-height: 1.6; margin: 0;">
                Great news! Your work permit has been approved. Please find the details below:
              </p>
            </td>
          </tr>
          <tr>
            <td style="padding-bottom: 25px;">
              <table border="0" cellpadding="0" cellspacing="0" width="100%" style="background-color: #f0fdf4; border-radius: 8px;">
                <tr>
                  <td width="40%" style="padding: 12px 15px; border-bottom: 1px solid #dcfce7;">
                    <strong style="color: #374151; font-family: Arial, sans-serif; font-size: 14px;">Permit Number:</strong>
                  </td>
                  <td style="padding: 12px 15px; border-bottom: 1px solid #dcfce7; color: #059669; font-family: Arial, sans-serif; font-size: 18px; font-weight: bold;">
                    ${permitNumber}
                  </td>
                </tr>
                <tr>
                  <td style="padding: 12px 15px; border-bottom: 1px solid #dcfce7;">
                    <strong style="color: #374151; font-family: Arial, sans-serif; font-size: 14px;">Title:</strong>
                  </td>
                  <td style="padding: 12px 15px; border-bottom: 1px solid #dcfce7; color: #374151; font-family: Arial, sans-serif; font-size: 14px;">
                    ${title}
                  </td>
                </tr>
                <tr>
                  <td style="padding: 12px 15px; border-bottom: 1px solid #dcfce7;">
                    <strong style="color: #374151; font-family: Arial, sans-serif; font-size: 14px;">Work Type:</strong>
                  </td>
                  <td style="padding: 12px 15px; border-bottom: 1px solid #dcfce7; color: #374151; font-family: Arial, sans-serif; font-size: 14px;">
                    ${workType}
                  </td>
                </tr>
                <tr>
                  <td style="padding: 12px 15px; border-bottom: 1px solid #dcfce7;">
                    <strong style="color: #374151; font-family: Arial, sans-serif; font-size: 14px;">Location:</strong>
                  </td>
                  <td style="padding: 12px 15px; border-bottom: 1px solid #dcfce7; color: #374151; font-family: Arial, sans-serif; font-size: 14px;">
                    ${location}
                  </td>
                </tr>
                <tr>
                  <td style="padding: 12px 15px; border-bottom: 1px solid #dcfce7;">
                    <strong style="color: #374151; font-family: Arial, sans-serif; font-size: 14px;">Duration:</strong>
                  </td>
                  <td style="padding: 12px 15px; border-bottom: 1px solid #dcfce7; color: #374151; font-family: Arial, sans-serif; font-size: 14px;">
                    ${new Date(startDate).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })} - 
                    ${new Date(endDate).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                  </td>
                </tr>
                <tr>
                  <td style="padding: 12px 15px;">
                    <strong style="color: #374151; font-family: Arial, sans-serif; font-size: 14px;">Approved By:</strong>
                  </td>
                  <td style="padding: 12px 15px; color: #374151; font-family: Arial, sans-serif; font-size: 14px;">
                    ${approverName} (${approverRole})
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          <tr>
            <td style="padding-bottom: 25px;">
              <table border="0" cellpadding="0" cellspacing="0" width="100%" style="background-color: #d1fae5; border-left: 4px solid #059669; border-radius: 4px;">
                <tr>
                  <td style="padding: 15px;">
                    <p style="margin: 0; color: #065f46; font-family: Arial, sans-serif; font-size: 14px;">
                      <strong>You may now proceed with the work.</strong> Please ensure all safety protocols are followed.
                    </p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          <tr>
            <td>
              <table border="0" cellpadding="0" cellspacing="0" width="100%" style="background-color: #fef3c7; border-left: 4px solid #f59e0b; border-radius: 4px;">
                <tr>
                  <td style="padding: 15px;">
                    <p style="margin: 0; color: #92400e; font-family: Arial, sans-serif; font-size: 14px;">
                      <strong>Reminder:</strong> Please close the permit once work is completed.
                    </p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
        </table>
      </td>
    </tr>
    ${getEmailFooter()}
  `;
  
  return getEmailWrapper(content, 'Work Permit Approved');
};

// Permit Rejected Email
const getPermitRejectedTemplate = (data) => {
  const { permitNumber, title, requestorName, location, workType, rejectedBy, rejectionReason, comment } = data;
  
  const content = `
    ${getEmailHeader()}
    <tr>
      <td style="padding: 40px;">
        <table border="0" cellpadding="0" cellspacing="0" width="100%">
          <tr>
            <td align="center" style="padding-bottom: 30px;">
              <table border="0" cellpadding="0" cellspacing="0" style="background-color: #fee2e2; border-radius: 50%; width: 80px; height: 80px;">
                <tr>
                  <td align="center" valign="middle" style="font-size: 40px;">&#10005;</td>
                </tr>
              </table>
            </td>
          </tr>
          <tr>
            <td align="center" style="padding-bottom: 20px;">
              <h2 style="color: #dc2626; margin: 0; font-family: Arial, sans-serif; font-size: 24px;">Permit Not Approved</h2>
            </td>
          </tr>
          <tr>
            <td style="padding-bottom: 20px;">
              <p style="color: #374151; font-family: Arial, sans-serif; font-size: 16px; line-height: 1.6; margin: 0;">
                Dear <strong>${requestorName}</strong>,
              </p>
            </td>
          </tr>
          <tr>
            <td style="padding-bottom: 25px;">
              <p style="color: #374151; font-family: Arial, sans-serif; font-size: 16px; line-height: 1.6; margin: 0;">
                Unfortunately, your work permit request has not been approved. Please review the details and feedback below:
              </p>
            </td>
          </tr>
          <tr>
            <td style="padding-bottom: 25px;">
              <table border="0" cellpadding="0" cellspacing="0" width="100%" style="background-color: #fef2f2; border-radius: 8px;">
                <tr>
                  <td width="40%" style="padding: 12px 15px; border-bottom: 1px solid #fecaca;">
                    <strong style="color: #374151; font-family: Arial, sans-serif; font-size: 14px;">Permit Number:</strong>
                  </td>
                  <td style="padding: 12px 15px; border-bottom: 1px solid #fecaca; color: #dc2626; font-family: Arial, sans-serif; font-size: 18px; font-weight: bold;">
                    ${permitNumber}
                  </td>
                </tr>
                <tr>
                  <td style="padding: 12px 15px; border-bottom: 1px solid #fecaca;">
                    <strong style="color: #374151; font-family: Arial, sans-serif; font-size: 14px;">Title:</strong>
                  </td>
                  <td style="padding: 12px 15px; border-bottom: 1px solid #fecaca; color: #374151; font-family: Arial, sans-serif; font-size: 14px;">
                    ${title}
                  </td>
                </tr>
                <tr>
                  <td style="padding: 12px 15px; border-bottom: 1px solid #fecaca;">
                    <strong style="color: #374151; font-family: Arial, sans-serif; font-size: 14px;">Work Type:</strong>
                  </td>
                  <td style="padding: 12px 15px; border-bottom: 1px solid #fecaca; color: #374151; font-family: Arial, sans-serif; font-size: 14px;">
                    ${workType}
                  </td>
                </tr>
                <tr>
                  <td style="padding: 12px 15px; border-bottom: 1px solid #fecaca;">
                    <strong style="color: #374151; font-family: Arial, sans-serif; font-size: 14px;">Location:</strong>
                  </td>
                  <td style="padding: 12px 15px; border-bottom: 1px solid #fecaca; color: #374151; font-family: Arial, sans-serif; font-size: 14px;">
                    ${location}
                  </td>
                </tr>
                <tr>
                  <td style="padding: 12px 15px;">
                    <strong style="color: #374151; font-family: Arial, sans-serif; font-size: 14px;">Rejected By:</strong>
                  </td>
                  <td style="padding: 12px 15px; color: #374151; font-family: Arial, sans-serif; font-size: 14px;">
                    ${rejectedBy}
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          <tr>
            <td style="padding-bottom: 25px;">
              <table border="0" cellpadding="0" cellspacing="0" width="100%" style="background-color: #fee2e2; border-left: 4px solid #dc2626; border-radius: 4px;">
                <tr>
                  <td style="padding: 15px;">
                    <p style="margin: 0 0 10px 0; color: #991b1b; font-family: Arial, sans-serif; font-size: 14px; font-weight: bold;">
                      Reason for Rejection:
                    </p>
                    <p style="margin: 0; color: #991b1b; font-family: Arial, sans-serif; font-size: 14px;">
                      ${comment || rejectionReason || 'No specific reason provided.'}
                    </p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          <tr>
            <td>
              <table border="0" cellpadding="0" cellspacing="0" width="100%" style="background-color: #dbeafe; border-left: 4px solid #2563eb; border-radius: 4px;">
                <tr>
                  <td style="padding: 15px;">
                    <p style="margin: 0; color: #1e40af; font-family: Arial, sans-serif; font-size: 14px;">
                      <strong>Next Steps:</strong> Please address the concerns mentioned above and submit a new permit request if needed.
                    </p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
        </table>
      </td>
    </tr>
    ${getEmailFooter()}
  `;
  
  return getEmailWrapper(content, 'Work Permit Rejected');
};

// User Credentials Created Email (Work Permit System)
const getUserCredentialsTemplate = (data) => {
  const { userName, email, password, role, loginUrl } = data;
  
  const content = `
    ${getEmailHeader()}
    <tr>
      <td style="padding: 40px;">
        <table border="0" cellpadding="0" cellspacing="0" width="100%">
          <tr>
            <td align="center" style="padding-bottom: 30px;">
              <table border="0" cellpadding="0" cellspacing="0" style="background-color: #dbeafe; border-radius: 50%; width: 80px; height: 80px;">
                <tr>
                  <td align="center" valign="middle" style="font-size: 40px;">&#128274;</td>
                </tr>
              </table>
            </td>
          </tr>
          <tr>
            <td align="center" style="padding-bottom: 20px;">
              <h2 style="color: #1d4ed8; margin: 0; font-family: Arial, sans-serif; font-size: 24px;">Your Account is Ready!</h2>
            </td>
          </tr>
          <tr>
            <td style="padding-bottom: 20px;">
              <p style="color: #374151; font-family: Arial, sans-serif; font-size: 16px; line-height: 1.6; margin: 0;">
                Dear <strong>${userName}</strong>,
              </p>
            </td>
          </tr>
          <tr>
            <td style="padding-bottom: 25px;">
              <p style="color: #374151; font-family: Arial, sans-serif; font-size: 16px; line-height: 1.6; margin: 0;">
                Your account has been created for the Work Permit Management System. Please find your login credentials below:
              </p>
            </td>
          </tr>
          <tr>
            <td style="padding-bottom: 25px;">
              <table border="0" cellpadding="0" cellspacing="0" width="100%" style="background-color: #1e40af; border-radius: 12px;">
                <tr>
                  <td style="padding: 25px;">
                    <table border="0" cellpadding="0" cellspacing="0" width="100%">
                      <tr>
                        <td style="padding: 8px 0; font-family: Arial, sans-serif; font-size: 14px; color: rgba(255,255,255,0.9);">Email:</td>
                        <td align="right" style="padding: 8px 0; font-family: Arial, sans-serif; font-size: 14px; font-weight: 600; color: #ffffff;">${email}</td>
                      </tr>
                      <tr>
                        <td style="padding: 8px 0; font-family: Arial, sans-serif; font-size: 14px; color: rgba(255,255,255,0.9);">Password:</td>
                        <td align="right" style="padding: 8px 0;">
                          <table border="0" cellpadding="0" cellspacing="0">
                            <tr>
                              <td style="background-color: rgba(255,255,255,0.1); padding: 5px 10px; border-radius: 4px;">
                                <span style="font-family: Courier New, monospace; font-size: 16px; font-weight: 600; color: #ffffff;">${password}</span>
                              </td>
                            </tr>
                          </table>
                        </td>
                      </tr>
                      <tr>
                        <td style="padding: 8px 0; font-family: Arial, sans-serif; font-size: 14px; color: rgba(255,255,255,0.9);">Role:</td>
                        <td align="right" style="padding: 8px 0; font-family: Arial, sans-serif; font-size: 14px; font-weight: 600; color: #ffffff;">${role}</td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          <tr>
            <td align="center" style="padding-bottom: 25px;">
              <table border="0" cellpadding="0" cellspacing="0">
                <tr>
                  <td align="center" style="background-color: #0d9488; border-radius: 8px;">
                    <a href="${loginUrl || '#'}" target="_blank" style="display: inline-block; padding: 14px 32px; color: #ffffff; font-family: Arial, sans-serif; font-size: 16px; font-weight: 600; text-decoration: none;">
                      Login Now
                    </a>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          <tr>
            <td style="padding-bottom: 25px;">
              <table border="0" cellpadding="0" cellspacing="0" width="100%" style="background-color: #fee2e2; border-left: 4px solid #dc2626; border-radius: 4px;">
                <tr>
                  <td style="padding: 15px;">
                    <p style="margin: 0; color: #991b1b; font-family: Arial, sans-serif; font-size: 14px;">
                      <strong>Security Notice:</strong> Please change your password after your first login. Do not share your credentials with anyone.
                    </p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          <tr>
            <td align="center">
              <p style="color: #6b7280; font-family: Arial, sans-serif; font-size: 14px; margin: 0;">
                If you did not request this account, please contact the administrator immediately.
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
    ${getEmailFooter()}
  `;
  
  return getEmailWrapper(content, 'Account Created');
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
      from: `"${process.env.EMAIL_FROM_NAME || 'Reliable Group Digital System'}" <${process.env.SMTP_USER}>`,
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
