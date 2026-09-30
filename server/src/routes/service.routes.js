const express = require('express');
const router = express.Router();
const { protect } = require('../middlewares/auth.middleware');
const { authorize } = require('../middlewares/role.middleware');
const Service = require('../models/Service');

// GET /api/services — public: list all services (with vendor info)
router.get('/', async (req, res, next) => {
  try {
    const services = await Service.find()
      .populate('vendorId', 'name email')
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
    const { name, price } = req.body;
    if (!name || !name.trim()) {
      return res.status(400).json({ message: 'Service name is required' });
    }
    const servicePrice = price !== undefined && Number(price) >= 0 ? Number(price) : 500;
    const service = await Service.create({
      name: name.trim(),
      price: servicePrice,
      vendorId: req.user._id
    });
    res.status(201).json(service);
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
