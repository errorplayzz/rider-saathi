import express from 'express';
import { protect } from '../middleware/auth.js';
import User from '../models/User.js';
import MarketplaceListing from '../models/MarketplaceListing.js';
import MarketplaceOrder from '../models/MarketplaceOrder.js';
import ServiceRequest from '../models/ServiceRequest.js';
import RiderHelpRequest from '../models/RiderHelpRequest.js';

const router = express.Router();

const defaultSeedListings = [
  {
    title: 'DOT Helmet Pro X1',
    category: 'product',
    marketType: 'retail',
    itemKind: 'accessory',
    subType: 'helmet',
    condition: 'new',
    description: 'Certified full-face helmet with anti-fog visor.',
    price: 3499,
    quantity: 25,
    rating: 4.7,
    reviewCount: 142,
    tags: ['helmet', 'safety'],
    location: { coordinates: [77.209, 28.6139], city: 'Delhi', state: 'Delhi' },
    provider: { name: 'Rider Safe Gear', sellerType: 'brand' }
  },
  {
    title: 'Riding Gloves ArmorFit',
    category: 'product',
    marketType: 'retail',
    itemKind: 'accessory',
    subType: 'gloves',
    condition: 'new',
    description: 'Breathable gloves with knuckle protection.',
    price: 899,
    quantity: 40,
    rating: 4.5,
    reviewCount: 86,
    tags: ['gloves', 'protection'],
    location: { coordinates: [77.209, 28.6139], city: 'Delhi', state: 'Delhi' },
    provider: { name: 'Moto Essentials', sellerType: 'local_shop' }
  },
  {
    title: 'Royal Enfield Classic 350 (Pre-Owned)',
    category: 'product',
    marketType: 'resale',
    itemKind: 'bike',
    subType: 'motorcycle',
    condition: 'good',
    description: 'Single-owner bike, serviced recently, insurance valid.',
    price: 132000,
    quantity: 1,
    negotiable: true,
    rating: 4.8,
    reviewCount: 24,
    tags: ['bike', 'resale', 'royal-enfield'],
    location: { coordinates: [77.212, 28.622], city: 'Delhi', state: 'Delhi' },
    provider: { name: 'Verified Rider Seller', sellerType: 'independent_helper' }
  },
  {
    title: 'Bajaj Pulsar Front Disc Assembly',
    category: 'product',
    marketType: 'resale',
    itemKind: 'part',
    subType: 'brake_disc',
    condition: 'like_new',
    description: 'Original front disc assembly, barely used.',
    price: 2800,
    quantity: 1,
    negotiable: true,
    rating: 4.4,
    reviewCount: 9,
    tags: ['part', 'disc', 'pulsar'],
    location: { coordinates: [77.198, 28.612], city: 'Delhi', state: 'Delhi' },
    provider: { name: 'PartsHub Local', sellerType: 'local_shop' }
  },
  {
    title: 'Nearby Mechanic - Raj Workshop',
    category: 'service',
    itemKind: 'service',
    subType: 'mechanic',
    description: 'General bike service and on-road troubleshooting.',
    price: 499,
    rating: 4.6,
    reviewCount: 211,
    tags: ['mechanic', 'repair'],
    location: { coordinates: [77.215, 28.62], city: 'Delhi', state: 'Delhi', address: 'Karol Bagh' },
    provider: { name: 'Raj Workshop', sellerType: 'local_shop', phone: '+91-9999990001' }
  },
  {
    title: 'Puncture Help Van',
    category: 'service',
    itemKind: 'service',
    subType: 'puncture',
    description: 'Mobile puncture assistance for two-wheelers.',
    price: 199,
    rating: 4.4,
    reviewCount: 98,
    tags: ['puncture', 'roadside'],
    location: { coordinates: [77.19, 28.607], city: 'Delhi', state: 'Delhi', address: 'Connaught Place' },
    provider: { name: 'QuickFix Riders', sellerType: 'independent_helper', phone: '+91-9999990002' }
  },
  {
    title: 'Nearest Petrol Pump - HP Fuel Hub',
    category: 'essential',
    itemKind: 'essential',
    subType: 'petrol',
    description: '24x7 petrol pump with restroom and air check.',
    price: 0,
    rating: 4.2,
    reviewCount: 54,
    tags: ['petrol', 'essentials'],
    location: { coordinates: [77.201, 28.615], city: 'Delhi', state: 'Delhi', address: 'Minto Road' },
    provider: { name: 'HP Fuel Hub', sellerType: 'system' }
  },
  {
    title: 'Nearest EV Charging - ChargePoint Mini',
    category: 'essential',
    itemKind: 'essential',
    subType: 'ev_charging',
    description: 'Fast charging point for electric bikes and scooters.',
    price: 0,
    rating: 4.3,
    reviewCount: 37,
    tags: ['ev', 'charging'],
    location: { coordinates: [77.222, 28.61], city: 'Delhi', state: 'Delhi', address: 'ITO' },
    provider: { name: 'ChargePoint Network', sellerType: 'system' }
  },
  {
    title: 'Emergency Ambulance Link',
    category: 'emergency',
    itemKind: 'emergency',
    subType: 'ambulance',
    description: 'Quick ambulance coordination partner.',
    price: 0,
    rating: 4.8,
    reviewCount: 66,
    tags: ['ambulance', 'emergency'],
    location: { coordinates: [77.23, 28.63], city: 'Delhi', state: 'Delhi', address: 'Civil Lines' },
    provider: { name: 'CityCare Emergency', sellerType: 'system', phone: '+91-102' }
  },
  {
    title: 'Emergency Towing Unit',
    category: 'emergency',
    itemKind: 'emergency',
    subType: 'towing',
    description: 'Two-wheeler towing for breakdown and accident support.',
    price: 799,
    rating: 4.5,
    reviewCount: 44,
    tags: ['towing', 'emergency'],
    location: { coordinates: [77.185, 28.625], city: 'Delhi', state: 'Delhi', address: 'Patel Nagar' },
    provider: { name: 'RoadLift Services', sellerType: 'system', phone: '+91-9999990003' }
  }
];

const ensureSeedData = async () => {
  const existing = await MarketplaceListing.countDocuments();
  if (existing > 0) return;
  await MarketplaceListing.insertMany(defaultSeedListings);
};

const buildListingQuery = ({ type, q, marketType, itemKind, minPrice, maxPrice, city, state, sellerId }) => {
  const query = { isActive: true };
  if (type && type !== 'all') {
    const typeMap = {
      products: 'product',
      services: 'service',
      essentials: 'essential',
      emergency: 'emergency',
      product: 'product',
      service: 'service',
      essential: 'essential'
    };
    query.category = typeMap[type] || type;
  }

  if (marketType && marketType !== 'all') {
    query.marketType = marketType;
  }

  if (itemKind && itemKind !== 'all') {
    query.itemKind = itemKind;
  }

  if (city && city.trim()) {
    query['location.city'] = { $regex: city.trim(), $options: 'i' };
  }

  if (state && state.trim()) {
    query['location.state'] = { $regex: state.trim(), $options: 'i' };
  }

  if (sellerId) {
    query['provider.user'] = sellerId;
  }

  if (minPrice || maxPrice) {
    query.price = {};
    if (minPrice !== undefined && minPrice !== null && minPrice !== '') {
      query.price.$gte = Number(minPrice) || 0;
    }
    if (maxPrice !== undefined && maxPrice !== null && maxPrice !== '') {
      query.price.$lte = Number(maxPrice) || 0;
    }
  }

  if (q && q.trim()) {
    const safe = q.trim();
    query.$or = [
      { title: { $regex: safe, $options: 'i' } },
      { subType: { $regex: safe, $options: 'i' } },
      { tags: { $elemMatch: { $regex: safe, $options: 'i' } } }
    ];
  }

  return query;
};

// Overview payload for Marketplace page
router.get('/overview', protect, async (req, res) => {
  try {
    await ensureSeedData();

    const [products, services, essentials, emergency, rewards] = await Promise.all([
      MarketplaceListing.find({ category: 'product', isActive: true }).sort({ rating: -1 }).limit(6),
      MarketplaceListing.find({ category: 'service', isActive: true }).sort({ rating: -1 }).limit(6),
      MarketplaceListing.find({ category: 'essential', isActive: true }).sort({ rating: -1 }).limit(8),
      MarketplaceListing.find({ category: 'emergency', isActive: true }).sort({ rating: -1 }).limit(6),
      User.findById(req.user._id).select('stats.rewardPoints stats.helpCount')
    ]);

    const openHelpRequests = await RiderHelpRequest.find({ status: 'open' })
      .populate('requester', 'name username')
      .sort({ createdAt: -1 })
      .limit(20);

    return res.json({
      success: true,
      data: {
        products,
        services,
        essentials,
        emergency,
        openHelpRequests,
        rewards: {
          points: rewards?.stats?.rewardPoints || 0,
          helpCount: rewards?.stats?.helpCount || 0
        }
      }
    });
  } catch (error) {
    return res.status(500).json({ success: false, error: error.message });
  }
});

// Generic listings endpoint with type/search
router.get('/listings', protect, async (req, res) => {
  try {
    await ensureSeedData();

    const {
      type = 'all',
      q = '',
      limit = 24,
      marketType = 'all',
      itemKind = 'all',
      minPrice,
      maxPrice,
      city,
      state
    } = req.query;

    const query = buildListingQuery({
      type,
      q,
      marketType,
      itemKind,
      minPrice,
      maxPrice,
      city,
      state
    });

    const listings = await MarketplaceListing.find(query)
      .sort({ rating: -1, createdAt: -1 })
      .limit(Math.min(Number(limit) || 24, 100));

    return res.json({ success: true, data: listings });
  } catch (error) {
    return res.status(500).json({ success: false, error: error.message });
  }
});

router.post('/listings', protect, async (req, res) => {
  try {
    const user = await User.findById(req.user._id);
    if (!user || !user.isVerified) {
      return res.status(403).json({ success: false, error: 'Only verified users can create marketplace listings.' });
    }
    const {
      title,
      description,
      price,
      marketType = 'resale',
      itemKind = 'accessory',
      subType,
      condition = 'good',
      quantity = 1,
      negotiable = false,
      tags = [],
      imageUrl,
      city,
      state,
      address
    } = req.body;

    if (!title || !title.trim()) {
      return res.status(400).json({ success: false, error: 'Listing title is required' });
    }

    if (price === undefined || price === null || Number(price) < 0) {
      return res.status(400).json({ success: false, error: 'Valid price is required' });
    }

    const seller = await User.findById(req.user._id).select('name phone state city');

    const listing = await MarketplaceListing.create({
      title: title.trim(),
      category: 'product',
      marketType,
      itemKind,
      subType: (subType || '').trim(),
      description: (description || '').trim(),
      price: Number(price),
      condition,
      quantity: Number(quantity) || 1,
      negotiable: !!negotiable,
      tags: Array.isArray(tags) ? tags : String(tags || '').split(',').map((x) => x.trim()).filter(Boolean),
      imageUrl: imageUrl || null,
      location: {
        type: 'Point',
        coordinates: [77.209, 28.6139],
        address: (address || '').trim(),
        city: (city || '').trim(),
        state: (state || seller?.state || '').trim()
      },
      provider: {
        user: req.user._id,
        name: seller?.name || 'Marketplace Seller',
        phone: seller?.phone || '',
        sellerType: 'independent_helper'
      }
    });

    return res.status(201).json({ success: true, data: listing, message: 'Listing created successfully' });
  } catch (error) {
    return res.status(500).json({ success: false, error: error.message });
  }
});

router.get('/listings/mine', protect, async (req, res) => {
  try {
    const listings = await MarketplaceListing.find({
      category: 'product',
      'provider.user': req.user._id
    }).sort({ createdAt: -1 });

    return res.json({ success: true, data: listings });
  } catch (error) {
    return res.status(500).json({ success: false, error: error.message });
  }
});

router.put('/listings/:listingId', protect, async (req, res) => {
  try {
    const { listingId } = req.params;
    const listing = await MarketplaceListing.findById(listingId);

    if (!listing) {
      return res.status(404).json({ success: false, error: 'Listing not found' });
    }

    if (listing?.provider?.user?.toString() !== req.user._id.toString()) {
      return res.status(403).json({ success: false, error: 'Not authorized to update this listing' });
    }

    const allowed = ['title', 'description', 'price', 'condition', 'quantity', 'negotiable', 'subType', 'imageUrl'];
    allowed.forEach((field) => {
      if (req.body[field] !== undefined) {
        listing[field] = req.body[field];
      }
    });

    if (req.body.city !== undefined) listing.location.city = req.body.city;
    if (req.body.state !== undefined) listing.location.state = req.body.state;
    if (req.body.address !== undefined) listing.location.address = req.body.address;

    await listing.save();
    return res.json({ success: true, data: listing, message: 'Listing updated' });
  } catch (error) {
    return res.status(500).json({ success: false, error: error.message });
  }
});

router.delete('/listings/:listingId', protect, async (req, res) => {
  try {
    const { listingId } = req.params;
    const listing = await MarketplaceListing.findById(listingId);

    if (!listing) {
      return res.status(404).json({ success: false, error: 'Listing not found' });
    }

    if (listing?.provider?.user?.toString() !== req.user._id.toString()) {
      return res.status(403).json({ success: false, error: 'Not authorized to delete this listing' });
    }

    listing.isActive = false;
    await listing.save();

    return res.json({ success: true, message: 'Listing removed from marketplace' });
  } catch (error) {
    return res.status(500).json({ success: false, error: error.message });
  }
});

router.post('/orders', protect, async (req, res) => {
  try {
    const { listingId, quantity = 1, buyerMessage = '' } = req.body;

    const listing = await MarketplaceListing.findById(listingId);
    if (!listing || !listing.isActive || listing.category !== 'product') {
      return res.status(404).json({ success: false, error: 'Product listing not found' });
    }

    if (!listing.provider?.user) {
      return res.status(400).json({ success: false, error: 'This listing cannot accept orders right now' });
    }

    if (listing.provider.user.toString() === req.user._id.toString()) {
      return res.status(400).json({ success: false, error: 'You cannot buy your own listing' });
    }

    const qty = Math.max(1, Number(quantity) || 1);
    const unitPrice = Number(listing.price) || 0;

    const order = await MarketplaceOrder.create({
      listing: listing._id,
      buyer: req.user._id,
      seller: listing.provider.user,
      quantity: qty,
      unitPrice,
      totalPrice: unitPrice * qty,
      buyerMessage: String(buyerMessage || '').trim()
    });

    const populated = await MarketplaceOrder.findById(order._id)
      .populate('listing', 'title price imageUrl')
      .populate('buyer', 'name username')
      .populate('seller', 'name username');

    return res.status(201).json({ success: true, data: populated, message: 'Order placed successfully' });
  } catch (error) {
    return res.status(500).json({ success: false, error: error.message });
  }
});

router.get('/orders/mine', protect, async (req, res) => {
  try {
    const orders = await MarketplaceOrder.find({ buyer: req.user._id })
      .populate('listing', 'title price imageUrl itemKind marketType')
      .populate('seller', 'name username phone')
      .sort({ createdAt: -1 })
      .limit(100);

    return res.json({ success: true, data: orders });
  } catch (error) {
    return res.status(500).json({ success: false, error: error.message });
  }
});

router.get('/orders/seller', protect, async (req, res) => {
  try {
    const orders = await MarketplaceOrder.find({ seller: req.user._id })
      .populate('listing', 'title price imageUrl itemKind marketType')
      .populate('buyer', 'name username phone')
      .sort({ createdAt: -1 })
      .limit(100);

    return res.json({ success: true, data: orders });
  } catch (error) {
    return res.status(500).json({ success: false, error: error.message });
  }
});

router.put('/orders/:orderId/status', protect, async (req, res) => {
  try {
    const { orderId } = req.params;
    const { status } = req.body;

    const validStatuses = ['accepted', 'rejected', 'completed', 'cancelled'];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({ success: false, error: 'Invalid order status' });
    }

    const order = await MarketplaceOrder.findById(orderId);
    if (!order) {
      return res.status(404).json({ success: false, error: 'Order not found' });
    }

    const isSeller = order.seller.toString() === req.user._id.toString();
    const isBuyer = order.buyer.toString() === req.user._id.toString();

    if (!isSeller && !isBuyer) {
      return res.status(403).json({ success: false, error: 'Not authorized to update this order' });
    }

    if (isBuyer && status !== 'cancelled') {
      return res.status(403).json({ success: false, error: 'Buyer can only cancel order' });
    }

    order.status = status;
    await order.save();

    return res.json({ success: true, data: order, message: 'Order status updated' });
  } catch (error) {
    return res.status(500).json({ success: false, error: error.message });
  }
});

// Create a service request (mechanic/towing etc.)
router.post('/service-requests', protect, async (req, res) => {
  try {
    const { listingId, serviceType, notes, latitude, longitude, address } = req.body;

    const listing = listingId ? await MarketplaceListing.findById(listingId) : null;
    const resolvedType = serviceType || listing?.subType || listing?.title || 'general_service';

    const request = await ServiceRequest.create({
      requester: req.user._id,
      serviceListing: listing?._id || null,
      serviceType: resolvedType,
      notes: notes || '',
      location: {
        type: 'Point',
        coordinates: [Number(longitude) || 77.209, Number(latitude) || 28.6139],
        address: address || ''
      }
    });

    const populated = await ServiceRequest.findById(request._id)
      .populate('requester', 'name username')
      .populate('serviceListing', 'title subType provider');

    return res.status(201).json({ success: true, data: populated, message: 'Service request created' });
  } catch (error) {
    return res.status(500).json({ success: false, error: error.message });
  }
});

router.get('/service-requests/mine', protect, async (req, res) => {
  try {
    const myRequests = await ServiceRequest.find({ requester: req.user._id })
      .populate('serviceListing', 'title subType provider')
      .sort({ createdAt: -1 })
      .limit(50);

    return res.json({ success: true, data: myRequests });
  } catch (error) {
    return res.status(500).json({ success: false, error: error.message });
  }
});

router.post('/service-requests/:requestId/accept', protect, async (req, res) => {
  try {
    const { requestId } = req.params;
    const request = await ServiceRequest.findById(requestId);

    if (!request) {
      return res.status(404).json({ success: false, error: 'Service request not found' });
    }

    if (request.status !== 'pending') {
      return res.status(400).json({ success: false, error: 'Service request is not pending' });
    }

    request.status = 'accepted';
    request.assignedTo = req.user._id;
    await request.save();

    return res.json({ success: true, data: request, message: 'Service request accepted' });
  } catch (error) {
    return res.status(500).json({ success: false, error: error.message });
  }
});

// Rider-to-rider help
router.post('/rider-help', protect, async (req, res) => {
  try {
    const { title, description, latitude, longitude, address } = req.body;

    if (!title || !title.trim()) {
      return res.status(400).json({ success: false, error: 'Title is required' });
    }

    const helpRequest = await RiderHelpRequest.create({
      requester: req.user._id,
      title: title.trim(),
      description: (description || '').trim(),
      location: {
        type: 'Point',
        coordinates: [Number(longitude) || 77.209, Number(latitude) || 28.6139],
        address: address || ''
      }
    });

    const populated = await RiderHelpRequest.findById(helpRequest._id).populate('requester', 'name username');
    return res.status(201).json({ success: true, data: populated, message: 'Help request posted' });
  } catch (error) {
    return res.status(500).json({ success: false, error: error.message });
  }
});

router.get('/rider-help/nearby', protect, async (req, res) => {
  try {
    const requests = await RiderHelpRequest.find({
      status: { $in: ['open', 'accepted'] },
      requester: { $ne: req.user._id }
    })
      .populate('requester', 'name username state')
      .populate('helper', 'name username')
      .sort({ createdAt: -1 })
      .limit(50);

    return res.json({ success: true, data: requests });
  } catch (error) {
    return res.status(500).json({ success: false, error: error.message });
  }
});

router.post('/rider-help/:requestId/accept', protect, async (req, res) => {
  try {
    const { requestId } = req.params;

    const helpRequest = await RiderHelpRequest.findById(requestId);
    if (!helpRequest) {
      return res.status(404).json({ success: false, error: 'Help request not found' });
    }

    if (helpRequest.status !== 'open') {
      return res.status(400).json({ success: false, error: 'Help request is not open' });
    }

    helpRequest.status = 'accepted';
    helpRequest.helper = req.user._id;
    await helpRequest.save();

    return res.json({ success: true, data: helpRequest, message: 'Help request accepted' });
  } catch (error) {
    return res.status(500).json({ success: false, error: error.message });
  }
});

router.post('/rider-help/:requestId/resolve', protect, async (req, res) => {
  try {
    const { requestId } = req.params;

    const helpRequest = await RiderHelpRequest.findById(requestId);
    if (!helpRequest) {
      return res.status(404).json({ success: false, error: 'Help request not found' });
    }

    if (helpRequest.status !== 'accepted') {
      return res.status(400).json({ success: false, error: 'Only accepted requests can be resolved' });
    }

    const allowedUserIds = [helpRequest.requester?.toString(), helpRequest.helper?.toString()];
    if (!allowedUserIds.includes(req.user._id.toString())) {
      return res.status(403).json({ success: false, error: 'Not authorized to resolve this request' });
    }

    helpRequest.status = 'resolved';
    await helpRequest.save();

    if (helpRequest.helper) {
      await User.findByIdAndUpdate(helpRequest.helper, {
        $inc: { 'stats.helpCount': 1, 'stats.rewardPoints': 50 }
      });
    }

    return res.json({ success: true, data: helpRequest, message: 'Help request resolved. Rewards credited.' });
  } catch (error) {
    return res.status(500).json({ success: false, error: error.message });
  }
});

router.get('/rewards', protect, async (req, res) => {
  try {
    const user = await User.findById(req.user._id).select('stats.rewardPoints stats.helpCount');
    return res.json({
      success: true,
      data: {
        points: user?.stats?.rewardPoints || 0,
        helpCount: user?.stats?.helpCount || 0,
        tiers: [
          { label: 'Bronze', min: 0, benefit: 'Basic rider coupons' },
          { label: 'Silver', min: 300, benefit: '10% service discount' },
          { label: 'Gold', min: 700, benefit: 'Free emergency priority booking' }
        ]
      }
    });
  } catch (error) {
    return res.status(500).json({ success: false, error: error.message });
  }
});

router.post('/seller/register', protect, async (req, res) => {
  try {
    const { shopName, phone, category, city, state, bio } = req.body;

    if (!shopName || !category) {
      return res.status(400).json({ success: false, error: 'Shop name and category are required' });
    }

    const updatedUser = await User.findByIdAndUpdate(
      req.user._id,
      {
        $set: {
          sellerProfile: {
            isSeller: true,
            shopName: shopName.trim(),
            phone: (phone || '').trim(),
            category: category.trim(),
            city: (city || '').trim(),
            state: (state || '').trim(),
            bio: (bio || '').trim(),
            approved: true,
            updatedAt: new Date()
          }
        }
      },
      { new: true }
    ).select('sellerProfile');

    return res.status(201).json({ success: true, data: updatedUser?.sellerProfile, message: 'Seller profile created' });
  } catch (error) {
    return res.status(500).json({ success: false, error: error.message });
  }
});

export default router;
