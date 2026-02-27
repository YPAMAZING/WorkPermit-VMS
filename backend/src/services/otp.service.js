// OTP Service - Generates and verifies OTPs
// Email sending enabled with nodemailer

const nodemailer = require('nodemailer');

const otpStore = new Map(); // In production, use Redis or database

// Create email transporter (lazy initialization)
let transporter = null;

const getTransporter = () => {
  if (!transporter && process.env.SMTP_HOST) {
    const port = parseInt(process.env.SMTP_PORT) || 465;
    transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: port,
      secure: port === 465, // true for 465 (SSL), false for 587 (TLS)
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },
      tls: {
        rejectUnauthorized: false // Allow self-signed certificates
      }
    });
  }
  return transporter;
};

// Check if email is configured
const isEmailConfigured = () => {
  return !!(process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS);
};

// Generate 6-digit OTP
const generateOTP = () => {
  return Math.floor(100000 + Math.random() * 900000).toString();
};

// Store OTP with expiry (5 minutes)
const storeOTP = (identifier, otp) => {
  const expiry = Date.now() + 5 * 60 * 1000; // 5 minutes
  otpStore.set(identifier, { otp, expiry });
  
  // Clean up expired OTPs
  setTimeout(() => {
    otpStore.delete(identifier);
  }, 5 * 60 * 1000);
};

// Verify OTP
const verifyOTP = (identifier, otp) => {
  const stored = otpStore.get(identifier);
  
  if (!stored) {
    return { valid: false, message: 'OTP expired or not found' };
  }
  
  if (Date.now() > stored.expiry) {
    otpStore.delete(identifier);
    return { valid: false, message: 'OTP expired' };
  }
  
  if (stored.otp !== otp) {
    return { valid: false, message: 'Invalid OTP' };
  }
  
  // OTP is valid, remove it
  otpStore.delete(identifier);
  return { valid: true };
};

// Outlook-compatible email template helper
const getEmailTemplate = (content) => {
  return `
    <!DOCTYPE html PUBLIC "-//W3C//DTD XHTML 1.0 Transitional//EN" "http://www.w3.org/TR/xhtml1/DTD/xhtml1-transitional.dtd">
    <html xmlns="http://www.w3.org/1999/xhtml">
    <head>
      <meta http-equiv="Content-Type" content="text/html; charset=UTF-8" />
      <meta name="viewport" content="width=device-width, initial-scale=1.0"/>
      <title>Reliable Group Digital System</title>
      <!--[if mso]>
      <style type="text/css">
        body, table, td {font-family: Arial, sans-serif !important;}
        table {border-collapse: collapse;}
      </style>
      <![endif]-->
    </head>
    <body style="margin: 0; padding: 0; background-color: #f3f4f6;">
      <table border="0" cellpadding="0" cellspacing="0" width="100%" style="background-color: #f3f4f6;">
        <tr>
          <td align="center" style="padding: 20px 0;">
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

// Email header with logo and badges
const getEmailHeader = () => {
  return `
    <tr>
      <td align="center" style="padding: 30px 20px 20px 20px;">
        <table border="0" cellpadding="0" cellspacing="0">
          <tr>
            <td align="center">
              <img src="https://reliablespaces.cloud/logo.png" alt="Reliable Group" width="120" style="display: block; max-width: 120px; height: auto; margin-bottom: 15px;" />
            </td>
          </tr>
          <tr>
            <td align="center">
              <h1 style="color: #1e3a6e; margin: 0; font-family: Arial, sans-serif; font-size: 24px;">Reliable Group Digital System</h1>
            </td>
          </tr>
          <tr>
            <td align="center" style="padding-top: 15px;">
              <table border="0" cellpadding="0" cellspacing="0">
                <tr>
                  <td style="padding: 0 5px;">
                    <table border="0" cellpadding="0" cellspacing="0" style="background-color: #1e3a6e; border-radius: 15px;">
                      <tr>
                        <td style="padding: 6px 12px; color: #ffffff; font-family: Arial, sans-serif; font-size: 11px;">&#128295; Work Permit</td>
                      </tr>
                    </table>
                  </td>
                  <td style="padding: 0 5px;">
                    <table border="0" cellpadding="0" cellspacing="0" style="background-color: #059669; border-radius: 15px;">
                      <tr>
                        <td style="padding: 6px 12px; color: #ffffff; font-family: Arial, sans-serif; font-size: 11px;">&#128101; Visitor Management</td>
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
      <td style="padding: 0 30px;">
        <table border="0" cellpadding="0" cellspacing="0" width="100%">
          <tr>
            <td style="border-top: 1px solid #e5e7eb; padding-top: 20px;"></td>
          </tr>
        </table>
      </td>
    </tr>
    <tr>
      <td align="center" style="padding: 20px 30px 30px 30px;">
        <p style="color: #9ca3af; font-size: 12px; font-family: Arial, sans-serif; margin: 0;">
          &copy; ${new Date().getFullYear()} YP SECURITY SERVICES PVT LTD. All rights reserved.<br />
          This is an automated message. Please do not reply to this email.
        </p>
      </td>
    </tr>
  `;
};

// Send OTP via Email
const sendEmailOTP = async (email, otp) => {
  // Always log to console for debugging
  console.log(`📧 OTP for ${email}: ${otp}`);
  
  // If SMTP is configured, send real email
  if (isEmailConfigured()) {
    try {
      const transport = getTransporter();
      
      const content = `
        ${getEmailHeader()}
        <tr>
          <td style="padding: 0 30px;">
            <p style="color: #4b5563; font-family: Arial, sans-serif; font-size: 16px; margin: 0;">Your One-Time Password (OTP) is:</p>
          </td>
        </tr>
        <tr>
          <td style="padding: 20px 30px;">
            <table border="0" cellpadding="0" cellspacing="0" width="100%" style="background-color: #1e3a6e; border-radius: 8px;">
              <tr>
                <td align="center" style="padding: 25px;">
                  <span style="color: #ffffff; font-size: 36px; font-family: Arial, sans-serif; letter-spacing: 8px; font-weight: bold;">${otp}</span>
                </td>
              </tr>
            </table>
          </td>
        </tr>
        <tr>
          <td style="padding: 0 30px 20px 30px;">
            <p style="color: #4b5563; font-family: Arial, sans-serif; font-size: 14px; margin: 0 0 10px 0;">This OTP is valid for <strong>5 minutes</strong>.</p>
            <p style="color: #4b5563; font-family: Arial, sans-serif; font-size: 14px; margin: 0;">If you didn't request this OTP, please ignore this email.</p>
          </td>
        </tr>
        ${getEmailFooter()}
      `;
      
      await transport.sendMail({
        from: `"${process.env.FROM_NAME || 'Reliable Group Digital System'}" <${process.env.FROM_EMAIL || process.env.SMTP_USER}>`,
        to: email,
        subject: 'Your OTP - Reliable Group Digital System',
        html: getEmailTemplate(content),
      });
      console.log(`✅ OTP email sent successfully to ${email}`);
      return true;
    } catch (error) {
      console.error(`❌ Failed to send OTP email to ${email}:`, error.message);
      // Return true anyway so the flow continues (OTP is logged to console)
      return true;
    }
  } else {
    console.log(`⚠️  SMTP not configured - OTP logged to console only`);
    return true;
  }
};

// Send Welcome Email on Account Creation with Login Credentials
const sendWelcomeEmail = async (userData) => {
  const { email, firstName, lastName, role, requiresApproval, password } = userData;
  const currentDate = new Date().toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });

  // Always log to console
  console.log(`\n${'='.repeat(70)}`);
  console.log(`📧 WELCOME EMAIL - Account Created Successfully`);
  console.log(`${'='.repeat(70)}`);
  console.log(`   Dear ${firstName} ${lastName},`);
  console.log(`   `);
  console.log(`   Your account has been created on Reliable Group Digital System - Work Permit System.`);
  console.log(`   `);
  console.log(`   📋 Account Details:`);
  console.log(`   ─────────────────────────────────────────`);
  console.log(`   Name:        ${firstName} ${lastName}`);
  console.log(`   Email:       ${email}`);
  console.log(`   Role:        ${role}`);
  console.log(`   Created On:  ${currentDate}`);
  console.log(`   Status:      ${requiresApproval ? '⏳ Pending Admin Approval' : '✅ Active - Ready to Login'}`);
  console.log(`   `);
  console.log(`   🔐 Your Login Credentials:`);
  console.log(`   ─────────────────────────────────────────`);
  console.log(`   Login Email:    ${email}`);
  console.log(`   Login Password: ${password || '[Not Available]'}`);
  console.log(`   `);
  console.log(`   🌐 Login URL: ${process.env.FRONTEND_URL || 'https://reliablespaces.cloud'}`);
  console.log(`   `);
  if (requiresApproval) {
    console.log(`   ⚠️  Note: Your account requires admin approval before you can login.`);
    console.log(`   You will be notified once your account is approved.`);
  } else {
    console.log(`   ⚠️  For security, please change your password after first login.`);
  }
  console.log(`${'='.repeat(70)}\n`);

  // If SMTP is configured, send real email
  if (isEmailConfigured()) {
    try {
      const transport = getTransporter();
      
      const subject = requiresApproval 
        ? 'Account Registration Pending Approval - Reliable Group Digital System'
        : 'Welcome to Reliable Group Digital System - Your Account is Ready!';
      
      // Approval status box - Outlook compatible
      const approvalBox = requiresApproval 
        ? `
          <tr>
            <td style="padding: 0 30px 20px 30px;">
              <table border="0" cellpadding="0" cellspacing="0" width="100%" style="background-color: #fef3c7; border: 1px solid #f59e0b; border-radius: 8px;">
                <tr>
                  <td style="padding: 16px;">
                    <p style="color: #92400e; font-family: Arial, sans-serif; font-size: 14px; font-weight: bold; margin: 0;">&#9203; Pending Approval</p>
                    <p style="color: #92400e; font-family: Arial, sans-serif; font-size: 14px; margin: 8px 0 0 0;">Your account requires administrator approval. You will be notified once approved.</p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
        `
        : `
          <tr>
            <td style="padding: 0 30px 20px 30px;">
              <table border="0" cellpadding="0" cellspacing="0" width="100%" style="background-color: #d1fae5; border: 1px solid #10b981; border-radius: 8px;">
                <tr>
                  <td style="padding: 16px;">
                    <p style="color: #065f46; font-family: Arial, sans-serif; font-size: 14px; font-weight: bold; margin: 0;">&#9989; Account Active</p>
                    <p style="color: #065f46; font-family: Arial, sans-serif; font-size: 14px; margin: 8px 0 0 0;">Your account is active and ready to use. You can login now!</p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
        `;
      
      const content = `
        ${getEmailHeader()}
        <tr>
          <td style="padding: 0 30px 10px 30px;">
            <h2 style="color: #1f2937; font-family: Arial, sans-serif; font-size: 20px; margin: 0;">Hello ${firstName} ${lastName},</h2>
          </td>
        </tr>
        <tr>
          <td style="padding: 0 30px 20px 30px;">
            <p style="color: #4b5563; font-family: Arial, sans-serif; font-size: 14px; line-height: 1.6; margin: 0;">
              Your account has been successfully created on the <strong>Reliable Group Digital System</strong>.
            </p>
          </td>
        </tr>
        <tr>
          <td style="padding: 0 30px 20px 30px;">
            <table border="0" cellpadding="0" cellspacing="0" width="100%" style="background-color: #f0f9ff; border-left: 4px solid #1e3a6e; border-radius: 4px;">
              <tr>
                <td style="padding: 16px;">
                  <p style="color: #1e3a6e; font-family: Arial, sans-serif; font-size: 14px; font-weight: bold; margin: 0 0 10px 0;">&#127919; Your account provides access to:</p>
                  <table border="0" cellpadding="0" cellspacing="0">
                    <tr>
                      <td style="padding: 5px 0; color: #4b5563; font-family: Arial, sans-serif; font-size: 14px;">&#8226; <strong>Work Permit Management System</strong> - Create and manage work permits, safety approvals, and worker registrations</td>
                    </tr>
                    <tr>
                      <td style="padding: 5px 0; color: #4b5563; font-family: Arial, sans-serif; font-size: 14px;">&#8226; <strong>Visitor Management System</strong> - Handle visitor check-ins, gate passes, and pre-approvals</td>
                    </tr>
                  </table>
                </td>
              </tr>
            </table>
          </td>
        </tr>
        ${approvalBox}
        <tr>
          <td style="padding: 0 30px 20px 30px;">
            <table border="0" cellpadding="0" cellspacing="0" width="100%" style="background-color: #1e3a6e; border-radius: 8px;">
              <tr>
                <td style="padding: 20px;">
                  <h3 style="color: #ffffff; font-family: Arial, sans-serif; font-size: 16px; margin: 0 0 15px 0;">&#128274; Your Login Credentials:</h3>
                  <table border="0" cellpadding="0" cellspacing="0" width="100%">
                    <tr>
                      <td width="100" style="padding: 8px 0; color: #93c5fd; font-family: Arial, sans-serif; font-size: 14px; vertical-align: top;">Email:</td>
                      <td style="padding: 8px 0; color: #ffffff; font-family: Courier New, monospace; font-size: 14px; font-weight: bold;">${email}</td>
                    </tr>
                    <tr>
                      <td width="100" style="padding: 8px 0; color: #93c5fd; font-family: Arial, sans-serif; font-size: 14px; vertical-align: top;">Password:</td>
                      <td style="padding: 8px 0; color: #ffffff; font-family: Courier New, monospace; font-size: 14px; font-weight: bold;">${password || '********'}</td>
                    </tr>
                  </table>
                  <table border="0" cellpadding="0" cellspacing="0" width="100%" style="margin-top: 15px;">
                    <tr>
                      <td style="padding: 8px 12px; background-color: #fbbf24; border-radius: 4px;">
                        <p style="color: #78350f; font-family: Arial, sans-serif; font-size: 12px; margin: 0;">&#9888;&#65039; Please change your password after first login for security.</p>
                      </td>
                    </tr>
                  </table>
                </td>
              </tr>
            </table>
          </td>
        </tr>
        <tr>
          <td align="center" style="padding: 0 30px 20px 30px;">
            <table border="0" cellpadding="0" cellspacing="0">
              <tr>
                <td align="center" style="background-color: #1e3a6e; border-radius: 6px;">
                  <a href="${process.env.FRONTEND_URL || 'https://reliablespaces.cloud'}" target="_blank" style="display: inline-block; padding: 14px 35px; color: #ffffff; font-family: Arial, sans-serif; font-size: 16px; font-weight: bold; text-decoration: none;">Login Now</a>
                </td>
              </tr>
            </table>
          </td>
        </tr>
        <tr>
          <td style="padding: 0 30px 20px 30px;">
            <table border="0" cellpadding="0" cellspacing="0" width="100%" style="background-color: #f3f4f6; border-radius: 8px;">
              <tr>
                <td style="padding: 20px;">
                  <h3 style="color: #1f2937; font-family: Arial, sans-serif; font-size: 16px; margin: 0 0 15px 0;">&#128203; Account Details:</h3>
                  <table border="0" cellpadding="0" cellspacing="0" width="100%">
                    <tr>
                      <td width="120" style="padding: 8px 0; color: #6b7280; font-family: Arial, sans-serif; font-size: 14px; vertical-align: top;">Name:</td>
                      <td style="padding: 8px 0; color: #1f2937; font-family: Arial, sans-serif; font-size: 14px; font-weight: 500;">${firstName} ${lastName}</td>
                    </tr>
                    <tr>
                      <td width="120" style="padding: 8px 0; color: #6b7280; font-family: Arial, sans-serif; font-size: 14px; vertical-align: top;">Role:</td>
                      <td style="padding: 8px 0; color: #1f2937; font-family: Arial, sans-serif; font-size: 14px; font-weight: 500;">${role}</td>
                    </tr>
                    <tr>
                      <td width="120" style="padding: 8px 0; color: #6b7280; font-family: Arial, sans-serif; font-size: 14px; vertical-align: top;">Created On:</td>
                      <td style="padding: 8px 0; color: #1f2937; font-family: Arial, sans-serif; font-size: 14px; font-weight: 500;">${currentDate}</td>
                    </tr>
                  </table>
                </td>
              </tr>
            </table>
          </td>
        </tr>
        <tr>
          <td style="padding: 0 30px 20px 30px;">
            <p style="color: #4b5563; font-family: Arial, sans-serif; font-size: 14px; line-height: 1.6; margin: 0;">
              If you did not create this account, please contact our support team immediately.
            </p>
          </td>
        </tr>
        ${getEmailFooter()}
      `;

      await transport.sendMail({
        from: `"${process.env.FROM_NAME || 'Reliable Group Digital System'}" <${process.env.FROM_EMAIL || process.env.SMTP_USER}>`,
        to: email,
        subject: subject,
        html: getEmailTemplate(content),
      });
      console.log(`✅ Welcome email sent successfully to ${email}`);
      return true;
    } catch (error) {
      console.error(`❌ Failed to send welcome email to ${email}:`, error.message);
      // Return true anyway so registration continues
      return true;
    }
  } else {
    console.log(`⚠️  SMTP not configured - Welcome email logged to console only`);
    return true;
  }
};

// Send OTP via SMS (mock - replace with actual SMS service)
const sendSMSOTP = async (phone, otp) => {
  // In production, use Twilio, MSG91, etc.
  console.log(`📱 OTP sent to phone ${phone}: ${otp}`);
  
  // Mock implementation - always succeeds
  // Replace with actual SMS sending logic when needed
  /*
  const twilio = require('twilio');
  const client = twilio(process.env.TWILIO_SID, process.env.TWILIO_AUTH_TOKEN);
  
  await client.messages.create({
    body: `Your OTP for Reliable Group Digital System is: ${otp}. Valid for 5 minutes.`,
    from: process.env.TWILIO_PHONE,
    to: phone,
  });
  */
  
  return true;
};

// Send OTP to both email and phone (same OTP)
const sendOTP = async (email, phone) => {
  const otp = generateOTP();
  
  // Store OTP for both identifiers (same OTP)
  const sessionKey = `${email}_${phone}`;
  storeOTP(sessionKey, otp);
  storeOTP(email, otp);
  storeOTP(phone, otp);
  
  // Send to both channels
  const results = {
    email: false,
    phone: false,
    // OTP is NEVER sent in response for security - only via email/SMS
  };
  
  try {
    if (email) {
      await sendEmailOTP(email, otp);
      results.email = true;
    }
  } catch (error) {
    console.error('Email OTP failed:', error);
  }
  
  try {
    if (phone) {
      await sendSMSOTP(phone, otp);
      results.phone = true;
    }
  } catch (error) {
    console.error('SMS OTP failed:', error);
  }
  
  return results;
};

// Verify OTP with either email or phone
const verifyRegistrationOTP = (email, phone, otp) => {
  // Try session key first
  const sessionKey = `${email}_${phone}`;
  let result = verifyOTP(sessionKey, otp);
  
  if (result.valid) {
    // Clean up other keys
    otpStore.delete(email);
    otpStore.delete(phone);
    return result;
  }
  
  // Try email
  result = verifyOTP(email, otp);
  if (result.valid) {
    otpStore.delete(phone);
    otpStore.delete(sessionKey);
    return result;
  }
  
  // Try phone
  result = verifyOTP(phone, otp);
  if (result.valid) {
    otpStore.delete(email);
    otpStore.delete(sessionKey);
    return result;
  }
  
  return { valid: false, message: 'Invalid or expired OTP' };
};

// Send OTP for password change to both email and phone (if available)
const sendPasswordChangeOTP = async (email, phone) => {
  const otp = generateOTP();
  
  // Store OTP with password change prefix
  const passwordChangeKey = `pwd_${email}`;
  storeOTP(passwordChangeKey, otp);
  
  // Also store with phone if available
  if (phone) {
    storeOTP(`pwd_${phone}`, otp);
  }
  
  const results = {
    email: false,
    phone: false,
    // OTP is NEVER sent in response for security - only via email/SMS
  };
  
  try {
    if (email) {
      await sendEmailOTP(email, otp);
      results.email = true;
    }
  } catch (error) {
    console.error('Email OTP failed:', error);
  }
  
  try {
    if (phone) {
      await sendSMSOTP(phone, otp);
      results.phone = true;
    }
  } catch (error) {
    console.error('SMS OTP failed:', error);
  }
  
  return results;
};

// Verify OTP for password change
const verifyPasswordChangeOTP = (email, phone, otp) => {
  // Try email key first
  const emailKey = `pwd_${email}`;
  let result = verifyOTP(emailKey, otp);
  
  if (result.valid) {
    // Clean up phone key if exists
    if (phone) {
      otpStore.delete(`pwd_${phone}`);
    }
    return result;
  }
  
  // Try phone key
  if (phone) {
    const phoneKey = `pwd_${phone}`;
    result = verifyOTP(phoneKey, otp);
    if (result.valid) {
      otpStore.delete(emailKey);
      return result;
    }
  }
  
  return { valid: false, message: 'Invalid or expired OTP' };
};

// Notify Admins when someone requests an account
const notifyAdminsNewRegistration = async (userData, adminEmails) => {
  if (!isEmailConfigured() || !adminEmails || adminEmails.length === 0) {
    console.log('⚠️  SMTP not configured or no admin emails - skipping admin notification');
    return false;
  }

  const { firstName, lastName, email, phone, requestedRole, department } = userData;
  const currentDate = new Date().toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });

  console.log(`📧 Sending new registration notification to admins: ${adminEmails.join(', ')}`);

  try {
    const transport = getTransporter();
    
    const content = `
      ${getEmailHeader()}
      <tr>
        <td style="padding: 0 30px 20px 30px;">
          <table border="0" cellpadding="0" cellspacing="0" width="100%" style="background-color: #fef3c7; border: 1px solid #f59e0b; border-radius: 8px;">
            <tr>
              <td style="padding: 20px;">
                <h2 style="color: #92400e; font-family: Arial, sans-serif; font-size: 18px; margin: 0 0 10px 0;">&#128276; New Account Registration Request</h2>
                <p style="color: #92400e; font-family: Arial, sans-serif; font-size: 14px; margin: 0;">A new user has requested to create an account and is waiting for your approval.</p>
              </td>
            </tr>
          </table>
        </td>
      </tr>
      <tr>
        <td style="padding: 0 30px 20px 30px;">
          <table border="0" cellpadding="0" cellspacing="0" width="100%" style="background-color: #f3f4f6; border-radius: 8px;">
            <tr>
              <td style="padding: 20px;">
                <h3 style="color: #1f2937; font-family: Arial, sans-serif; font-size: 16px; margin: 0 0 15px 0;">&#128100; User Details:</h3>
                <table border="0" cellpadding="0" cellspacing="0" width="100%">
                  <tr>
                    <td width="140" style="padding: 8px 0; color: #6b7280; font-family: Arial, sans-serif; font-size: 14px; vertical-align: top;">Name:</td>
                    <td style="padding: 8px 0; color: #1f2937; font-family: Arial, sans-serif; font-size: 14px; font-weight: bold;">${firstName} ${lastName}</td>
                  </tr>
                  <tr>
                    <td width="140" style="padding: 8px 0; color: #6b7280; font-family: Arial, sans-serif; font-size: 14px; vertical-align: top;">Email:</td>
                    <td style="padding: 8px 0; color: #1f2937; font-family: Arial, sans-serif; font-size: 14px;">${email}</td>
                  </tr>
                  <tr>
                    <td width="140" style="padding: 8px 0; color: #6b7280; font-family: Arial, sans-serif; font-size: 14px; vertical-align: top;">Phone:</td>
                    <td style="padding: 8px 0; color: #1f2937; font-family: Arial, sans-serif; font-size: 14px;">${phone || 'Not provided'}</td>
                  </tr>
                  <tr>
                    <td width="140" style="padding: 8px 0; color: #6b7280; font-family: Arial, sans-serif; font-size: 14px; vertical-align: top;">Department:</td>
                    <td style="padding: 8px 0; color: #1f2937; font-family: Arial, sans-serif; font-size: 14px;">${department || 'Not specified'}</td>
                  </tr>
                  <tr>
                    <td width="140" style="padding: 8px 0; color: #6b7280; font-family: Arial, sans-serif; font-size: 14px; vertical-align: top;">Requested Role:</td>
                    <td style="padding: 8px 0; color: #1f2937; font-family: Arial, sans-serif; font-size: 14px; font-weight: bold;">${requestedRole}</td>
                  </tr>
                  <tr>
                    <td width="140" style="padding: 8px 0; color: #6b7280; font-family: Arial, sans-serif; font-size: 14px; vertical-align: top;">Requested On:</td>
                    <td style="padding: 8px 0; color: #1f2937; font-family: Arial, sans-serif; font-size: 14px;">${currentDate}</td>
                  </tr>
                </table>
              </td>
            </tr>
          </table>
        </td>
      </tr>
      <tr>
        <td align="center" style="padding: 0 30px 20px 30px;">
          <table border="0" cellpadding="0" cellspacing="0">
            <tr>
              <td align="center" style="background-color: #1e3a6e; border-radius: 6px;">
                <a href="${process.env.FRONTEND_URL || 'https://reliablespaces.cloud'}/users?tab=pending" target="_blank" style="display: inline-block; padding: 14px 35px; color: #ffffff; font-family: Arial, sans-serif; font-size: 16px; font-weight: bold; text-decoration: none;">Review &amp; Approve</a>
              </td>
            </tr>
          </table>
        </td>
      </tr>
      <tr>
        <td style="padding: 0 30px 20px 30px;">
          <p style="color: #6b7280; font-family: Arial, sans-serif; font-size: 14px; text-align: center; margin: 0;">
            Please login to the admin panel to approve or reject this registration request.
          </p>
        </td>
      </tr>
      ${getEmailFooter()}
    `;
    
    await transport.sendMail({
      from: `"${process.env.FROM_NAME || 'Reliable Group Digital System'}" <${process.env.FROM_EMAIL || process.env.SMTP_USER}>`,
      to: adminEmails.join(', '),
      subject: '🔔 New Account Registration Request - Action Required',
      html: getEmailTemplate(content),
    });
    console.log(`✅ Admin notification sent successfully`);
    return true;
  } catch (error) {
    console.error(`❌ Failed to send admin notification:`, error.message);
    return false;
  }
};

// Notify Firemen when a new permit is created
const notifyFiremenNewPermit = async (permitData, firemanEmails) => {
  if (!isEmailConfigured() || !firemanEmails || firemanEmails.length === 0) {
    console.log('⚠️  SMTP not configured or no fireman emails - skipping fireman notification');
    return false;
  }

  const { title, workType, location, startDate, endDate, priority, createdBy } = permitData;
  const currentDate = new Date().toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });

  const workTypeLabels = {
    'HOT_WORK': 'Hot Work Permit',
    'CONFINED_SPACE': 'Confined Space Permit',
    'ELECTRICAL': 'Electrical Work Permit',
    'WORKING_AT_HEIGHT': 'Work at Height Permit',
    'EXCAVATION': 'Excavation Permit',
    'LIFTING': 'Lifting Permit',
    'CHEMICAL': 'Chemical Handling Permit',
    'RADIATION': 'Radiation Work Permit',
    'GENERAL': 'General Permit',
    'COLD_WORK': 'Cold Work Permit',
    'LOTO': 'LOTO Permit',
    'VEHICLE': 'Vehicle Work Permit',
    'PRESSURE_TESTING': 'Hydro Pressure Testing',
    'ENERGIZE': 'Energize Permit',
    'SWMS': 'Safe Work Method Statement',
  };

  const priorityColors = {
    'LOW': '#10b981',
    'MEDIUM': '#3b82f6',
    'HIGH': '#f59e0b',
    'CRITICAL': '#ef4444',
  };

  console.log(`📧 Sending new permit notification to firemen: ${firemanEmails.join(', ')}`);

  try {
    const transport = getTransporter();
    
    const content = `
      ${getEmailHeader()}
      <tr>
        <td style="padding: 0 30px 20px 30px;">
          <table border="0" cellpadding="0" cellspacing="0" width="100%" style="background-color: #fef3c7; border: 1px solid #f59e0b; border-radius: 8px;">
            <tr>
              <td style="padding: 20px;">
                <h2 style="color: #92400e; font-family: Arial, sans-serif; font-size: 18px; margin: 0 0 10px 0;">&#128293; New Permit Request</h2>
                <p style="color: #92400e; font-family: Arial, sans-serif; font-size: 14px; margin: 0;">A new work permit has been submitted and requires your approval.</p>
              </td>
            </tr>
          </table>
        </td>
      </tr>
      <tr>
        <td style="padding: 0 30px 20px 30px;">
          <table border="0" cellpadding="0" cellspacing="0" width="100%" style="background-color: #1e3a6e; border-radius: 8px;">
            <tr>
              <td style="padding: 20px;">
                <h3 style="color: #ffffff; font-family: Arial, sans-serif; font-size: 16px; margin: 0 0 15px 0;">&#128203; Permit Details:</h3>
                <table border="0" cellpadding="0" cellspacing="0" width="100%">
                  <tr>
                    <td width="120" style="padding: 8px 0; color: #93c5fd; font-family: Arial, sans-serif; font-size: 14px; vertical-align: top;">Title:</td>
                    <td style="padding: 8px 0; color: #ffffff; font-family: Arial, sans-serif; font-size: 14px; font-weight: bold;">${title}</td>
                  </tr>
                  <tr>
                    <td width="120" style="padding: 8px 0; color: #93c5fd; font-family: Arial, sans-serif; font-size: 14px; vertical-align: top;">Type:</td>
                    <td style="padding: 8px 0; color: #ffffff; font-family: Arial, sans-serif; font-size: 14px;">${workTypeLabels[workType] || workType}</td>
                  </tr>
                  <tr>
                    <td width="120" style="padding: 8px 0; color: #93c5fd; font-family: Arial, sans-serif; font-size: 14px; vertical-align: top;">Location:</td>
                    <td style="padding: 8px 0; color: #ffffff; font-family: Arial, sans-serif; font-size: 14px;">${location}</td>
                  </tr>
                  <tr>
                    <td width="120" style="padding: 8px 0; color: #93c5fd; font-family: Arial, sans-serif; font-size: 14px; vertical-align: top;">Start Date:</td>
                    <td style="padding: 8px 0; color: #ffffff; font-family: Arial, sans-serif; font-size: 14px;">${new Date(startDate).toLocaleString('en-IN')}</td>
                  </tr>
                  <tr>
                    <td width="120" style="padding: 8px 0; color: #93c5fd; font-family: Arial, sans-serif; font-size: 14px; vertical-align: top;">End Date:</td>
                    <td style="padding: 8px 0; color: #ffffff; font-family: Arial, sans-serif; font-size: 14px;">${new Date(endDate).toLocaleString('en-IN')}</td>
                  </tr>
                  <tr>
                    <td width="120" style="padding: 8px 0; color: #93c5fd; font-family: Arial, sans-serif; font-size: 14px; vertical-align: top;">Priority:</td>
                    <td style="padding: 8px 0;">
                      <table border="0" cellpadding="0" cellspacing="0">
                        <tr>
                          <td style="background-color: ${priorityColors[priority] || '#3b82f6'}; padding: 4px 12px; border-radius: 4px;">
                            <span style="color: #ffffff; font-family: Arial, sans-serif; font-size: 12px; font-weight: bold;">${priority}</span>
                          </td>
                        </tr>
                      </table>
                    </td>
                  </tr>
                  <tr>
                    <td width="120" style="padding: 8px 0; color: #93c5fd; font-family: Arial, sans-serif; font-size: 14px; vertical-align: top;">Requested By:</td>
                    <td style="padding: 8px 0; color: #ffffff; font-family: Arial, sans-serif; font-size: 14px;">${createdBy?.firstName || ''} ${createdBy?.lastName || ''} (${createdBy?.email || 'N/A'})</td>
                  </tr>
                </table>
              </td>
            </tr>
          </table>
        </td>
      </tr>
      <tr>
        <td align="center" style="padding: 0 30px 20px 30px;">
          <table border="0" cellpadding="0" cellspacing="0">
            <tr>
              <td align="center" style="background-color: #f59e0b; border-radius: 6px;">
                <a href="${process.env.FRONTEND_URL || 'https://reliablespaces.cloud'}/approvals" target="_blank" style="display: inline-block; padding: 14px 35px; color: #ffffff; font-family: Arial, sans-serif; font-size: 16px; font-weight: bold; text-decoration: none;">Review &amp; Approve Permit</a>
              </td>
            </tr>
          </table>
        </td>
      </tr>
      <tr>
        <td style="padding: 0 30px 20px 30px;">
          <p style="color: #6b7280; font-family: Arial, sans-serif; font-size: 14px; text-align: center; margin: 0;">
            Please login to review the permit details and take appropriate action.
          </p>
        </td>
      </tr>
      ${getEmailFooter()}
    `;
    
    await transport.sendMail({
      from: `"${process.env.FROM_NAME || 'Reliable Group Digital System'}" <${process.env.FROM_EMAIL || process.env.SMTP_USER}>`,
      to: firemanEmails.join(', '),
      subject: `🔥 New Permit Request - ${workTypeLabels[workType] || workType} - Approval Required`,
      html: getEmailTemplate(content),
    });
    console.log(`✅ Fireman notification sent successfully`);
    return true;
  } catch (error) {
    console.error(`❌ Failed to send fireman notification:`, error.message);
    return false;
  }
};

module.exports = {
  generateOTP,
  sendOTP,
  verifyOTP,
  verifyRegistrationOTP,
  sendPasswordChangeOTP,
  verifyPasswordChangeOTP,
  sendWelcomeEmail,
  notifyAdminsNewRegistration,
  notifyFiremenNewPermit,
};
