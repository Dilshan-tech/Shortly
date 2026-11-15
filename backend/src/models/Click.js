import mongoose from 'mongoose';

const clickSchema = new mongoose.Schema(
  {
    id: {
      type: String,
      required: true,
      unique: true,
      index: true
    },
    urlId: {
      type: String,
      required: true,
      index: true
    },
    url: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Url',
      default: null,
      index: true
    },
    code: {
      type: String,
      required: true,
      index: true
    },
    anonymizedIp: {
      type: String,
      default: 'unknown'
    },
    isBot: {
      type: Boolean,
      default: false,
      index: true
    },
    userAgent: {
      type: String,
      default: ''
    },
    referrer: {
      type: String,
      default: 'Direct'
    },
    deviceCategory: {
      type: String,
      default: 'desktop',
      index: true
    },
    browser: {
      type: String,
      default: 'Other'
    },
    os: {
      type: String,
      default: 'Other'
    },
    visitorId: {
      type: String,
      default: null,
      index: true
    },
    country: {
      type: String,
      default: 'Unknown'
    },
    city: {
      type: String,
      default: 'Unknown'
    },
    timestamp: {
      type: Date,
      default: Date.now,
      index: true
    }
  },
  {
    timestamps: false,
    toJSON: {
      transform(doc, ret) {
        delete ret._id;
        delete ret.__v;
        delete ret.ip; // Privacy: ensure legacy raw IP is never exposed
        if (ret.timestamp instanceof Date) ret.timestamp = ret.timestamp.toISOString();
        return ret;
      }
    }
  }
);

// Compound indexes for high-performance aggregation and date-filtering
clickSchema.index({ urlId: 1, isBot: 1, timestamp: -1 });
clickSchema.index({ urlId: 1, isBot: 1, visitorId: 1, timestamp: -1 });
clickSchema.index({ code: 1, isBot: 1, timestamp: -1 });
clickSchema.index({ isBot: 1, timestamp: -1 });
clickSchema.index({ urlId: 1, visitorId: 1 });
clickSchema.index({ urlId: 1, country: 1 });
clickSchema.index({ urlId: 1, deviceCategory: 1 });
clickSchema.index({ urlId: 1, browser: 1 });
clickSchema.index({ urlId: 1, os: 1 });
clickSchema.index({ urlId: 1, referrer: 1 });

export const Click = mongoose.models.Click || mongoose.model('Click', clickSchema);
export default Click;
