const { PrismaClient } = require('@prisma/client');
const PDFDocument = require('pdfkit');
const path = require('path');
const fs = require('fs');

const prisma = new PrismaClient();

// Logo path - try multiple locations
const getLogoPath = () => {
  const possiblePaths = [
    path.join(__dirname, '../../public/logo.png'),
    path.join(__dirname, '../../../frontend/public/logo.png'),
    path.join(process.cwd(), 'public/logo.png'),
    path.join(process.cwd(), 'backend/public/logo.png'),
    path.join(process.cwd(), 'frontend/public/logo.png'),
  ];
  
  for (const logoPath of possiblePaths) {
    if (fs.existsSync(logoPath)) {
      console.log('Logo found at:', logoPath);
      return logoPath;
    }
  }
  console.log('Logo not found in any location');
  return null;
};

// Helper function to format date in specific timezone
const formatDateInTimezone = (dateString, timezone = 'Asia/Kolkata') => {
  try {
    const date = new Date(dateString);
    return date.toLocaleString('en-IN', {
      timeZone: timezone,
      year: 'numeric',
      month: 'numeric',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      hour12: true
    });
  } catch (err) {
    // Fallback if timezone is not supported
    return new Date(dateString).toLocaleString('en-IN');
  }
};

// Work type labels
const workTypeLabels = {
  'HOT_WORK': 'HOT WORK PERMIT',
  'CONFINED_SPACE': 'CONFINED SPACE PERMIT',
  'ELECTRICAL': 'ELECTRICAL WORK PERMIT',
  'WORKING_AT_HEIGHT': 'WORKING AT HEIGHT PERMIT',
  'EXCAVATION': 'EXCAVATION PERMIT',
  'LIFTING': 'LIFTING OPERATIONS PERMIT',
  'CHEMICAL': 'CHEMICAL HANDLING PERMIT',
  'RADIATION': 'RADIATION WORK PERMIT',
  'GENERAL': 'GENERAL WORK PERMIT',
  'COLD_WORK': 'COLD WORK PERMIT',
  'LOTO': 'LOTO PERMIT',
  'VEHICLE': 'VEHICLE WORK PERMIT',
  'PRESSURE_TESTING': 'HYDRO PRESSURE TESTING PERMIT',
  'ENERGIZE': 'ENERGIZE PERMIT',
  'SWMS': 'SAFE WORK METHOD STATEMENT',
};

// Status colors
const statusColors = {
  'PENDING': '#f59e0b',
  'APPROVED': '#10b981',
  'REJECTED': '#ef4444',
  'CLOSED': '#6b7280',
  'EXTENDED': '#3b82f6',
  'REVOKED': '#ef4444',
  'REAPPROVED': '#14b8a6',
  'PENDING_REMARKS': '#f97316',
};

// ID Proof type labels
const idProofLabels = {
  'aadhaar': 'Aadhaar Card',
  'pan': 'PAN Card',
  'driving_license': 'Driving License',
  'voter_id': 'Voter ID',
  'passport': 'Passport',
  'other': 'Other ID',
};

// Section colors for headers
const sectionColors = {
  vendorDetails: '#f59e0b',     // Orange/Yellow for Vendor/Contractor
  workers: '#334155',           // Dark slate for Workers
  location: '#7c3aed',          // Purple for Location
  duration: '#334155',          // Dark slate for Duration
  hazards: '#dc2626',           // Red for Hazards
  ppe: '#16a34a',               // Green for PPE
  measures: '#334155',          // Dark slate for Measures
  generalInstructions: '#2563eb', // Blue for General Instructions
  declaration: '#1e3a8a',       // Dark blue for Declaration
  approvals: '#334155',         // Dark slate for Approvals
  firemanRemarks: '#7c3aed',    // Purple for Fireman Remarks
  documents: '#0891b2',         // Cyan for Documents
  actionHistory: '#0d9488',     // Teal for Action History
};

// General Instructions (as per Reliable Group standards)
// Format: { text: string, boldParts: string[] } for parts that need to be bold
const generalInstructions = [
  { 
    text: '1. Only upon prior request from client, Reliable Group can provide 3-phase 440 volts electrical power at one point with MCB protection. All further distribution of power from this point, for the mentioned work/job/activity is in vendors\'/contractors\'/clients\'/tenants\' scope and responsibility. Wires/Cables of proper type and size with safety devices like MCCB/ELCB are to be used to avoid electrocution and related hazards. Providing these safety devices for such work is not in Reliable Group\'s scope. Reliable Group or its officers and employees are not responsible for providing the same. Any untoward incident due to not using the protection devices is solely the vendors\'/contractors\'/clients\'/tenants\' responsibility.',
    boldParts: ['Providing these safety devices for such work is not in Reliable Group\'s scope.']
  },
  { 
    text: '2. All instructions related to the mandatory use of safety equipment, information about potential hazardous/risky areas are given to the mentioned responsible person(s) by the Reliable Group\'s Safety Officer.',
    boldParts: []
  },
  { 
    text: '3. Following all safety related protocols & complying with safety standards as guided by the Reliable Group\'s Fire & Safety Team is mandatory. If found not adhering to the same the Reliable Group\'s Fire & Safety Team has the authority to cease/discontinue the ongoing work/job/activity.',
    boldParts: ['If found not adhering to the same the Reliable Group\'s Fire & Safety Team has the authority to cease/discontinue the ongoing work/job/activity.']
  },
  { 
    text: '4. General working hours are: 9:30 AM - 6:30 PM',
    boldParts: ['9:30 AM - 6:30 PM']
  },
  { 
    text: '5. Special permission is mandatory for night work/job/activity.',
    boldParts: ['Special permission is mandatory for night work/job/activity.']
  },
  { 
    text: '6. Kindly take additional precautions while opening shaft doors as, all shafts are hollow. For this very reason all shaft doors are kept locked at all times. Thus, request you to close & lock shaft doors post completion of work/job/activity.',
    boldParts: ['additional precautions while opening shaft doors as, all shafts are hollow.']
  },
  { 
    text: '7. Report any issue/emergency on 24x7 Emergency Fire & Safety Duty Cell- Ph. No.: 9820336370',
    boldParts: ['Ph. No.: 9820336370']
  },
  { 
    text: '8. While working additional care has to be taken for not to disturb other clients\'/tenants\' existing setup.',
    boldParts: []
  },
];

// Indemnity by Applicant - All liability on vendor/contractor/applicant side, Reliable Group fully indemnified
const declarationPoints = [
  '1. I/We (the vendor/contractor/applicant) have thoroughly read, comprehensively understood, and fully acknowledged all the safety requirements, protocols, procedures, and guidelines mentioned in this permit application. I/We accept COMPLETE AND SOLE RESPONSIBILITY for understanding and compliance.',
  '2. I/We (the vendor/contractor/applicant) unconditionally agree to strictly comply with and faithfully abide by all the listed requirements, safety measures, emergency procedures, and standard operating procedures throughout the entire duration of this work permit. Any failure to comply is SOLELY OUR RESPONSIBILITY.',
  '3. I/We (the vendor/contractor/applicant) understand and accept that we shall be held SOLELY AND ENTIRELY RESPONSIBLE for any untoward incident, accident, injury, damage to property, equipment, machinery, or human life arising due to any unsafe act, negligence, violation of safety protocols, or non-compliance during this work/job/activity. Reliable Group, its officers, employees, and representatives shall bear NO LIABILITY WHATSOEVER.',
  '4. I/We (the vendor/contractor/applicant) acknowledge that verifying and ensuring the validity of all workers\' necessary licenses, certifications, competency certificates, training records, medical fitness certificates, and utility vehicle\'s compliance documents (including valid insurance, PUC, fitness certificate, registration, etc.) is SOLELY AND ENTIRELY our (clients\'/tenants\'/contractors\'/vendors\') responsibility. Reliable Group has no obligation to verify these documents.',
  '5. I/We (the vendor/contractor/applicant) confirm that all workers deployed for this activity are adequately trained, possess required skills, are medically fit, and are equipped with all the required Personal Protective Equipment (PPE) as specified in this permit. Any injury or incident due to inadequate training, skills, or PPE is SOLELY OUR RESPONSIBILITY.',
  '6. I/We (the vendor/contractor/applicant) agree to immediately report any unsafe conditions, near-miss incidents, accidents, or emergencies to the site safety team and follow all emergency evacuation procedures as directed. Failure to report shall not create any liability for Reliable Group.',
  '7. I/We (the vendor/contractor/applicant) hereby FULLY INDEMNIFY AND HOLD HARMLESS Reliable Group, its directors, officers, employees, agents, and representatives from and against any and all claims, damages, losses, costs, liabilities, and expenses (including legal fees) arising out of or in connection with this work permit, the work performed, or any incident occurring during the work activity.',
];

const declarationFooter = 'By checking the box below, I/We (the vendor/contractor/applicant) confirm that this declaration has been read, understood, and agreed upon. This constitutes a legally binding undertaking and indemnity in favor of Reliable Group. The applicant/vendor/contractor accepts FULL AND SOLE LIABILITY for all activities under this permit.';

// Generate permit PDF
const generatePermitPDF = async (req, res) => {
  try {
    const { id } = req.params;

    // Get permit with all related data
    const permit = await prisma.permitRequest.findUnique({
      where: { id },
      include: {
        user: {
          select: {
            firstName: true,
            lastName: true,
            email: true,
            department: true,
          },
        },
        approvals: true,
        actionHistory: {
          orderBy: { createdAt: 'asc' },
        },
      },
    });

    if (!permit) {
      return res.status(404).json({ message: 'Permit not found' });
    }

    // Parse JSON fields
    const workers = JSON.parse(permit.workers || '[]');
    const measures = JSON.parse(permit.measures || '[]');
    const hazards = JSON.parse(permit.hazards || '[]');
    const precautions = JSON.parse(permit.precautions || '[]');
    const equipment = JSON.parse(permit.equipment || '[]');
    const vendorDetails = permit.vendorDetails ? JSON.parse(permit.vendorDetails) : null;

    // Create PDF document
    const doc = new PDFDocument({
      size: 'A4',
      margins: { top: 40, bottom: 40, left: 40, right: 40 },
    });

    // Set response headers
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${permit.permitNumber}.pdf"`);

    // Pipe PDF to response
    doc.pipe(res);

    // Define permit timezone for all date formatting (use Asia/Kolkata as default)
    const permitTimezone = permit.timezone || 'Asia/Kolkata';
    
    // Helper function to check and add new page
    let yPos = 40;
    const checkPageBreak = (requiredSpace = 100) => {
      if (yPos > 750 - requiredSpace) {
        doc.addPage();
        yPos = 40;
        return true;
      }
      return false;
    };

    // Helper to draw styled section header (CENTERED text)
    const drawSectionHeader = (title, color = '#334155') => {
      checkPageBreak(80);
      // Draw colored rectangle background
      doc.rect(40, yPos, 515, 22).fill(color);
      // Set white text color AFTER filling rectangle and draw title CENTERED
      doc.fontSize(10).font('Helvetica-Bold').fillColor('#ffffff')
         .text(title, 40, yPos + 6, { width: 515, align: 'center' });
      yPos += 30;
    };

    // Helper to draw a bordered info box (CENTERED header text)
    const drawInfoBox = (x, y, width, height, headerText, headerColor = '#334155') => {
      doc.rect(x, y, width, height).stroke('#e2e8f0');
      doc.rect(x, y, width, 20).fill(headerColor);
      // Set white text color AFTER filling rectangle - CENTERED
      doc.fontSize(9).font('Helvetica-Bold').fillColor('#ffffff')
         .text(headerText, x, y + 5, { width: width, align: 'center' });
    };

    // === HEADER WITH BRANDING ===
    
    // LEFT SIDE: Company name and permit details
    doc.fontSize(16).font('Helvetica-Bold').fillColor('#1e293b')
       .text(permit.companyName || permit.user?.department || vendorDetails?.vendorCompany || 'Contractor', 40, yPos);
    
    // RIGHT SIDE: RELIABLE GROUP branding with logo
    // Add logo if it exists
    const logoPath = getLogoPath();
    const brandingStartX = 395;  // Shifted left for more space
    const brandingY = yPos;
    
    try {
      if (logoPath) {
        // Draw logo (the logo already has the banner/flag design)
        doc.image(logoPath, brandingStartX, brandingY, { width: 38, height: 40 });
      }
    } catch (logoError) {
      console.log('Logo error:', logoError.message);
    }
    
    // "Reliable Group" text - positioned to the right of logo
    doc.fontSize(11).font('Helvetica-Bold').fillColor('#1e293b')
       .text('Reliable ', brandingStartX + 42, brandingY + 6, { continued: true });
    doc.fontSize(11).font('Helvetica-Bold').fillColor('#1e293b')
       .text('Group', { continued: false });
    
    // Horizontal line under "Reliable Group"  
    doc.moveTo(brandingStartX + 42, brandingY + 19).lineTo(555, brandingY + 19).strokeColor('#1e293b').lineWidth(0.5).stroke();
    
    // "Creating Lifestyle" motto in italic style
    doc.fontSize(8).font('Helvetica-Oblique').fillColor('#333333')
       .text('Creating Lifestyle', brandingStartX + 42, brandingY + 22);
    
    yPos += 28;
    
    // Permit type (left side)
    doc.fontSize(13).font('Helvetica-Bold').fillColor('#334155')
       .text(workTypeLabels[permit.workType] || 'WORK PERMIT', 40, yPos);

    yPos += 18;
    
    // Requested by info
    doc.fontSize(9).font('Helvetica-Bold').fillColor('#1e293b')
       .text(`Requested by: ${permit.user.firstName} ${permit.user.lastName}`, 40, yPos);
    yPos += 12;
    doc.fontSize(8).font('Helvetica').fillColor('#64748b')
       .text(`Date: ${new Date(permit.createdAt).toLocaleDateString()}`, 40, yPos);

    yPos += 12;
    
    // Permit number
    doc.fontSize(9).font('Helvetica-Bold').fillColor('#1e293b')
       .text(`Permit No: ${permit.permitNumber}`, 40, yPos);

    // Status badge (right side, aligned with permit number line)
    const statusColor = statusColors[permit.status] || '#6b7280';
    const statusText = permit.status.replace('_', ' '); // Replace underscore with space
    const statusWidth = permit.status.length > 10 ? 90 : 70;
    doc.roundedRect(555 - statusWidth, yPos - 3, statusWidth, 20, 3).fill(statusColor);
    doc.fontSize(8).font('Helvetica-Bold').fillColor('#ffffff')
       .text(statusText, 555 - statusWidth, yPos + 2, { width: statusWidth, align: 'center' });

    yPos += 25;

    // === BASIC PERMIT DETAILS (VENDOR) SECTION ===
    drawSectionHeader('BASIC PERMIT DETAILS (VENDOR)', sectionColors.vendorDetails);
    
    doc.fontSize(9).fillColor('#1e293b');
    
    // Row 1: Name and Phone
    doc.font('Helvetica-Bold').text('Name:', 45, yPos);
    doc.font('Helvetica').text(vendorDetails?.vendorName || permit.contractorName || '-', 130, yPos);
    
    doc.font('Helvetica-Bold').text('Phone:', 310, yPos);
    doc.font('Helvetica').text(vendorDetails?.vendorPhone || permit.contractorPhone || '-', 370, yPos);
    yPos += 18;
    
    // Row 2: Company and Email
    doc.font('Helvetica-Bold').text('Company:', 45, yPos);
    doc.font('Helvetica').text(vendorDetails?.vendorCompany || permit.companyName || '-', 130, yPos);
    
    doc.font('Helvetica-Bold').text('Email:', 310, yPos);
    doc.font('Helvetica').text(vendorDetails?.vendorEmail || '-', 370, yPos);
    yPos += 20;
    
    // Requester Details
    doc.font('Helvetica-Bold').text('Requested By:', 45, yPos);
    doc.font('Helvetica').text(`${permit.user.firstName} ${permit.user.lastName}`, 130, yPos);
    
    doc.font('Helvetica-Bold').text('Requester Email:', 310, yPos);
    doc.font('Helvetica').text(permit.user.email || '-', 400, yPos);
    yPos += 25;

    // === WORKERS SECTION ===
    drawSectionHeader('DETAILS OF WORKFORCE INVOLVED', sectionColors.workers);

    if (workers.length > 0) {
      // Table header
      doc.fontSize(8).font('Helvetica-Bold').fillColor('#64748b');
      doc.text('S.No', 50, yPos);
      doc.text('Worker Name', 85, yPos);
      doc.text('Phone', 200, yPos);
      doc.text('ID Type', 300, yPos);
      doc.text('ID Number', 400, yPos);
      yPos += 14;
      doc.moveTo(40, yPos).lineTo(555, yPos).stroke('#e2e8f0');
      yPos += 8;

      // Table rows
      workers.forEach((worker, index) => {
        checkPageBreak(20);
        doc.fontSize(8).font('Helvetica').fillColor('#1e293b');
        doc.text((index + 1).toString(), 55, yPos);
        doc.text(worker.name || '-', 85, yPos, { width: 110 });
        doc.text(worker.phone || '-', 200, yPos, { width: 95 });
        doc.text(idProofLabels[worker.idProofType] || worker.idProofType || '-', 300, yPos, { width: 95 });
        doc.text(worker.idProofNumber || '-', 400, yPos, { width: 140 });
        yPos += 16;
      });
    } else {
      doc.fontSize(9).font('Helvetica').fillColor('#64748b')
         .text('No workers assigned', 50, yPos);
      yPos += 18;
    }

    yPos += 10;

    // === LOCATION & DURATION ===
    checkPageBreak(100);
    
    // Location box
    const locationBoxY = yPos;
    drawInfoBox(40, yPos, 250, 75, 'WORK LOCATION', sectionColors.location);
    doc.fontSize(9).font('Helvetica').fillColor('#1e293b')
       .text(permit.location, 50, yPos + 30, { width: 230 });
    doc.fontSize(8).fillColor('#64748b')
       .text(`Timezone: ${permit.timezone || 'Asia/Calcutta'}`, 50, yPos + 58);

    // Duration box
    drawInfoBox(305, locationBoxY, 250, 75, 'PERMIT VALIDITY', sectionColors.duration);
    
    doc.fontSize(8).font('Helvetica-Bold').fillColor('#64748b');
    doc.text('Start Date & Time', 315, locationBoxY + 28);
    doc.text('End Date & Time', 435, locationBoxY + 28);
    
    doc.fontSize(8).font('Helvetica').fillColor('#1e293b');
    doc.text(formatDateInTimezone(permit.startDate, permitTimezone), 315, locationBoxY + 42, { width: 115 });
    doc.text(formatDateInTimezone(permit.endDate, permitTimezone), 435, locationBoxY + 42, { width: 115 });
    
    doc.fontSize(8).font('Helvetica-Bold').fillColor('#64748b').text('Extended:', 315, locationBoxY + 58);
    doc.font('Helvetica').fillColor(permit.isExtended ? '#3b82f6' : '#1e293b')
       .text(permit.isExtended ? 'YES' : 'NO', 365, locationBoxY + 58);

    yPos = locationBoxY + 90;

    // === HAZARDS SECTION ===
    if (hazards.length > 0) {
      drawSectionHeader('HAZARDS IDENTIFIED BY APPLICANT', sectionColors.hazards);
      doc.fontSize(9).font('Helvetica').fillColor('#1e293b');
      hazards.forEach((hazard) => {
        checkPageBreak(15);
        doc.text(`• ${hazard}`, 50, yPos, { width: 490 });
        yPos += 14;
      });
      yPos += 5;
    }

    // === PPE & EQUIPMENT SECTION ===
    if (equipment.length > 0) {
      drawSectionHeader('LIST OF MANDATORY PPE & TOOLS', sectionColors.ppe);
      
      // Grid layout for equipment (3 columns)
      let col = 0;
      let rowY = yPos;
      equipment.forEach((item, index) => {
        checkPageBreak(15);
        const xPos = 50 + (col * 170);
        doc.fontSize(8).font('Helvetica').fillColor('#1e293b');
        doc.text(`✓ ${item}`, xPos, rowY, { width: 160 });
        col++;
        if (col >= 3) {
          col = 0;
          rowY += 14;
          yPos = rowY;
        }
      });
      if (col !== 0) yPos += 14;
      yPos += 10;
    }

    // === GENERAL INSTRUCTIONS SECTION ===
    checkPageBreak(180);
    yPos += 5;
    
    drawSectionHeader('GENERAL INSTRUCTIONS', sectionColors.generalInstructions);
    
    // Render general instructions with inline bold parts
    generalInstructions.forEach((instruction) => {
      checkPageBreak(60);
      
      const text = instruction.text;
      const boldParts = instruction.boldParts || [];
      
      if (boldParts.length === 0) {
        // No bold parts, render normally
        doc.fontSize(8).font('Helvetica').fillColor('#1e293b');
        const height = doc.heightOfString(text, { width: 490 });
        doc.text(text, 50, yPos, { width: 490 });
        yPos += height + 8;
      } else {
        // Split text and render with bold parts
        let remainingText = text;
        let currentX = 50;
        let startY = yPos;
        let maxHeight = 0;
        
        // Process each bold part
        boldParts.forEach((boldPart) => {
          const boldIndex = remainingText.indexOf(boldPart);
          if (boldIndex !== -1) {
            // Text before bold part
            const beforeBold = remainingText.substring(0, boldIndex);
            if (beforeBold) {
              doc.fontSize(8).font('Helvetica').fillColor('#1e293b');
              doc.text(beforeBold, 50, yPos, { width: 490, continued: true });
            }
            
            // Bold part
            doc.fontSize(8).font('Helvetica-Bold').fillColor('#1e293b');
            doc.text(boldPart, { continued: true });
            
            // Update remaining text
            remainingText = remainingText.substring(boldIndex + boldPart.length);
          }
        });
        
        // Remaining text after all bold parts
        if (remainingText) {
          doc.fontSize(8).font('Helvetica').fillColor('#1e293b');
          doc.text(remainingText, { continued: false });
        } else {
          doc.text('', { continued: false }); // End the continued text
        }
        
        // Calculate height for spacing
        doc.fontSize(8).font('Helvetica');
        const totalHeight = doc.heightOfString(text, { width: 490 });
        yPos += totalHeight + 8;
      }
    });
    
    yPos += 10;

    // === DECLARATION AND UNDERTAKING BY THE APPLICANT ===
    checkPageBreak(250);
    yPos += 5;
    
    drawSectionHeader('DECLARATION AND UNDERTAKING BY THE APPLICANT', sectionColors.declaration);
    
    // Declaration header
    doc.fontSize(9).font('Helvetica-Bold').fillColor('#1e293b')
       .text('I/We hereby solemnly declare and undertake that:', 50, yPos);
    yPos += 20;
    
    // Declaration points with proper line spacing
    declarationPoints.forEach((point) => {
      checkPageBreak(60);
      
      doc.fontSize(8).font('Helvetica');
      const textHeight = doc.heightOfString(point, { width: 490 });
      
      // Highlight point 3 (liability clause) in different color
      if (point.includes('SOLELY AND ENTIRELY RESPONSIBLE') && point.startsWith('3.')) {
        doc.fillColor('#dc2626')
           .text(point, 50, yPos, { width: 490, align: 'justify' });
      } else {
        doc.fillColor('#1e293b')
           .text(point, 50, yPos, { width: 490, align: 'justify' });
      }
      yPos += textHeight + 10; // Add proper spacing after each point
    });
    
    checkPageBreak(80);
    
    // Declaration footer
    doc.fontSize(8).font('Helvetica-Oblique').fillColor('#64748b');
    const footerHeight = doc.heightOfString(declarationFooter, { width: 490 });
    doc.text(declarationFooter, 50, yPos, { width: 490, align: 'justify' });
    yPos += footerHeight + 15;
    
    // Agreement checkbox representation with clear tick mark
    // Draw green filled box
    doc.rect(50, yPos, 16, 16).fill('#10b981');
    // Draw checkmark using lines instead of unicode character
    doc.strokeColor('#ffffff').lineWidth(2);
    doc.moveTo(54, yPos + 9).lineTo(57, yPos + 12).lineTo(63, yPos + 5).stroke();
    // Reset stroke color
    doc.strokeColor('#000000').lineWidth(1);
    // Draw text
    doc.fontSize(9).font('Helvetica-Bold').fillColor('#1e293b')
       .text('I Agree to the Declaration & Undertaking', 75, yPos + 3);
    
    yPos += 35;

    // === DOCUMENTS UPLOADED (ID PROOFS) - WITH EMBEDDED IMAGES ===
    const workersWithDocs = workers.filter(w => w.idProofImage);
    if (workersWithDocs.length > 0) {
      checkPageBreak(150);
      
      drawSectionHeader('DOCUMENTS UPLOADED BY REQUESTOR', sectionColors.documents);
      
      doc.fontSize(8).font('Helvetica').fillColor('#64748b')
         .text('ID proof documents uploaded for verification:', 50, yPos);
      yPos += 16;
      
      // Display each worker's document with large image
      for (let i = 0; i < workersWithDocs.length; i++) {
        const worker = workersWithDocs[i];
        
        // Check if we need a new page for the image (image height ~200 + text ~40)
        checkPageBreak(260);
        
        // Worker info header
        doc.fontSize(9).font('Helvetica-Bold').fillColor('#1e293b');
        doc.text(`${i + 1}. ${worker.name}`, 50, yPos);
        yPos += 14;
        
        doc.fontSize(8).font('Helvetica').fillColor('#64748b');
        doc.text(`${idProofLabels[worker.idProofType] || worker.idProofType}: ${worker.idProofNumber}`, 50, yPos);
        yPos += 16;
        
        // Embed the image if it's base64
        if (worker.idProofImage && worker.idProofImage.startsWith('data:image')) {
          try {
            // Extract base64 data from data URL
            const base64Data = worker.idProofImage.split(',')[1];
            const imageBuffer = Buffer.from(base64Data, 'base64');
            
            // Add bordered frame around image
            doc.rect(50, yPos, 220, 180).stroke('#e2e8f0');
            
            // Embed image - large size (200x160)
            doc.image(imageBuffer, 60, yPos + 10, { 
              fit: [200, 160],
              align: 'center',
              valign: 'center'
            });
            
            yPos += 190;
          } catch (imgError) {
            console.error('Error embedding image:', imgError);
            doc.fontSize(8).fillColor('#ef4444')
               .text('[Image could not be loaded]', 50, yPos);
            yPos += 20;
          }
        } else if (worker.idProofImage) {
          // If it's a URL, show the link
          doc.fontSize(8).fillColor('#0891b2')
             .text(`Document: ${worker.idProofImage}`, 50, yPos, { width: 490 });
          yPos += 20;
        }
        
        yPos += 15; // Spacing between workers
      }
      
      yPos += 10;
    }

    // === ACTION HISTORY TRAIL (Approved -> Revoked -> Re-Approved) ===
    const actionHistory = permit.actionHistory || [];
    const approvedActions = permit.approvals?.filter(a => a.decision === 'APPROVED') || [];
    
    // Only show section if there's action history (revoke/reapprove events)
    if (actionHistory.length > 0 || approvedActions.length > 0) {
      checkPageBreak(120);
      drawSectionHeader('APPROVAL TRAIL (HISTORY)', sectionColors.actionHistory);
      
      // Show initial approval first (from approvals)
      approvedActions.forEach((approval, idx) => {
        checkPageBreak(60);
        
        // Action badge
        doc.roundedRect(50, yPos, 80, 18, 3).fill('#10b981');
        doc.fontSize(8).font('Helvetica-Bold').fillColor('#ffffff')
           .text('APPROVED', 50, yPos + 4, { width: 80, align: 'center' });
        
        // Action details
        doc.fontSize(9).font('Helvetica-Bold').fillColor('#1e293b')
           .text(`by ${approval.approverName || 'Authorized Person'}`, 140, yPos + 3);
        
        if (approval.approvedAt) {
          doc.fontSize(8).font('Helvetica').fillColor('#64748b')
             .text(formatDateInTimezone(approval.approvedAt, permitTimezone), 380, yPos + 4);
        }
        
        yPos += 22;
        
        // Comment if any
        if (approval.comment) {
          doc.fontSize(8).font('Helvetica').fillColor('#334155')
             .text(`Comment: ${approval.comment}`, 60, yPos, { width: 480 });
          yPos += doc.heightOfString(`Comment: ${approval.comment}`, { width: 480 }) + 5;
        }
        
        yPos += 10;
      });
      
      // Show action history (revoke, reapprove, extend, close)
      actionHistory.forEach((action, idx) => {
        checkPageBreak(60);
        
        // Action badge with appropriate color
        const actionColor = action.action === 'REVOKED' ? '#ef4444' : 
                           action.action === 'REAPPROVED' ? '#14b8a6' :
                           action.action === 'EXTENDED' ? '#3b82f6' :
                           action.action === 'CLOSED' ? '#6b7280' : '#f59e0b';
        
        doc.roundedRect(50, yPos, 80, 18, 3).fill(actionColor);
        doc.fontSize(8).font('Helvetica-Bold').fillColor('#ffffff')
           .text(action.action, 50, yPos + 4, { width: 80, align: 'center' });
        
        // Action details
        doc.fontSize(9).font('Helvetica-Bold').fillColor('#1e293b')
           .text(`by ${action.performedByName || 'Unknown'}`, 140, yPos + 3);
        
        if (action.performedByRole) {
          doc.fontSize(8).font('Helvetica').fillColor('#64748b')
             .text(`(${action.performedByRole})`, 250, yPos + 4);
        }
        
        doc.fontSize(8).font('Helvetica').fillColor('#64748b')
           .text(formatDateInTimezone(action.createdAt, permitTimezone), 380, yPos + 4);
        
        yPos += 22;
        
        // Comment if any
        if (action.comment) {
          doc.fontSize(8).font('Helvetica').fillColor('#334155')
             .text(`Comment: ${action.comment}`, 60, yPos, { width: 480 });
          yPos += doc.heightOfString(`Comment: ${action.comment}`, { width: 480 }) + 5;
        }
        
        yPos += 10;
      });
      
      yPos += 10;
    }

    // === FIREMAN REMARKS ===
    if (permit.safetyRemarks) {
      checkPageBreak(80);
      drawSectionHeader('FIREMAN REMARKS', sectionColors.firemanRemarks);
      
      doc.fontSize(9).font('Helvetica').fillColor('#1e293b')
         .text(permit.safetyRemarks, 50, yPos, { width: 490 });
      
      yPos += 30;
      
      if (permit.remarksAddedBy) {
        doc.fontSize(8).fillColor('#64748b')
           .text(`Added by: ${permit.remarksAddedBy}`, 50, yPos);
        if (permit.remarksAddedAt) {
          doc.text(` on ${formatDateInTimezone(permit.remarksAddedAt, permitTimezone)}`, 180, yPos);
        }
        yPos += 20;
      }
    }

    // === APPROVAL SIGNATURES ===
    checkPageBreak(180);
    yPos += 5;
    
    drawSectionHeader('APPROVAL GIVEN BY', sectionColors.approvals);

    // Find the approved approval (if any)
    const approvedApproval = permit.approvals.find(a => a.decision === 'APPROVED');
    
    if (approvedApproval) {
      // Approval box - wider to accommodate remarks
      const approvalBoxWidth = 515;
      doc.rect(40, yPos, approvalBoxWidth, 115).stroke('#e2e8f0');
      
      // "Authorized Person" label (where role was shown)
      doc.fontSize(9).font('Helvetica').fillColor('#64748b')
         .text('Authorized Person', 50, yPos + 8);
      
      // Approver name (NO role shown)
      doc.fontSize(11).font('Helvetica-Bold').fillColor('#1e293b')
         .text(approvedApproval.approverName || 'Safety Officer', 50, yPos + 22);
      
      // Approval date
      if (approvedApproval.approvedAt) {
        doc.fontSize(9).font('Helvetica').fillColor('#64748b')
           .text(`Date: ${formatDateInTimezone(approvedApproval.approvedAt, permitTimezone)}`, 50, yPos + 40);
      }
      
      // Remarks/Comment (if any)
      if (approvedApproval.comment) {
        doc.fontSize(9).font('Helvetica-Bold').fillColor('#1e293b')
           .text('Remarks:', 50, yPos + 58);
        doc.fontSize(9).font('Helvetica').fillColor('#334155')
           .text(approvedApproval.comment, 50, yPos + 72, { width: 490 });
      }
      
      yPos += 125;
      
      // Enhanced approval statement
      checkPageBreak(50);
      doc.fontSize(9).font('Helvetica-Bold').fillColor('#1e3a8a')
         .text('Considering the above undertaking given by the applicant, approval is hereby granted for the above-mentioned work/job/activity. The applicant is required to strictly adhere to all safety protocols and guidelines specified therein.', 
               50, yPos, { width: 490, align: 'justify' });
      
      yPos += 45;
    } else {
      // Show pending or rejected status
      permit.approvals.forEach((approval) => {
        doc.rect(40, yPos, 200, 60).stroke('#e2e8f0');
        
        doc.fontSize(10).font('Helvetica-Bold').fillColor('#1e293b')
           .text(approval.approverName || 'Pending Approval', 50, yPos + 10);
        
        // Decision badge
        const decisionColor = approval.decision === 'REJECTED' ? '#ef4444' : '#f59e0b';
        doc.roundedRect(50, yPos + 32, 70, 18, 2).fill(decisionColor);
        doc.fontSize(9).font('Helvetica-Bold').fillColor('#ffffff')
           .text(approval.decision, 50, yPos + 36, { width: 70, align: 'center' });
        
        yPos += 70;
      });
    }

    yPos += 10;

    // === AUTO-CLOSE INFO ===
    if (permit.autoClosedAt) {
      checkPageBreak(30);
      doc.fontSize(8).fillColor('#64748b')
         .text(`Auto-closed on: ${formatDateInTimezone(permit.autoClosedAt, permitTimezone)}`, 50, yPos);
      yPos += 20;
    }

    // === FOOTER ===
    // Ensure footer is at the bottom
    if (yPos > 700) {
      doc.addPage();
      yPos = 40;
    }

    // Footer box
    yPos = 755;
    doc.rect(40, yPos, 515, 35).fill('#f1f5f9');
    
    doc.fontSize(8).font('Helvetica-Bold').fillColor('#64748b')
       .text('This is a computer generated document. No signature is required.', 40, yPos + 5, { width: 515, align: 'center' });
    
    doc.fontSize(7).font('Helvetica').fillColor('#94a3b8')
       .text(`Generated on ${formatDateInTimezone(new Date(), permitTimezone)} | Permit ID: ${permit.id}`, 40, yPos + 20, { width: 515, align: 'center' });

    // Finalize PDF
    doc.end();

  } catch (error) {
    console.error('Generate PDF error:', error);
    res.status(500).json({ message: 'Error generating PDF' });
  }
};

module.exports = {
  generatePermitPDF,
};
