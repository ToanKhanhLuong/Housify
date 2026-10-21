// =========================================================================================
// Housify - Dữ liệu mẫu kiểm thử Frontend (Mock Data)
// -----------------------------------------------------------------------------------------
// ĐỐI CHIẾU VỚI BACKEND MODELS & DATABASE THEO docs/database.md:
// 1. Collection 'buildings' (Model Building):
//    - _id: ObjectId
//    - name: String (duy nhất, BR-034)
//    - address: String
//    - description: String (UC-12)
//    - images: [String] (đường dẫn ảnh, images[0] làm ảnh đại diện)
//    - floorCount: Number (tổng số tầng, ≥ 1)
//    - rules: String (nội quy tòa nhà, BR-060)
//    - managerId: ObjectId tham chiếu User -> Manager
//    * ĐÃ BỎ: 'code', 'city', 'district', 'totalRooms', 'availableRooms' vì không có trong schema.
//
// 2. Collection 'rooms' (Model Room):
//    - _id: ObjectId
//    - buildingId: ObjectId tham chiếu Building
//    - floorNumber: Number (tầng từ 1 đến building.floorCount)
//    - roomTypeId: ObjectId tham chiếu RoomType
//    - roomNumber: String (mã phòng, BR-043, duy nhất trong tòa)
//    - area: Number (m²)
//    - images: [String] (ảnh thực tế)
//    - capacity: Number (sức chứa tối đa, ≥ 1)
//    - rentPrice: Number (giá thuê niêm yết hiện tại, > 0)
//    - deposit: Number (tiền cọc niêm yết hiện tại, > 0, BR-045)
//    - status: Enum ROOM_STATUS ('AVAILABLE' | 'OCCUPIED' | 'MAINTENANCE')
//    * ĐÃ BỎ: 'amenities' (DB không có collection hay field amenities), 'featured', 'badge'.
//
// 3. Collection 'managers' (Model Manager):
//    - userId: ObjectId tham chiếu User
//    - name: String (họ tên quản lý)
//    - phone: String (số điện thoại liên hệ, dùng cho cả gọi điện thoại và nhắn Zalo qua zalo.me/phone)
//    * ĐÃ BỎ: 'avatar' vì DB không có trường avatar cho Manager.
//
// 4. Collection 'services' & 'service_prices' (Model Service & ServicePrice):
//    - Đơn giá điện (kWh), nước (người/m³), dịch vụ quản lý (phòng), gửi xe (xe/tháng) theo từng tòa nhà.
// =========================================================================================

export const mockBuildings = [
  {
    // Model: Building._id
    id: "bld-01",
    // Model: Building.name
    name: "Housify Tân Bình (TP.HCM)",
    // Model: Building.address
    address: "269/20 Phan Huy Ích, Phường 14, Quận Tân Bình, TP.HCM",
    // Model: Building.floorCount
    floorCount: 5,
    // Model: Building.description
    description: "Tòa nhà tọa lạc tại khu dân trí cao Tân Bình, gần sân bay Tân Sơn Nhất, đường ô tô tránh nhau, an ninh 24/7.",
    // Model: Building.rules
    rules: "Giờ giấc tự do, khóa cửa vân tay, giữ gìn vệ sinh chung, không tụ tập làm ồn sau 23h.",
    // Model: Building.images
    images: [
      "https://images.unsplash.com/photo-1545324418-cc1a3fa10c00?auto=format&fit=crop&w=800&q=80"
    ],
    // FE helper: ảnh đại diện lấy từ images[0]
    image: "https://images.unsplash.com/photo-1545324418-cc1a3fa10c00?auto=format&fit=crop&w=800&q=80",
    // Populated từ Building.managerId -> Model Manager
    manager: {
      // Model: Manager.name
      name: "Anh Tuấn (Quản lý Tân Bình)",
      // Model: Manager.phone
      phone: "0901234567"
    }
  },
  {
    // Model: Building._id
    id: "bld-02",
    // Model: Building.name
    name: "Housify Quận 10 (TP.HCM)",
    // Model: Building.address
    address: "382 Tô Hiến Thành, Phường 14, Quận 10, TP.HCM",
    // Model: Building.floorCount
    floorCount: 4,
    // Model: Building.description
    description: "Vị trí đắc địa ngay trung tâm Q.10, liền kề ĐH Bách Khoa TP.HCM, ĐH Y Dược, đầy đủ tiện ích xung quanh.",
    // Model: Building.rules
    rules: "Giờ giấc tự do, ra vào vân tay, không hút thuốc nơi công cộng.",
    // Model: Building.images
    images: [
      "https://images.unsplash.com/photo-1512917774080-9991f1c4c750?auto=format&fit=crop&w=800&q=80"
    ],
    image: "https://images.unsplash.com/photo-1512917774080-9991f1c4c750?auto=format&fit=crop&w=800&q=80",
    manager: {
      name: "Chị Lan (Quản lý Q.10)",
      phone: "0912345678"
    }
  },
  {
    // Model: Building._id
    id: "bld-03",
    // Model: Building.name
    name: "Housify Bình Thạnh (TP.HCM)",
    // Model: Building.address
    address: "158 Nguyễn Gia Trí (D2), Phường 25, Quận Bình Thạnh, TP.HCM",
    // Model: Building.floorCount
    floorCount: 6,
    // Model: Building.description
    description: "Ngay trục đường sầm uất D2, cách HUTECH, ĐH Ngoại Thương và Giao Thông Vận Tải chỉ 300m. Có thang máy hiện đại.",
    // Model: Building.rules
    rules: "Giờ giấc tự do, thang máy thẻ từ, cấm nuôi thú cưng gây ồn ào.",
    // Model: Building.images
    images: [
      "https://images.unsplash.com/photo-1574362848149-11496d93a7c7?auto=format&fit=crop&w=800&q=80"
    ],
    image: "https://images.unsplash.com/photo-1574362848149-11496d93a7c7?auto=format&fit=crop&w=800&q=80",
    manager: {
      name: "Anh Minh (Quản lý Bình Thạnh)",
      phone: "0987654321"
    }
  },
  {
    // Model: Building._id
    id: "bld-04",
    // Model: Building.name
    name: "Housify Gò Vấp (TP.HCM)",
    // Model: Building.address
    address: "74 Quang Trung, Phường 8, Quận Gò Vấp, TP.HCM",
    // Model: Building.floorCount
    floorCount: 4,
    // Model: Building.description
    description: "Gần ngã năm Chuồng Chó, chợ Hạnh Thông Tây, khu vực đông đúc thuận tiện đi lại, hầm giữ xe rộng rãi.",
    // Model: Building.rules
    rules: "Giờ giấc tự do, khóa cổng vân tay bảo mật.",
    // Model: Building.images
    images: [
      "https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?auto=format&fit=crop&w=800&q=80"
    ],
    image: "https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?auto=format&fit=crop&w=800&q=80",
    manager: {
      name: "Chị Hạnh (Quản lý Gò Vấp)",
      phone: "0933445566"
    }
  },
  {
    // Model: Building._id
    id: "bld-05",
    // Model: Building.name
    name: "Housify Cầu Giấy (Hà Nội)",
    // Model: Building.address
    address: "Số 68 Đường Cầu Giấy, Phường Quan Hoa, Quận Cầu Giấy, Hà Nội",
    // Model: Building.floorCount
    floorCount: 6,
    // Model: Building.description
    description: "Tòa nhà chung cư mini cao cấp tại trung tâm Cầu Giấy, gần ĐH Sư Phạm, ĐH Quốc Gia Hà Nội, có thang máy.",
    // Model: Building.rules
    rules: "Cửa vân tay, hệ thống PCCC tiêu chuẩn đã thẩm duyệt, giờ giấc thoải mái.",
    // Model: Building.images
    images: [
      "https://images.unsplash.com/photo-1567496898669-ee935f5f647a?auto=format&fit=crop&w=800&q=80"
    ],
    image: "https://images.unsplash.com/photo-1567496898669-ee935f5f647a?auto=format&fit=crop&w=800&q=80",
    manager: {
      name: "Anh Hoàng (Quản lý Cầu Giấy)",
      phone: "0966112233"
    }
  },
  {
    // Model: Building._id
    id: "bld-06",
    // Model: Building.name
    name: "Housify Đống Đa (Hà Nội)",
    // Model: Building.address
    address: "Số 12 Phố Chùa Bộc, Phường Quang Trung, Quận Đống Đa, Hà Nội",
    // Model: Building.floorCount
    floorCount: 5,
    // Model: Building.description
    description: "Sát Học viện Ngân Hàng, ĐH Thủy Lợi, ĐH Công Đoàn. Giao thông thuận tiện, khu dân cư an ninh cao.",
    // Model: Building.rules
    rules: "Giờ giấc tự do, khóa vân tay, có ban quản lý hỗ trợ thường trực.",
    // Model: Building.images
    images: [
      "https://images.unsplash.com/photo-1515263487990-61b07816b324?auto=format&fit=crop&w=800&q=80"
    ],
    image: "https://images.unsplash.com/photo-1515263487990-61b07816b324?auto=format&fit=crop&w=800&q=80",
    manager: {
      name: "Chị Mai (Quản lý Đống Đa)",
      phone: "0977889900"
    }
  }
];


export const mockRooms = [
  {
    // Model: Room._id
    id: "rm-101",
    // Model: Room.roomNumber
    roomNumber: "P.204",
    // Model: Room.buildingId (tham chiếu Building._id)
    buildingId: "bld-01",
    // Populated từ Model Building.name
    buildingName: "Housify Tân Bình (TP.HCM)",
    // Populated từ Model Building.address
    address: "269/20 Phan Huy Ích, P.14, Q. Tân Bình, TP.HCM",
    // Model: Room.floorNumber
    floorNumber: 2,
    floor: 2,
    // Model: Room.rentPrice
    rentPrice: 3800000,
    price: 3800000,
    // Model: Room.deposit
    deposit: 3800000,
    // Model: Room.area
    area: 28,
    // Model: Room.capacity
    capacity: 2,
    // Populated từ Model RoomType.name
    type: "Gác lửng",
    // Model: Room.status
    status: "AVAILABLE",
    // Tiêu đề phòng sinh động: [Loại phòng] [Mã phòng] - [Tòa nhà]
    title: "Phòng Gác lửng P.204 - Housify Tân Bình",
    // Model: Room.images
    images: [
      "https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?auto=format&fit=crop&w=800&q=80",
      "https://images.unsplash.com/photo-1502672260266-1c1ef2d93688?auto=format&fit=crop&w=800&q=80",
      "https://images.unsplash.com/photo-1560448204-e02f11c3d0e2?auto=format&fit=crop&w=800&q=80"
    ],
    thumbnail: "https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?auto=format&fit=crop&w=800&q=80",
    // Populated từ Model ServicePrice theo buildingId
    electricityPrice: "3.500 đ/kWh",
    waterPrice: "100.000 đ/người",
    serviceFee: "150.000 đ/phòng",
    parkingFee: "100.000 đ/xe/tháng",
    // Populated từ Building.managerId -> Model Manager (name, phone)
    manager: {
      name: "Anh Tuấn",
      phone: "0901234567"
    },
    // Populated từ Building.description
    description: "Phòng mới 100% full nội thất xịn, ban công thoáng gió mát mẻ quanh năm. Khu vực dân trí cao, an ninh tuyệt đối camera 24/7, giờ giấc tự do không chung chủ."
  },
  {
    id: "rm-102",
    roomNumber: "P.301",
    buildingId: "bld-03",
    buildingName: "Housify Bình Thạnh (TP.HCM)",
    address: "158 Nguyễn Gia Trí (D2), P.25, Q. Bình Thạnh, TP.HCM",
    floorNumber: 3,
    floor: 3,
    rentPrice: 4900000,
    price: 4900000,
    deposit: 4900000,
    area: 35,
    capacity: 3,
    type: "Duplex",
    status: "AVAILABLE",
    title: "Căn Hộ Duplex P.301 - Housify Bình Thạnh",
    images: [
      "https://images.unsplash.com/photo-1502672260266-1c1ef2d93688?auto=format&fit=crop&w=800&q=80",
      "https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?auto=format&fit=crop&w=800&q=80"
    ],
    thumbnail: "https://images.unsplash.com/photo-1502672260266-1c1ef2d93688?auto=format&fit=crop&w=800&q=80",
    electricityPrice: "3.800 đ/kWh",
    waterPrice: "100.000 đ/người",
    serviceFee: "180.000 đ/phòng",
    parkingFee: "120.000 đ/xe/tháng",
    manager: {
      name: "Anh Minh",
      phone: "0987654321"
    },
    description: "Vị trí đắc địa ngay trung tâm D2 Bình Thạnh, sát các trường ĐH HUTECH, Ngoại Thương, Giao Thông Vận Tải. Thang máy tốc độ cao, có hầm để xe rộng rãi."
  },
  {
    id: "rm-103",
    roomNumber: "P.102",
    buildingId: "bld-02",
    buildingName: "Housify Quận 10 (TP.HCM)",
    address: "382 Tô Hiến Thành, P.14, Q. 10, TP.HCM",
    floorNumber: 1,
    floor: 1,
    rentPrice: 3500000,
    price: 3500000,
    deposit: 3500000,
    area: 25,
    capacity: 2,
    type: "Studio",
    status: "AVAILABLE",
    title: "Phòng Studio P.102 - Housify Quận 10",
    images: [
      "https://images.unsplash.com/photo-1560448204-e02f11c3d0e2?auto=format&fit=crop&w=800&q=80",
      "https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?auto=format&fit=crop&w=800&q=80"
    ],
    thumbnail: "https://images.unsplash.com/photo-1560448204-e02f11c3d0e2?auto=format&fit=crop&w=800&q=80",
    electricityPrice: "3.500 đ/kWh",
    waterPrice: "100.000 đ/người",
    serviceFee: "150.000 đ/phòng",
    parkingFee: "100.000 đ/xe/tháng",
    manager: {
      name: "Chị Lan",
      phone: "0912345678"
    },
    description: "Phòng trệt không cần leo thang bộ, sàn gỗ sạch sẽ ấm cúng. Gần chợ Thuận Phát, siêu thị BigC Tô Hiến Thành, bệnh viện 115."
  },
  {
    id: "rm-104",
    roomNumber: "P.402",
    buildingId: "bld-05",
    buildingName: "Housify Cầu Giấy (Hà Nội)",
    address: "Số 68 Đường Cầu Giấy, Quan Hoa, Q. Cầu Giấy, Hà Nội",
    floorNumber: 4,
    floor: 4,
    rentPrice: 4200000,
    price: 4200000,
    deposit: 4200000,
    area: 30,
    capacity: 2,
    type: "1 Phòng ngủ",
    status: "AVAILABLE",
    title: "Căn Hộ 1 Phòng Ngủ P.402 - Housify Cầu Giấy",
    images: [
      "https://images.unsplash.com/photo-1493809842364-78817add7ffb?auto=format&fit=crop&w=800&q=80",
      "https://images.unsplash.com/photo-1502672260266-1c1ef2d93688?auto=format&fit=crop&w=800&q=80"
    ],
    thumbnail: "https://images.unsplash.com/photo-1493809842364-78817add7ffb?auto=format&fit=crop&w=800&q=80",
    electricityPrice: "3.800 đ/kWh",
    waterPrice: "30.000 đ/m³",
    serviceFee: "150.000 đ/phòng",
    parkingFee: "100.000 đ/xe/tháng",
    manager: {
      name: "Anh Hoàng",
      phone: "0966112233"
    },
    description: "Căn hộ 1 phòng ngủ riêng biệt yên tĩnh, thiết kế hiện đại tone màu sáng trang nhã. Có thang máy, hệ thống camera hành lang 24/7."
  },
  {
    id: "rm-105",
    roomNumber: "P.302",
    buildingId: "bld-06",
    buildingName: "Housify Đống Đa (Hà Nội)",
    address: "Số 12 Phố Chùa Bộc, Quang Trung, Q. Đống Đa, Hà Nội",
    floorNumber: 3,
    floor: 3,
    rentPrice: 4600000,
    price: 4600000,
    deposit: 4600000,
    area: 32,
    capacity: 2,
    type: "Studio",
    status: "AVAILABLE",
    title: "Phòng Studio P.302 - Housify Đống Đa",
    images: [
      "https://images.unsplash.com/photo-1554995207-c18c203602cb?auto=format&fit=crop&w=800&q=80",
      "https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?auto=format&fit=crop&w=800&q=80"
    ],
    thumbnail: "https://images.unsplash.com/photo-1554995207-c18c203602cb?auto=format&fit=crop&w=800&q=80",
    electricityPrice: "3.800 đ/kWh",
    waterPrice: "30.000 đ/m³",
    serviceFee: "150.000 đ/phòng",
    parkingFee: "100.000 đ/xe/tháng",
    manager: {
      name: "Chị Mai",
      phone: "0977889900"
    },
    description: "Phòng studio thiết kế tối ưu công năng, đầy đủ ánh sáng tự nhiên. Bước chân ra phố Chùa Bộc mua sắm thời trang sầm uất."
  },
  {
    id: "rm-106",
    roomNumber: "P.201",
    buildingId: "bld-04",
    buildingName: "Housify Gò Vấp (TP.HCM)",
    address: "74 Quang Trung, P.8, Q. Gò Vấp, TP.HCM",
    floorNumber: 2,
    floor: 2,
    rentPrice: 3200000,
    price: 3200000,
    deposit: 3200000,
    area: 24,
    capacity: 2,
    type: "Gác lửng",
    status: "AVAILABLE",
    title: "Phòng Gác lửng P.201 - Housify Gò Vấp",
    images: [
      "https://images.unsplash.com/photo-1536376072261-38c75010e6c9?auto=format&fit=crop&w=800&q=80",
      "https://images.unsplash.com/photo-1502672260266-1c1ef2d93688?auto=format&fit=crop&w=800&q=80"
    ],
    thumbnail: "https://images.unsplash.com/photo-1536376072261-38c75010e6c9?auto=format&fit=crop&w=800&q=80",
    electricityPrice: "3.500 đ/kWh",
    waterPrice: "100.000 đ/người",
    serviceFee: "150.000 đ/phòng",
    parkingFee: "100.000 đ/xe/tháng",
    manager: {
      name: "Chị Hạnh",
      phone: "0933445566"
    },
    description: "Giá sinh viên cực kỳ hợp lý, phòng gác lửng rộng thoáng. Khu vực an ninh, gần chợ, siêu thị Emart Gò Vấp."
  },
  {
    id: "rm-107",
    roomNumber: "P.304",
    buildingId: "bld-01",
    buildingName: "Housify Tân Bình (TP.HCM)",
    address: "269/20 Phan Huy Ích, P.14, Q. Tân Bình, TP.HCM",
    floorNumber: 3,
    floor: 3,
    rentPrice: 4000000,
    price: 4000000,
    deposit: 4000000,
    area: 30,
    capacity: 2,
    type: "Studio",
    status: "AVAILABLE",
    title: "Phòng Studio P.304 - Housify Tân Bình",
    images: [
      "https://images.unsplash.com/photo-1522771739844-6a9f6d5f14af?auto=format&fit=crop&w=800&q=80",
      "https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?auto=format&fit=crop&w=800&q=80"
    ],
    thumbnail: "https://images.unsplash.com/photo-1522771739844-6a9f6d5f14af?auto=format&fit=crop&w=800&q=80",
    electricityPrice: "3.500 đ/kWh",
    waterPrice: "100.000 đ/người",
    serviceFee: "150.000 đ/phòng",
    parkingFee: "100.000 đ/xe/tháng",
    manager: {
      name: "Anh Tuấn",
      phone: "0901234567"
    },
    description: "Phòng có ban công riêng cực thoáng gió, giặt phơi quần áo ngay tại phòng. Tiện nghi cao cấp thích hợp người đi làm."
  },
  {
    id: "rm-108",
    roomNumber: "P.205",
    buildingId: "bld-03",
    buildingName: "Housify Bình Thạnh (TP.HCM)",
    address: "158 Nguyễn Gia Trí (D2), P.25, Q. Bình Thạnh, TP.HCM",
    floorNumber: 2,
    floor: 2,
    rentPrice: 3700000,
    price: 3700000,
    deposit: 3700000,
    area: 26,
    capacity: 2,
    type: "Gác lửng",
    status: "AVAILABLE",
    title: "Phòng Gác lửng P.205 - Housify Bình Thạnh",
    images: [
      "https://images.unsplash.com/photo-1512918728675-ed5a9ecdebfd?auto=format&fit=crop&w=800&q=80",
      "https://images.unsplash.com/photo-1502672260266-1c1ef2d93688?auto=format&fit=crop&w=800&q=80"
    ],
    thumbnail: "https://images.unsplash.com/photo-1512918728675-ed5a9ecdebfd?auto=format&fit=crop&w=800&q=80",
    electricityPrice: "3.800 đ/kWh",
    waterPrice: "100.000 đ/người",
    serviceFee: "180.000 đ/phòng",
    parkingFee: "120.000 đ/xe/tháng",
    manager: {
      name: "Anh Minh",
      phone: "0987654321"
    },
    description: "Phòng gác lửng thoáng đãng ngay trung tâm Bình Thạnh, di chuyển sang Q.1 chỉ 5 phút xe máy."
  },
  {
    id: "rm-109",
    roomNumber: "P.103",
    buildingId: "bld-01",
    buildingName: "Housify Tân Bình (TP.HCM)",
    address: "269/20 Phan Huy Ích, P.14, Q. Tân Bình, TP.HCM",
    floorNumber: 1,
    floor: 1,
    rentPrice: 3400000,
    price: 3400000,
    deposit: 3400000,
    area: 24,
    capacity: 2,
    type: "Studio",
    status: "AVAILABLE",
    title: "Phòng Studio P.103 - Housify Tân Bình",
    images: [
      "https://images.unsplash.com/photo-1505691938895-1758d7feb511?auto=format&fit=crop&w=800&q=80",
      "https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?auto=format&fit=crop&w=800&q=80"
    ],
    thumbnail: "https://images.unsplash.com/photo-1505691938895-1758d7feb511?auto=format&fit=crop&w=800&q=80",
    electricityPrice: "3.500 đ/kWh",
    waterPrice: "100.000 đ/người",
    serviceFee: "150.000 đ/phòng",
    parkingFee: "100.000 đ/xe/tháng",
    manager: {
      name: "Anh Tuấn",
      phone: "0901234567"
    },
    description: "Phòng tầng trệt yên tĩnh, thiết kế vuông vắn dễ sắp xếp đồ đạc. Cửa sổ giếng trời lấy sáng tự nhiên."
  },
  {
    id: "rm-110",
    roomNumber: "P.303",
    buildingId: "bld-02",
    buildingName: "Housify Quận 10 (TP.HCM)",
    address: "382 Tô Hiến Thành, P.14, Q. 10, TP.HCM",
    floorNumber: 3,
    floor: 3,
    rentPrice: 4800000,
    price: 4800000,
    deposit: 4800000,
    area: 32,
    capacity: 2,
    type: "Duplex",
    status: "AVAILABLE",
    title: "Căn Hộ Duplex P.303 - Housify Quận 10",
    images: [
      "https://images.unsplash.com/photo-1513694203232-719a280e022f?auto=format&fit=crop&w=800&q=80",
      "https://images.unsplash.com/photo-1560448204-e02f11c3d0e2?auto=format&fit=crop&w=800&q=80"
    ],
    thumbnail: "https://images.unsplash.com/photo-1513694203232-719a280e022f?auto=format&fit=crop&w=800&q=80",
    electricityPrice: "3.500 đ/kWh",
    waterPrice: "100.000 đ/người",
    serviceFee: "150.000 đ/phòng",
    parkingFee: "100.000 đ/xe/tháng",
    manager: {
      name: "Chị Lan",
      phone: "0912345678"
    },
    description: "Căn hộ duplex trần cao 4m, ban công lộng gió đón ánh sáng tự nhiên. Thiết bị vệ sinh cao cấp ToTo."
  },
  {
    id: "rm-111",
    roomNumber: "P.501",
    buildingId: "bld-05",
    buildingName: "Housify Cầu Giấy (Hà Nội)",
    address: "Số 68 Đường Cầu Giấy, Quan Hoa, Q. Cầu Giấy, Hà Nội",
    floorNumber: 5,
    floor: 5,
    rentPrice: 5000000,
    price: 5000000,
    deposit: 5000000,
    area: 36,
    capacity: 3,
    type: "1 Phòng ngủ",
    status: "AVAILABLE",
    title: "Căn Hộ 1 Phòng Ngủ P.501 - Housify Cầu Giấy",
    images: [
      "https://images.unsplash.com/photo-1502672023488-70e25813eb80?auto=format&fit=crop&w=800&q=80",
      "https://images.unsplash.com/photo-1493809842364-78817add7ffb?auto=format&fit=crop&w=800&q=80"
    ],
    thumbnail: "https://images.unsplash.com/photo-1502672023488-70e25813eb80?auto=format&fit=crop&w=800&q=80",
    electricityPrice: "3.800 đ/kWh",
    waterPrice: "30.000 đ/m³",
    serviceFee: "150.000 đ/phòng",
    parkingFee: "100.000 đ/xe/tháng",
    manager: {
      name: "Anh Hoàng",
      phone: "0966112233"
    },
    description: "Căn hộ 1 phòng ngủ VIP tầng cao view thoáng đãng không bị che khuất. Đầy đủ tiện ích cho cặp đôi hoặc gia đình trẻ."
  },
  {
    id: "rm-112",
    roomNumber: "P.202",
    buildingId: "bld-06",
    buildingName: "Housify Đống Đa (Hà Nội)",
    address: "Số 12 Phố Chùa Bộc, Quang Trung, Q. Đống Đa, Hà Nội",
    floorNumber: 2,
    floor: 2,
    rentPrice: 3900000,
    price: 3900000,
    deposit: 3900000,
    area: 28,
    capacity: 2,
    type: "Gác lửng",
    status: "AVAILABLE",
    title: "Phòng Gác lửng P.202 - Housify Đống Đa",
    images: [
      "https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?auto=format&fit=crop&w=800&q=80",
      "https://images.unsplash.com/photo-1554995207-c18c203602cb?auto=format&fit=crop&w=800&q=80"
    ],
    thumbnail: "https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?auto=format&fit=crop&w=800&q=80",
    electricityPrice: "3.800 đ/kWh",
    waterPrice: "30.000 đ/m³",
    serviceFee: "150.000 đ/phòng",
    parkingFee: "100.000 đ/xe/tháng",
    manager: {
      name: "Chị Mai",
      phone: "0977889900"
    },
    description: "Phòng gác lửng giá tốt tại Đống Đa, ngõ nông dễ tìm, khu sinh viên văn minh an ninh cao."
  }
];
