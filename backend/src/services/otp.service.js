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

// Send OTP via Email
const sendEmailOTP = async (email, otp) => {
  // Always log to console for debugging
  console.log(`📧 OTP for ${email}: ${otp}`);
  
  // If SMTP is configured, send real email
  if (isEmailConfigured()) {
    try {
      const transport = getTransporter();
      await transport.sendMail({
        from: `"${process.env.FROM_NAME || 'Reliable Group MEP'}" <${process.env.FROM_EMAIL || process.env.SMTP_USER}>`,
        to: email,
        subject: 'Your OTP - Reliable Group MEP',
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
            <div style="text-align: center; margin-bottom: 30px;">
              <h1 style="color: #1e3a6e; margin: 0;">Reliable Group MEP</h1>
              <p style="color: #6b7280; margin: 5px 0;">Work Permit Management System</p>
            </div>
            
            <p style="color: #4b5563;">Your One-Time Password (OTP) is:</p>
            
            <div style="background-color: #1e3a6e; border-radius: 8px; padding: 20px; text-align: center; margin: 20px 0;">
              <h1 style="color: #ffffff; font-size: 36px; letter-spacing: 8px; margin: 0;">${otp}</h1>
            </div>
            
            <p style="color: #4b5563;">This OTP is valid for <strong>5 minutes</strong>.</p>
            <p style="color: #4b5563;">If you didn't request this OTP, please ignore this email.</p>
            
            <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 30px 0;" />
            
            <p style="color: #9ca3af; font-size: 12px; text-align: center;">
              © ${new Date().getFullYear()} YP Security Services Pvt Ltd. All rights reserved.
            </p>
          </div>
        `,
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
  console.log(`   Your account has been created on Reliable Group MEP - Work Permit System.`);
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
  console.log(`   🌐 Login URL: http://mepreliable.cloud`);
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
        ? 'Account Registration Pending Approval - Reliable Group MEP'
        : 'Welcome to Reliable Group MEP - Your Account is Ready!';
      
      const approvalMessage = requiresApproval 
        ? `<div style="background-color: #fef3c7; border: 1px solid #f59e0b; border-radius: 8px; padding: 16px; margin: 20px 0;">
            <p style="color: #92400e; margin: 0;"><strong>⏳ Pending Approval</strong></p>
            <p style="color: #92400e; margin: 8px 0 0 0;">Your account requires administrator approval. You will be notified once approved.</p>
           </div>`
        : `<div style="background-color: #d1fae5; border: 1px solid #10b981; border-radius: 8px; padding: 16px; margin: 20px 0;">
            <p style="color: #065f46; margin: 0;"><strong>✅ Account Active</strong></p>
            <p style="color: #065f46; margin: 8px 0 0 0;">Your account is active and ready to use. You can login now!</p>
           </div>`;

      await transport.sendMail({
        from: `"${process.env.FROM_NAME || 'Reliable Group MEP'}" <${process.env.FROM_EMAIL || process.env.SMTP_USER}>`,
        to: email,
        subject: subject,
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
            <div style="text-align: center; margin-bottom: 30px;">
              <h1 style="color: #1e3a6e; margin: 0;">Reliable Group MEP</h1>
              <p style="color: #6b7280; margin: 5px 0;">Work Permit Management System</p>
            </div>
            
            <h2 style="color: #1f2937;">Hello ${firstName} ${lastName},</h2>
            
            <p style="color: #4b5563; line-height: 1.6;">
              Your account has been successfully created on the Reliable Group MEP - Work Permit Management System.
            </p>
            
            ${approvalMessage}
            
            <div style="background-color: #1e3a6e; border-radius: 8px; padding: 20px; margin: 20px 0;">
              <h3 style="color: #ffffff; margin-top: 0;">🔐 Your Login Credentials:</h3>
              <table style="width: 100%; border-collapse: collapse;">
                <tr>
                  <td style="padding: 8px 0; color: #93c5fd; width: 100px;">Email:</td>
                  <td style="padding: 8px 0; color: #ffffff; font-weight: 600; font-family: monospace;">${email}</td>
                </tr>
                <tr>
                  <td style="padding: 8px 0; color: #93c5fd;">Password:</td>
                  <td style="padding: 8px 0; color: #ffffff; font-weight: 600; font-family: monospace;">${password || '********'}</td>
                </tr>
              </table>
              <p style="color: #fcd34d; font-size: 12px; margin: 15px 0 0 0;">⚠️ Please change your password after first login for security.</p>
            </div>
            
            <div style="text-align: center; margin: 25px 0;">
              <a href="http://mepreliable.cloud" style="background-color: #1e3a6e; color: #ffffff; padding: 12px 30px; text-decoration: none; border-radius: 6px; font-weight: 600; display: inline-block;">Login Now</a>
            </div>
            
            <div style="background-color: #f3f4f6; border-radius: 8px; padding: 20px; margin: 20px 0;">
              <h3 style="color: #1f2937; margin-top: 0;">📋 Account Details:</h3>
              <table style="width: 100%; border-collapse: collapse;">
                <tr>
                  <td style="padding: 8px 0; color: #6b7280; width: 120px;">Name:</td>
                  <td style="padding: 8px 0; color: #1f2937; font-weight: 500;">${firstName} ${lastName}</td>
                </tr>
                <tr>
                  <td style="padding: 8px 0; color: #6b7280;">Role:</td>
                  <td style="padding: 8px 0; color: #1f2937; font-weight: 500;">${role}</td>
                </tr>
                <tr>
                  <td style="padding: 8px 0; color: #6b7280;">Created On:</td>
                  <td style="padding: 8px 0; color: #1f2937; font-weight: 500;">${currentDate}</td>
                </tr>
              </table>
            </div>
            
            <p style="color: #4b5563; line-height: 1.6;">
              If you did not create this account, please contact our support team immediately.
            </p>
            
            <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 30px 0;" />
            
            <p style="color: #9ca3af; font-size: 12px; text-align: center;">
              © ${new Date().getFullYear()} YP Security Services Pvt Ltd. All rights reserved.<br />
              This is an automated message. Please do not reply to this email.
            </p>
          </div>
        `,
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
    body: `Your OTP for Reliable Group MEP is: ${otp}. Valid for 5 minutes.`,
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
    otp: otp, // For development only - remove in production
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
    otp: otp, // For development only - remove in production
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
    await transport.sendMail({
      from: `"${process.env.FROM_NAME || 'Reliable Group MEP'}" <${process.env.FROM_EMAIL || process.env.SMTP_USER}>`,
      to: adminEmails.join(', '),
      subject: '🔔 New Account Registration Request - Action Required',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="text-align: center; margin-bottom: 30px;">
            <h1 style="color: #1e3a6e; margin: 0;">Reliable Group MEP</h1>
            <p style="color: #6b7280; margin: 5px 0;">Work Permit Management System</p>
          </div>
          
          <div style="background-color: #fef3c7; border: 1px solid #f59e0b; border-radius: 8px; padding: 20px; margin-bottom: 20px;">
            <h2 style="color: #92400e; margin: 0 0 10px 0;">🔔 New Account Registration Request</h2>
            <p style="color: #92400e; margin: 0;">A new user has requested to create an account and is waiting for your approval.</p>
          </div>
          
          <div style="background-color: #f3f4f6; border-radius: 8px; padding: 20px; margin-bottom: 20px;">
            <h3 style="color: #1f2937; margin-top: 0;">👤 User Details:</h3>
            <table style="width: 100%; border-collapse: collapse;">
              <tr>
                <td style="padding: 8px 0; color: #6b7280; width: 140px;">Name:</td>
                <td style="padding: 8px 0; color: #1f2937; font-weight: 600;">${firstName} ${lastName}</td>
              </tr>
              <tr>
                <td style="padding: 8px 0; color: #6b7280;">Email:</td>
                <td style="padding: 8px 0; color: #1f2937;">${email}</td>
              </tr>
              <tr>
                <td style="padding: 8px 0; color: #6b7280;">Phone:</td>
                <td style="padding: 8px 0; color: #1f2937;">${phone || 'Not provided'}</td>
              </tr>
              <tr>
                <td style="padding: 8px 0; color: #6b7280;">Department:</td>
                <td style="padding: 8px 0; color: #1f2937;">${department || 'Not specified'}</td>
              </tr>
              <tr>
                <td style="padding: 8px 0; color: #6b7280;">Requested Role:</td>
                <td style="padding: 8px 0; color: #1f2937; font-weight: 600;">${requestedRole}</td>
              </tr>
              <tr>
                <td style="padding: 8px 0; color: #6b7280;">Requested On:</td>
                <td style="padding: 8px 0; color: #1f2937;">${currentDate}</td>
              </tr>
            </table>
          </div>
          
          <div style="text-align: center; margin: 25px 0;">
            <a href="http://mepreliable.cloud/users?tab=pending" style="background-color: #1e3a6e; color: #ffffff; padding: 12px 30px; text-decoration: none; border-radius: 6px; font-weight: 600; display: inline-block;">Review & Approve</a>
          </div>
          
          <p style="color: #6b7280; font-size: 14px; text-align: center;">
            Please login to the admin panel to approve or reject this registration request.
          </p>
          
          <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 30px 0;" />
          
          <p style="color: #9ca3af; font-size: 12px; text-align: center;">
            © ${new Date().getFullYear()} YP Security Services Pvt Ltd. All rights reserved.<br />
            This is an automated notification from the Work Permit Management System.
          </p>
        </div>
      `,
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
    await transport.sendMail({
      from: `"${process.env.FROM_NAME || 'Reliable Group MEP'}" <${process.env.FROM_EMAIL || process.env.SMTP_USER}>`,
      to: firemanEmails.join(', '),
      subject: `🔥 New Permit Request - ${workTypeLabels[workType] || workType} - Approval Required`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="text-align: center; margin-bottom: 30px;">
            <h1 style="color: #1e3a6e; margin: 0;">Reliable Group MEP</h1>
            <p style="color: #6b7280; margin: 5px 0;">Work Permit Management System</p>
          </div>
          
          <div style="background-color: #fef3c7; border: 1px solid #f59e0b; border-radius: 8px; padding: 20px; margin-bottom: 20px;">
            <h2 style="color: #92400e; margin: 0 0 10px 0;">🔥 New Permit Request</h2>
            <p style="color: #92400e; margin: 0;">A new work permit has been submitted and requires your approval.</p>
          </div>
          
          <div style="background-color: #1e3a6e; border-radius: 8px; padding: 20px; margin-bottom: 20px;">
            <h3 style="color: #ffffff; margin: 0 0 15px 0;">📋 Permit Details:</h3>
            <table style="width: 100%; border-collapse: collapse;">
              <tr>
                <td style="padding: 8px 0; color: #93c5fd; width: 120px;">Title:</td>
                <td style="padding: 8px 0; color: #ffffff; font-weight: 600;">${title}</td>
              </tr>
              <tr>
                <td style="padding: 8px 0; color: #93c5fd;">Type:</td>
                <td style="padding: 8px 0; color: #ffffff;">${workTypeLabels[workType] || workType}</td>
              </tr>
              <tr>
                <td style="padding: 8px 0; color: #93c5fd;">Location:</td>
                <td style="padding: 8px 0; color: #ffffff;">${location}</td>
              </tr>
              <tr>
                <td style="padding: 8px 0; color: #93c5fd;">Start Date:</td>
                <td style="padding: 8px 0; color: #ffffff;">${new Date(startDate).toLocaleString('en-IN')}</td>
              </tr>
              <tr>
                <td style="padding: 8px 0; color: #93c5fd;">End Date:</td>
                <td style="padding: 8px 0; color: #ffffff;">${new Date(endDate).toLocaleString('en-IN')}</td>
              </tr>
              <tr>
                <td style="padding: 8px 0; color: #93c5fd;">Priority:</td>
                <td style="padding: 8px 0;"><span style="background-color: ${priorityColors[priority] || '#3b82f6'}; color: white; padding: 4px 12px; border-radius: 4px; font-weight: 600;">${priority}</span></td>
              </tr>
              <tr>
                <td style="padding: 8px 0; color: #93c5fd;">Requested By:</td>
                <td style="padding: 8px 0; color: #ffffff;">${createdBy?.firstName || ''} ${createdBy?.lastName || ''} (${createdBy?.email || 'N/A'})</td>
              </tr>
            </table>
          </div>
          
          <div style="text-align: center; margin: 25px 0;">
            <a href="http://mepreliable.cloud/approvals" style="background-color: #f59e0b; color: #ffffff; padding: 12px 30px; text-decoration: none; border-radius: 6px; font-weight: 600; display: inline-block;">Review & Approve Permit</a>
          </div>
          
          <p style="color: #6b7280; font-size: 14px; text-align: center;">
            Please login to review the permit details and take appropriate action.
          </p>
          
          <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 30px 0;" />
          
          <p style="color: #9ca3af; font-size: 12px; text-align: center;">
            © ${new Date().getFullYear()} YP Security Services Pvt Ltd. All rights reserved.<br />
            This is an automated notification from the Work Permit Management System.
          </p>
        </div>
      `,
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
