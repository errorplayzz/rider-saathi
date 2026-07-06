import mongoose from 'mongoose';

const riderHelpRequestSchema = new mongoose.Schema(
  {
    requester: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    helper: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null
    },
    title: {
      type: String,
      required: true,
      trim: true,
      maxlength: 120
    },
    description: {
      type: String,
      trim: true,
      maxlength: 500,
      default: ''
    },
    status: {
      type: String,
      enum: ['open', 'accepted', 'resolved', 'cancelled'],
      default: 'open'
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

riderHelpRequestSchema.index({ requester: 1, createdAt: -1 });
riderHelpRequestSchema.index({ status: 1, createdAt: -1 });
riderHelpRequestSchema.index({ location: '2dsphere' });

const RiderHelpRequest = mongoose.model('RiderHelpRequest', riderHelpRequestSchema);

export default RiderHelpRequest;
