const User = require('../models/User');
const Service = require('../models/Service');
const Slot = require('../models/Slot');
const bcrypt = require('bcrypt');

const SEED_VENDORS = [
  {
    name: "TechFix Repairs",
    businessName: "TechFix Repairs",
    category: "appliance-repair",
    email: "techfix@test.com",
    city: "Bengaluru",
    area: "Koramangala",
    phone: "9876543210",
    bio: "Certified electronics and appliance repair specialists.",
    services: [
      { name: "AC Servicing", price: 1200, category: "appliance-repair", description: "Filter clean, gas pressure check, and deep cooling coil wash." },
      { name: "Laptop Repair", price: 1500, category: "appliance-repair", description: "Motherboard, OS fix, and hardware diagnosis." },
      { name: "Phone Screen Replacement", price: 2000, category: "appliance-repair", description: "Original OEM display replacement with warranty." }
    ]
  },
  {
    name: "Raj Plumbing Services",
    businessName: "Raj Plumbing Services",
    category: "plumbing",
    email: "raj@test.com",
    city: "Bengaluru",
    area: "Indiranagar",
    phone: "9876543211",
    bio: "Quick-response plumbing, leakage, and bathroom fitting expert.",
    services: [
      { name: "Pipe Repair & Leakage", price: 600, category: "plumbing", description: "Emergency leak fixing and tap replacements." },
      { name: "Full Bathroom Fitting", price: 12000, category: "plumbing", description: "Sanitaryware, shower, and geyser installation." }
    ]
  },
  {
    name: "Priya's Beauty Studio",
    businessName: "Priya's Beauty Studio",
    category: "salon",
    email: "priya@test.com",
    city: "Bengaluru",
    area: "HSR Layout",
    phone: "9876543212",
    bio: "Bridal, hair care, and professional salon services.",
    services: [
      { name: "Bridal Makeup", price: 5000, category: "salon", description: "High-definition makeup with styling and draping." },
      { name: "Hair Styling & Cut", price: 1500, category: "salon", description: "Wash, haircut, and blow-dry." },
      { name: "Facial Treatment", price: 800, category: "salon", description: "Deep cleansing herbal facial." }
    ]
  },
  {
    name: "SparkClean Home Services",
    businessName: "SparkClean Home Services",
    category: "cleaning",
    email: "sparkclean@test.com",
    city: "Bengaluru",
    area: "Whitefield",
    phone: "9876543213",
    bio: "Complete deep home cleaning and kitchen sanitization.",
    services: [
      { name: "Deep Home Cleaning", price: 2500, category: "cleaning", description: "Full apartment sanitization, floor scrubbing, and windows." },
      { name: "Kitchen Cleaning", price: 900, category: "cleaning", description: "Degreasing chimneys, slabs, and cabinets." }
    ]
  },
  {
    name: "FitZone Personal Training",
    businessName: "FitZone Fitness",
    category: "tutor",
    email: "fitzone@test.com",
    city: "Bengaluru",
    area: "Jayanagar",
    phone: "9876543214",
    bio: "Personal trainer and yoga instructor with 8+ years experience.",
    services: [
      { name: "Personal Training Session", price: 1000, category: "tutor", description: "1-on-1 strength and conditioning workout." },
      { name: "Group Yoga Class", price: 400, category: "tutor", description: "Morning Hatha and Vinyasa flow session." }
    ]
  }
];

function generateSlotTimes() {
  const slots = [];
  const now = new Date();
  for (let day = 1; day <= 5; day++) {
    const targetDate = new Date(now);
    targetDate.setDate(targetDate.getDate() + day);

    const hours = [9, 12, 16];
    for (const h of hours) {
      const start = new Date(targetDate);
      start.setHours(h, 0, 0, 0);
      const end = new Date(start);
      end.setHours(h + 1);
      slots.push({ startTime: start, endTime: end });
    }
  }
  return slots;
}

async function autoSeedIfEmpty() {
  try {
    const count = await Service.countDocuments();
    if (count > 0) return;

    console.log('🌱 Database is empty. Auto-seeding initial vendors, services, and live slots...');
    const hashedPassword = await bcrypt.hash('Test@1234', 10);

    // 1. Seed Vendors & Services & Slots
    for (const vData of SEED_VENDORS) {
      let vendor = await User.findOne({ email: vData.email });
      if (!vendor) {
        vendor = await User.create({
          name: vData.name,
          businessName: vData.businessName,
          category: vData.category,
          email: vData.email,
          password: hashedPassword,
          role: 'vendor',
          city: vData.city,
          area: vData.area,
          phone: vData.phone,
          bio: vData.bio
        });
      }

      for (const sData of vData.services) {
        const service = await Service.create({
          name: sData.name,
          price: sData.price,
          category: sData.category,
          description: sData.description,
          vendorId: vendor._id
        });

        // Generate 15 upcoming slots for this service
        const slotTimes = generateSlotTimes();
        const slotDocs = slotTimes.map(st => ({
          vendorId: vendor._id,
          serviceId: service._id,
          startTime: st.startTime,
          endTime: st.endTime,
          status: 'available',
          isBlocked: false
        }));

        await Slot.insertMany(slotDocs);
      }
    }

    // 2. Seed Customer Accounts
    const customers = [
      { name: "Amit Kumar", email: "amit@test.com", password: hashedPassword, role: "customer" },
      { name: "Sneha Sharma", email: "sneha@test.com", password: hashedPassword, role: "customer" }
    ];

    for (const c of customers) {
      const existing = await User.findOne({ email: c.email });
      if (!existing) {
        await User.create(c);
      }
    }

    console.log('✅ Auto-seed completed successfully with vendors, services, and upcoming slots!');
  } catch (err) {
    console.error('⚠️ Auto-seed failed:', err.message);
  }
}

module.exports = { autoSeedIfEmpty };
