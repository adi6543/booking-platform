const User = require('../models/User');
const Service = require('../models/Service');
const Booking = require('../models/Booking');
const Review = require('../models/Review');
const mongoose = require('mongoose');

// ─── GET /api/vendors/:id ────────────────────────────────────────────────────
// Public: get vendor profile with services and rating summary
const getVendorProfile = async (req, res, next) => {
  try {
    const vendor = await User.findById(req.params.id).select('-password');
    if (!vendor || vendor.role !== 'vendor') {
      return res.status(404).json({ message: 'Vendor not found' });
    }

    const services = await Service.find({ vendorId: vendor._id }).sort({ createdAt: -1 });

    // Aggregate rating
    const ratingResult = await Review.aggregate([
      { $match: { vendorId: vendor._id } },
      {
        $group: {
          _id: null,
          averageRating: { $avg: '$rating' },
          totalReviews: { $sum: 1 }
        }
      }
    ]);

    const ratingData = ratingResult[0] || { averageRating: 0, totalReviews: 0 };

    res.json({
      vendor: {
        _id: vendor._id,
        name: vendor.name,
        email: vendor.email,
        phone: vendor.phone,
        businessName: vendor.businessName,
        businessDescription: vendor.businessDescription,
        category: vendor.category,
        city: vendor.city,
        area: vendor.area,
        pinCode: vendor.pinCode,
        createdAt: vendor.createdAt
      },
      services,
      rating: {
        average: Math.round((ratingData.averageRating || 0) * 10) / 10,
        total: ratingData.totalReviews || 0
      }
    });
  } catch (err) { next(err); }
};

// ─── PUT /api/vendors/profile ────────────────────────────────────────────────
// Vendor updates their own profile
const updateVendorProfile = async (req, res, next) => {
  try {
    const allowedFields = [
      'name', 'phone', 'businessName', 'businessDescription',
      'category', 'city', 'area', 'pinCode'
    ];

    const updates = {};
    for (const field of allowedFields) {
      if (req.body[field] !== undefined) {
        updates[field] = typeof req.body[field] === 'string' ? req.body[field].trim() : req.body[field];
      }
    }

    if (Object.keys(updates).length === 0) {
      return res.status(400).json({ message: 'No valid fields to update' });
    }

    const vendor = await User.findByIdAndUpdate(
      req.user._id,
      { $set: updates },
      { new: true, runValidators: true }
    ).select('-password');

    res.json({
      user: {
        _id: vendor._id,
        name: vendor.name,
        email: vendor.email,
        role: vendor.role,
        phone: vendor.phone,
        businessName: vendor.businessName,
        businessDescription: vendor.businessDescription,
        category: vendor.category,
        city: vendor.city,
        area: vendor.area,
        pinCode: vendor.pinCode,
        createdAt: vendor.createdAt
      }
    });
  } catch (err) { next(err); }
};

// ─── GET /api/vendors ────────────────────────────────────────────────────────
// Public: list all vendors with their rating summary and service count
const listVendors = async (req, res, next) => {
  try {
    const { category, city, search } = req.query;

    const filter = { role: 'vendor' };
    if (category) filter.category = category;
    if (city) filter.city = { $regex: new RegExp(city, 'i') };
    if (search) {
      filter.$or = [
        { name: { $regex: new RegExp(search, 'i') } },
        { businessName: { $regex: new RegExp(search, 'i') } }
      ];
    }

    const vendors = await User.find(filter)
      .select('-password')
      .sort({ createdAt: -1 });

    // Enrich with service count and rating for each vendor
    const enrichedVendors = await Promise.all(vendors.map(async (v) => {
      const [serviceCount, ratingResult] = await Promise.all([
        Service.countDocuments({ vendorId: v._id }),
        Review.aggregate([
          { $match: { vendorId: v._id } },
          {
            $group: {
              _id: null,
              averageRating: { $avg: '$rating' },
              totalReviews: { $sum: 1 }
            }
          }
        ])
      ]);

      const rd = ratingResult[0] || { averageRating: 0, totalReviews: 0 };

      return {
        _id: v._id,
        name: v.name,
        businessName: v.businessName,
        category: v.category,
        city: v.city,
        area: v.area,
        serviceCount,
        rating: {
          average: Math.round((rd.averageRating || 0) * 10) / 10,
          total: rd.totalReviews || 0
        }
      };
    }));

    res.json(enrichedVendors);
  } catch (err) { next(err); }
};

// ─── GET /api/vendors/dashboard/stats ────────────────────────────────────────
// Vendor's own analytics dashboard
const getVendorDashboardStats = async (req, res, next) => {
  try {
    const vendorId = req.user._id;
    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const weekStart = new Date(todayStart);
    weekStart.setDate(weekStart.getDate() - 7);
    const monthStart = new Date(todayStart);
    monthStart.setDate(monthStart.getDate() - 30);

    const [
      totalBookings,
      confirmedBookings,
      todayBookings,
      weekBookings,
      totalRevenue,
      weekRevenue,
      ratingResult,
      recentBookings
    ] = await Promise.all([
      Booking.countDocuments({ vendorId }),
      Booking.countDocuments({ vendorId, status: 'confirmed' }),
      Booking.countDocuments({ vendorId, status: 'confirmed', createdAt: { $gte: todayStart } }),
      Booking.countDocuments({ vendorId, status: 'confirmed', createdAt: { $gte: weekStart } }),
      Booking.aggregate([
        { $match: { vendorId, paymentStatus: 'paid' } },
        { $group: { _id: null, total: { $sum: '$amount' } } }
      ]),
      Booking.aggregate([
        { $match: { vendorId, paymentStatus: 'paid', createdAt: { $gte: weekStart } } },
        { $group: { _id: null, total: { $sum: '$amount' } } }
      ]),
      Review.aggregate([
        { $match: { vendorId } },
        { $group: { _id: null, avg: { $avg: '$rating' }, count: { $sum: 1 } } }
      ]),
      Booking.find({ vendorId, status: 'confirmed' })
        .populate('customerId', 'name')
        .populate('serviceId', 'name price')
        .populate('slotId', 'startTime endTime')
        .sort({ createdAt: -1 })
        .limit(5)
    ]);

    const cancelledCount = await Booking.countDocuments({ vendorId, status: 'cancelled' });

    res.json({
      totalBookings,
      confirmedBookings,
      todayBookings,
      weekBookings,
      totalRevenue: (totalRevenue[0]?.total || 0) / 100, // Convert paise to rupees
      weekRevenue: (weekRevenue[0]?.total || 0) / 100,
      averageRating: Math.round((ratingResult[0]?.avg || 0) * 10) / 10,
      totalReviews: ratingResult[0]?.count || 0,
      cancellationRate: totalBookings > 0 ? Math.round((cancelledCount / totalBookings) * 100) : 0,
      recentBookings
    });
  } catch (err) { next(err); }
};

module.exports = {
  getVendorProfile,
  updateVendorProfile,
  listVendors,
  getVendorDashboardStats
};
