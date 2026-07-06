import mongoose from 'mongoose';

const serviceRequestSchema = new mongoose.Schema(
  {
    requester: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    serviceListing: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'MarketplaceListing',
      default: null
    },
    serviceType: {
      type: String,
      required: true,
      trim: true,
      maxlength: 100
    },
    notes: {
      type: String,
      trim: true,
      maxlength: 500,
      default: ''
    },
    status: {
      type: String,
      enum: ['pending', 'accepted', 'completed', 'cancelled'],
      default: 'pending'
    },
    assignedTo: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null
    },
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
      }
    }
  },
  { timestamps: true }
);

serviceRequestSchema.index({ requester: 1, createdAt: -1 });
serviceRequestSchema.index({ status: 1, createdAt: -1 });
serviceRequestSchema.index({ location: '2dsphere' });

const ServiceRequest = mongoose.model('ServiceRequest', serviceRequestSchema);

export default ServiceRequest;
