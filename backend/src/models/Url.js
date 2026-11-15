import mongoose from 'mongoose';

const urlSchema = new mongoose.Schema(
  {
    // String UUID for stable legacy compatibility and O(1) external lookups
    id: {
      type: String,
      required: true,
      unique: true,
      index: true
    },
    code: {
      type: String,
      required: [true, 'Short code is required'],
      unique: true,
      trim: true,
      index: true
    },
    longUrl: {
      type: String,
      required: [true, 'Destination URL is required'],
      trim: true
    },
    title: {
      type: String,
      default: '',
      trim: true,
      maxlength: [200, 'Title cannot exceed 200 characters']
    },
    customAlias: {
      type: String,
      default: null,
      trim: true,
      sparse: true,
      index: true
    },
    passwordHash: {
      type: String,
      default: null
    },
    isPasswordProtected: {
      type: Boolean,
      default: false
    },
    expiresAt: {
      type: Date,
      default: null
    },
    clickLimit: {
      type: Number,
      default: null,
      min: [1, 'Click limit must be at least 1']
    },
    isOneTimeUse: {
      type: Boolean,
      default: false
    },
    isActive: {
      type: Boolean,
      default: true,
      index: true
    },
    clicks: {
      type: Number,
      default: 0,
      min: [0, 'Clicks cannot be negative']
    },
    // User ownership references (ownerId and userId kept in sync for maximum compatibility)
    ownerId: {
      type: mongoose.Schema.Types.Mixed,
      default: null,
      index: true
    },
    userId: {
      type: mongoose.Schema.Types.Mixed,
      default: null,
      index: true
    }
  },
  {
    timestamps: true,
    toJSON: {
      virtuals: true,
      transform(doc, ret) {
        delete ret._id;
        delete ret.__v;
        delete ret.passwordHash;
        if (ret.createdAt instanceof Date) ret.createdAt = ret.createdAt.toISOString();
        if (ret.updatedAt instanceof Date) ret.updatedAt = ret.updatedAt.toISOString();
        if (ret.expiresAt instanceof Date) ret.expiresAt = ret.expiresAt.toISOString();
        return ret;
      }
    },
    toObject: { virtuals: true }
  }
);

// Virtual property for 'originalUrl' mapped to 'longUrl'
urlSchema.virtual('originalUrl')
  .get(function () {
    return this.longUrl;
  })
  .set(function (val) {
    this.longUrl = val;
  });

// Keep ownerId and userId synchronized before saving
urlSchema.pre('save', function () {
  if (this.ownerId && !this.userId) this.userId = this.ownerId;
  if (this.userId && !this.ownerId) this.ownerId = this.userId;
});

// Compound indexes for fast filtered lookups, ownership queries, and sorting
urlSchema.index({ createdAt: -1 });
urlSchema.index({ ownerId: 1, createdAt: -1 });
urlSchema.index({ ownerId: 1, clicks: -1 });
urlSchema.index({ clicks: -1 });
urlSchema.index({ isActive: 1, expiresAt: 1, clickLimit: 1 });
urlSchema.index({ title: 'text', longUrl: 'text', code: 'text' });

export const Url = mongoose.models.Url || mongoose.model('Url', urlSchema);
export default Url;
