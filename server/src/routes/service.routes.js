const express = require('express');
const router = express.Router();
const { protect } = require('../middlewares/auth.middleware');
const { authorize } = require('../middlewares/role.middleware');
const Service = require('../models/Service');

// GET /api/services — public: list all services (with vendor info)
// Supports ?search=, ?category=, ?vendorId= filters
router.get('/', async (req, res, next) => {
  try {
    const { search, category, vendorId } = req.query;
    const filter = {};
    if (vendorId) filter.vendorId = vendorId;
    if (category) filter.category = category;
    if (search) {
      filter.name = { $regex: new RegExp(search, 'i') };
    }

    const services = await Service.find(filter)
      .populate('vendorId', 'name email businessName city area category')
      .sort({ createdAt: -1 });
    res.json(services);
  } catch (err) { next(err); }
});

// GET /api/services/mine — vendor's own services
router.get('/mine', protect, authorize('vendor'), async (req, res, next) => {
  try {
    const services = await Service.find({ vendorId: req.user._id }).sort({ createdAt: -1 });
    res.json(services);
  } catch (err) { next(err); }
});

// POST /api/services — vendor creates a service
router.post('/', protect, authorize('vendor'), async (req, res, next) => {
  try {
    const { name, price, description, category } = req.body;
    if (!name || !name.trim()) {
      return res.status(400).json({ message: 'Service name is required' });
    }
    const servicePrice = price !== undefined && Number(price) >= 0 ? Number(price) : 500;
    const service = await Service.create({
      name: name.trim(),
      price: servicePrice,
      description: description?.trim() || undefined,
      category: category || undefined,
      vendorId: req.user._id
    });
    res.status(201).json(service);
  } catch (err) { next(err); }
});

// PUT /api/services/:id — vendor updates a service
router.put('/:id', protect, authorize('vendor'), async (req, res, next) => {
  try {
    const service = await Service.findById(req.params.id);
    if (!service) return res.status(404).json({ message: 'Service not found' });
    if (String(service.vendorId) !== String(req.user._id)) {
      return res.status(403).json({ message: 'Not authorized' });
    }

    const { name, price, description, category } = req.body;
    if (name !== undefined) service.name = name.trim();
    if (price !== undefined) service.price = Number(price) >= 0 ? Number(price) : service.price;
    if (description !== undefined) service.description = description.trim();
    if (category !== undefined) service.category = category;

    await service.save();
    res.json(service);
  } catch (err) { next(err); }
});

// DELETE /api/services/:id — vendor deletes own service
router.delete('/:id', protect, authorize('vendor'), async (req, res, next) => {
  try {
    const service = await Service.findById(req.params.id);
    if (!service) return res.status(404).json({ message: 'Service not found' });
    if (String(service.vendorId) !== String(req.user._id)) {
      return res.status(403).json({ message: 'Not authorized' });
    }
    await service.deleteOne();
    res.json({ message: 'Service deleted' });
  } catch (err) { next(err); }
});

module.exports = router;
