import mongoose from 'mongoose';

const liveLocationSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    unique: true,
    index: true
  },
  location: {
    type: {
      type: String,
      enum: ['Point'],
      default: 'Point',
      required: true
    },
    coordinates: {
      type: [Number], // [longitude, latitude]
      required: true,
      validate: {
        validator: function(coords) {
          return coords.length === 2 &&
                 coords[0] >= -180 && coords[0] <= 180 && // longitude
                 coords[1] >= -90 && coords[1] <= 90;    // latitude
        },
        message: 'Invalid coordinates format [lng, lat]'
      }
    }
  },
  heading: {
    type: Number, // 0-360 degrees
    min: 0,
    max: 360,
    default: 0
  },
  speed: {
    type: Number, // km/h
    min: 0,
    default: 0
  },
  accuracy: {
    type: Number, // meters
    default: 10
  },
  visibility: {
    visibleToFriends: {
      type: Boolean,
      default: true
    },
    visibleToNearby: {
      type: Boolean,
      default: true
    },
    emergencyMode: {
      type: Boolean,
      default: false
    }
  },
  status: {
    type: String,
    enum: ['idle', 'moving', 'stopped'],
    default: 'idle'
  },
  lastUpdateSource: {
    type: String,
    enum: ['gps', 'network', 'manual'],
    default: 'gps'
  }
}, {
  timestamps: true
});

// GeoJSON 2dsphere index for radius queries
liveLocationSchema.index({ location: '2dsphere' });

// TTL index - remove stale locations after 5 minutes of inactivity
liveLocationSchema.index({ updatedAt: 1 }, { expireAfterSeconds: 300 });

// Virtual for latitude
liveLocationSchema.virtual('latitude').get(function() {
  return this.location.coordinates[1];
});

// Virtual for longitude
liveLocationSchema.virtual('longitude').get(function() {
  return this.location.coordinates[0];
});

// Method to update location
liveLocationSchema.methods.updatePosition = function(lat, lng, heading = null, speed = null) {
  this.location.coordinates = [lng, lat];
  if (heading !== null) this.heading = heading;
  if (speed !== null) {
    this.speed = speed;
    this.status = speed > 5 ? 'moving' : speed > 0 ? 'stopped' : 'idle';
  }
  return this.save();
};

// Static method to find riders within radius
liveLocationSchema.statics.findNearby = async function(lat, lng, radiusKm, options = {}) {
  const radiusMeters = radiusKm * 1000;
  
  const query = {
    location: {
      $nearSphere: {
        $geometry: {
          type: 'Point',
          coordinates: [lng, lat]
        },
        $maxDistance: radiusMeters
      }
    }
  };

  // Apply visibility filters
  if (options.visibleOnly !== false) {
    query['visibility.visibleToNearby'] = true;
  }

  // Exclude specific user
  if (options.excludeUserId) {
    query.userId = { $ne: options.excludeUserId };
  }

  return this.find(query)
    .populate('userId', 'name email bike avatar isOnline')
    .select('-__v')
    .lean();
};

// Static method to get rider by userId
liveLocationSchema.statics.findByUserId = function(userId) {
  return this.findOne({ userId })
    .populate('userId', 'name email bike avatar isOnline')
    .lean();
};

const LiveLocation = mongoose.model('LiveLocation', liveLocationSchema);

export default LiveLocation;
