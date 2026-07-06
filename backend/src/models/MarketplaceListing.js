import mongoose from 'mongoose';

const marketplaceListingSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: true,
      trim: true,
      maxlength: 120
    },
    category: {
      type: String,
      enum: ['product', 'service', 'essential', 'emergency'],
      required: true
    },
    marketType: {
      type: String,
      enum: ['retail', 'resale'],
      default: 'retail'
    },
    itemKind: {
      type: String,
      enum: ['bike', 'accessory', 'part', 'service', 'essential', 'emergency'],
      default: 'accessory'
    },
    subType: {
      type: String,
      trim: true,
      maxlength: 80
    },
    condition: {
      type: String,
      enum: ['new', 'like_new', 'good', 'fair', 'used'],
      default: 'new'
    },
    description: {
      type: String,
      trim: true,
      maxlength: 500
    },
    imageUrl: {
      type: String,
      trim: true,
      default: null
    },
    price: {
      type: Number,
      default: 0,
      min: 0
    },
    currency: {
      type: String,
      default: 'INR'
    },
    rating: {
      type: Number,
      default: 4.4,
      min: 0,
      max: 5
    },
    reviewCount: {
      type: Number,
      default: 0,
      min: 0
    },
    quantity: {
      type: Number,
      default: 1,
      min: 0
    },
    negotiable: {
      type: Boolean,
      default: false
    },
    tags: [{
      type: String,
      trim: true
    }],
    location: {
      type: {
        type: String,
        enum: ['Point'],
        default: 'Point'
      },
      coordinates: {
        type: [Number],
        default: [77.209, 28.6139]
      },
      address: {
        type: String,
        trim: true,
        default: ''
      },
      city: {
        type: String,
        trim: true,
        default: ''
      },
      state: {
        type: String,
        trim: true,
        default: ''
      }
    },
    provider: {
      user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        default: null
      },
      name: {
        type: String,
        trim: true,
        default: 'Rider Saathi Partner'
      },
      phone: {
        type: String,
        trim: true,
        default: ''
      },
      sellerType: {
        type: String,
        enum: ['brand', 'local_shop', 'independent_helper', 'system'],
        default: 'system'
      }
    },
    isActive: {
      type: Boolean,
      default: true
    }
  },
  { timestamps: true }
);

marketplaceListingSchema.index({ category: 1, isActive: 1 });
marketplaceListingSchema.index({ marketType: 1, itemKind: 1, isActive: 1 });
marketplaceListingSchema.index({ location: '2dsphere' });
marketplaceListingSchema.index({ title: 'text', description: 'text', tags: 'text', subType: 'text' });

const MarketplaceListing = mongoose.model('MarketplaceListing', marketplaceListingSchema);

export default MarketplaceListing;
