// buildings – tòa nhà; tầng là floorCount, nội quy là rules (UC-11..15, UC-23)
import mongoose from 'mongoose';

const { Schema } = mongoose;

const buildingSchema = new Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    }, // BR-034
    address: {
      type: String,
      required: true,
      trim: true,
    },
    description: {
      type: String,
      trim: true,
    },
    images: {
      type: [String],
      default: [],
    },
    floorCount: {
      type: Number,
      default: 1,
      min: 1,
    }, // "Tầng 1..n" sinh từ số này, sửa ở UC-15
    rules: {
      type: String,
    }, // nội quy, một bản, lưu đè (BR-060)
    managerId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
    }, // gỡ phân công thì đặt null
    isDeleted: {
      type: Boolean,
      default: false,
    },
    deletedAt: {
      type: Date,
    },
  },
  { timestamps: true },
);

// Tên duy nhất trong các tòa chưa xóa, tòa đã xóa thì tên được dùng lại (BR-034)
buildingSchema.index(
  { name: 1 },
  { unique: true, partialFilterExpression: { isDeleted: false } },
);

// 1 Manager chỉ phụ trách 1 tòa (BR-031) – chỉ xét khi managerId có giá trị
buildingSchema.index(
  {
    managerId: 1,
  },
  {
    unique: true,
    partialFilterExpression: {
      managerId: {
        $type: 'objectId',
      },
    },
  },
);

export default mongoose.model('Building', buildingSchema, 'buildings');
