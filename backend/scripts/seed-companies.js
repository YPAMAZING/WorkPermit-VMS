/**
 * Seed Script: Add all companies to the VMS database
 * 
 * Run this script with: node scripts/seed-companies.js
 * 
 * This will add all the predefined companies with default settings:
 * - requireApproval: true (visitors need approval before entry)
 * - autoApproveVisitors: false
 */

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

// List of all companies to seed
const companies = [
  'Adani Enterprises',
  'Aquity Solutions',
  'AWFIS Solutions Spaces',
  'Azelis',
  'Baker Huges Oilfield Services',
  'Bharat Serum & Vaccines',
  'Birla Management Centre',
  'Brueckner Group India',
  'Clariant Chemicals',
  'Clover Infotech',
  'Covestro',
  'Creative IT',
  'DSP Integrated Services',
  'ECI Telecom',
  'EFC',
  'EFC Office Infra',
  'EFC Office Spaces',
  'EFC Tech Spaces',
  'ESDS',
  'Garmercy Tech Park',
  'Godrej',
  'Hansa Direct',
  'HCL Technologies',
  'Hindustan Fields Services',
  'Holcim Services',
  'Home Credit',
  'Icra',
  'Inchcap Shipping Services',
  'Indian Commodity Exchange',
  'Invenio Business Solution',
  'ISSGF',
  'Jacobs Solutions',
  'Kyndryl Solutions',
  'Lupin',
  'Maersk Global Service Centre',
  'Magic Bus',
  'NMDC Data Centre',
  'Nouryon Chemicals',
  'Quess Corp',
  'RBL Bank',
  'Reliance General Insurance',
  'Rubicon Maritime India',
  'Sify Infinity Spaces',
  'Spocto Business Solutions',
  'Suki Solution',
  'Sulzer Tech',
  'Sutherland Global Services',
  'Taldar Hotels & Resorts',
  'Tata Consulting Engineering',
  'Technics Reunidas',
  'Universal Sompo',
  'Vodafone Idea',
  'Yes Bank',
];

async function seedCompanies() {
  console.log('🚀 Starting company seeding...\n');
  
  const results = {
    created: 0,
    existing: 0,
    errors: [],
  };

  for (const companyName of companies) {
    try {
      // Check if company already exists
      const existing = await prisma.vMSCompany.findFirst({
        where: {
          OR: [
            { name: companyName },
            { displayName: companyName },
          ],
        },
      });

      if (existing) {
        console.log(`⏭️  Skipped (exists): ${companyName}`);
        results.existing++;
        continue;
      }

      // Create the company
      await prisma.vMSCompany.create({
        data: {
          name: companyName,
          displayName: companyName,
          requireApproval: true,        // Default: visitors need approval
          autoApproveVisitors: false,   // Default: no auto-approve
          notifyOnVisitor: true,        // Default: send notifications
          isActive: true,
        },
      });

      console.log(`✅ Created: ${companyName}`);
      results.created++;
    } catch (error) {
      console.error(`❌ Error creating ${companyName}:`, error.message);
      results.errors.push({ company: companyName, error: error.message });
    }
  }

  console.log('\n📊 Seeding Summary:');
  console.log(`   ✅ Created: ${results.created}`);
  console.log(`   ⏭️  Already existed: ${results.existing}`);
  console.log(`   ❌ Errors: ${results.errors.length}`);
  
  if (results.errors.length > 0) {
    console.log('\n⚠️  Errors:');
    results.errors.forEach(e => console.log(`   - ${e.company}: ${e.error}`));
  }

  console.log('\n✨ Company seeding completed!');
}

// Run the seed function
seedCompanies()
  .catch((e) => {
    console.error('Fatal error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
