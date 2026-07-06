import mongoose from 'mongoose';

const marketplaceOrderSchema = new mongoose.Schema(
  {
    listing: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'MarketplaceListing',
      required: true
    },
    buyer: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    seller: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    quantity: {
      type: Number,
      default: 1,
      min: 1
    },
    unitPrice: {
      type: Number,
      required: true,
      min: 0
    },
    totalPrice: {
      type: Number,
      required: true,
      min: 0
    },
    buyerMessage: {
      type: String,
      trim: true,
      maxlength: 300,
      default: ''
    },
    status: {
      type: String,
      enum: ['pending', 'accepted', 'rejected', 'completed', 'cancelled'],
      default: 'pending'
    }
  },
  { timestamps: true }
);

marketplaceOrderSchema.index({ buyer: 1, createdAt: -1 });
marketplaceOrderSchema.index({ seller: 1, createdAt: -1 });
marketplaceOrderSchema.index({ listing: 1, createdAt: -1 });

const MarketplaceOrder = mongoose.model('MarketplaceOrder', marketplaceOrderSchema);

export default MarketplaceOrder;
