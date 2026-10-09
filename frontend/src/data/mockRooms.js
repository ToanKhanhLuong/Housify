export const mockRooms = [
  {
    id: "rm-101",
    roomNumber: "P.204",
    title: "Phòng Studio Gác Cao Cấp - Cửa Sổ Thoáng Gió",
    buildingId: "bld-01",
    buildingName: "Housify Tân Bình (TP.HCM)",
    address: "269/20 Phan Huy Ích, P.14, Q. Tân Bình, TP.HCM",
    district: "Quận Tân Bình",
    city: "TP.HCM",
    floor: 2,
    price: 3800000,
    deposit: 3800000,
    area: 28,
    type: "Gác lửng",
    status: "available",
    featured: true,
    thumbnail: "https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?auto=format&fit=crop&w=800&q=80",
    images: [
      "https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?auto=format&fit=crop&w=800&q=80",
      "https://images.unsplash.com/photo-1502672260266-1c1ef2d93688?auto=format&fit=crop&w=800&q=80",
      "https://images.unsplash.com/photo-1560448204-e02f11c3d0e2?auto=format&fit=crop&w=800&q=80"
    ],
    amenities: [
      "Máy lạnh Inverter",
      "Tủ lạnh 150L",
      "Gác lửng đúc cao 2m",
      "Nóng lạnh năng lượng mặt trời",
      "Tủ quần áo âm tường",
      "Khóa cửa vân tay",
      "Máy giặt sấy chung",
      "Wifi cáp quang riêng"
    ],
    electricityPrice: "3.500đ / kWh",
    waterPrice: "100.000đ / người",
    serviceFee: "150.000đ / phòng",
    manager: {
      name: "Anh Tuấn",
      phone: "0901234567",
      zalo: "0901234567",
      avatar: "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=200&q=80"
    },
    description: "Phòng mới 100% full nội thất xịn, ban công thoáng gió mát mẻ quanh năm. Khu vực dân trí cao, an ninh tuyệt đối camera 24/7, giờ giấc tự do không chung chủ."
  },
  {
    id: "rm-102",
    roomNumber: "P.301",
    title: "Căn Hộ Mini Duplex Ban Công View Landmark",
    buildingId: "bld-03",
    buildingName: "Housify Bình Thạnh (TP.HCM)",
    address: "158 Nguyễn Gia Trí (D2), P.25, Q. Bình Thạnh, TP.HCM",
    district: "Quận Bình Thạnh",
    city: "TP.HCM",
    floor: 3,
    price: 4900000,
    deposit: 4900000,
    area: 35,
    type: "Duplex",
    status: "available",
    featured: true,
    thumbnail: "https://images.unsplash.com/photo-1502672260266-1c1ef2d93688?auto=format&fit=crop&w=800&q=80",
    images: [
      "https://images.unsplash.com/photo-1502672260266-1c1ef2d93688?auto=format&fit=crop&w=800&q=80",
      "https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?auto=format&fit=crop&w=800&q=80"
    ],
    amenities: [
      "Ban công riêng view đẹp",
      "Máy lạnh",
      "Tủ lạnh 2 cánh",
      "Bếp từ âm + Hút mùi",
      "Giường nệm cao cấp",
      "Bàn làm việc",
      "Thang máy",
      "Khóa cổng FaceID"
    ],
    electricityPrice: "3.800đ / kWh",
    waterPrice: "100.000đ / người",
    serviceFee: "180.000đ / phòng",
    manager: {
      name: "Anh Minh",
      phone: "0987654321",
      zalo: "0987654321",
      avatar: "https://images.unsplash.com/photo-1570295999919-56ceb5ecca61?auto=format&fit=crop&w=200&q=80"
    },
    description: "Vị trí đắc địa ngay trung tâm D2 Bình Thạnh, sát các trường ĐH HUTECH, Ngoại Thương, Giao Thông Vận Tải. Thang máy tốc độ cao, có hầm để xe rộng rãi."
  },
  {
    id: "rm-103",
    roomNumber: "P.102",
    title: "Phòng Trệt Sàn Gỗ Tiện Nghi - Cửa Sổ Lớn",
    buildingId: "bld-02",
    buildingName: "Housify Quận 10 (TP.HCM)",
    address: "382 Tô Hiến Thành, P.14, Q. 10, TP.HCM",
    district: "Quận 10",
    city: "TP.HCM",
    floor: 1,
    price: 3200000,
    deposit: 3200000,
    area: 24,
    type: "Studio",
    status: "available",
    featured: true,
    thumbnail: "https://images.unsplash.com/photo-1560448204-e02f11c3d0e2?auto=format&fit=crop&w=800&q=80",
    images: [
      "https://images.unsplash.com/photo-1560448204-e02f11c3d0e2?auto=format&fit=crop&w=800&q=80"
    ],
    amenities: [
      "Sàn gỗ chống nước",
      "Máy lạnh Daikin",
      "Kệ bếp nấu ăn riêng",
      "Toilet riêng hiện đại",
      "Máy giặt chung",
      "Camera an ninh"
    ],
    electricityPrice: "3.500đ / kWh",
    waterPrice: "90.000đ / người",
    serviceFee: "120.000đ / phòng",
    manager: {
      name: "Chị Lan",
      phone: "0912345678",
      zalo: "0912345678",
      avatar: "https://images.unsplash.com/photo-1580489944761-15a19d654956?auto=format&fit=crop&w=200&q=80"
    },
    description: "Phòng tầng trệt không cần leo cầu thang, thuận tiện di chuyển qua Q.1, Q.3, Q.5. Gần ĐH Bách Khoa, BV 115, siêu thị Big C Miền Đông."
  },
  {
    id: "rm-104",
    roomNumber: "P.405",
    title: "Phòng Duplex Gác Cao Rộng Rãi - Gần E-Town",
    buildingId: "bld-01",
    buildingName: "Housify Tân Bình (TP.HCM)",
    address: "269/20 Phan Huy Ích, P.14, Q. Tân Bình, TP.HCM",
    district: "Quận Tân Bình",
    city: "TP.HCM",
    floor: 4,
    price: 3500000,
    deposit: 3500000,
    area: 26,
    type: "Gác lửng",
    status: "available",
    featured: true,
    thumbnail: "https://images.unsplash.com/photo-1493809842364-78817add7ffb?auto=format&fit=crop&w=800&q=80",
    images: [
      "https://images.unsplash.com/photo-1493809842364-78817add7ffb?auto=format&fit=crop&w=800&q=80"
    ],
    amenities: [
      "Gác đúc đứng không đụng đầu",
      "Máy lạnh mới 100%",
      "Cửa sổ trời siêu thoáng",
      "Tủ bếp trên dưới",
      "Khóa vân tay"
    ],
    electricityPrice: "3.500đ / kWh",
    waterPrice: "100.000đ / người",
    serviceFee: "150.000đ / phòng",
    manager: {
      name: "Anh Tuấn",
      phone: "0901234567",
      zalo: "0901234567",
      avatar: "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=200&q=80"
    },
    description: "Ưu tiên khách ở văn phòng, sinh viên lịch sự. Nhà trọ được bảo trì định kỳ, không gian chung luôn được vệ sinh sạch sẽ mỗi tuần."
  },
  {
    id: "rm-105",
    roomNumber: "P.201",
    title: "Phòng Studio Gác Lửng View Sân Bay - Gò Vấp",
    buildingId: "bld-04",
    buildingName: "Housify Gò Vấp (TP.HCM)",
    address: "74 Quang Trung, P.8, Q. Gò Vấp, TP.HCM",
    district: "Quận Gò Vấp",
    city: "TP.HCM",
    floor: 2,
    price: 2900000,
    deposit: 2900000,
    area: 22,
    type: "Studio",
    status: "available",
    featured: false,
    thumbnail: "https://images.unsplash.com/photo-1505691938895-1758d7feb511?auto=format&fit=crop&w=800&q=80",
    images: [
      "https://images.unsplash.com/photo-1505691938895-1758d7feb511?auto=format&fit=crop&w=800&q=80"
    ],
    amenities: [
      "Máy lạnh",
      "Tủ lạnh mini",
      "Toilet khép kín",
      "Wifi riêng",
      "Chỗ để xe miễn phí"
    ],
    electricityPrice: "3.500đ / kWh",
    waterPrice: "80.000đ / người",
    serviceFee: "100.000đ / phòng",
    manager: {
      name: "Chị Hạnh",
      phone: "0933445566",
      zalo: "0933445566",
      avatar: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=200&q=80"
    },
    description: "Giá cực mềm cho sinh viên và người đi làm. Cách ngã 5 Chuồng Chó 5 phút, tiện ra sân bay Tân Sơn Nhất."
  },
  {
    id: "rm-106",
    roomNumber: "P.304",
    title: "Căn Hộ 1PN Riêng Biệt Full Đồ Gỗ Cao Cấp - Q.10",
    buildingId: "bld-02",
    buildingName: "Housify Quận 10 (TP.HCM)",
    address: "382 Tô Hiến Thành, P.14, Q. 10, TP.HCM",
    district: "Quận 10",
    city: "TP.HCM",
    floor: 3,
    price: 5200000,
    deposit: 5200000,
    area: 38,
    type: "1 Phòng ngủ",
    status: "coming_soon",
    featured: false,
    thumbnail: "https://images.unsplash.com/photo-1513694203232-719a280e022f?auto=format&fit=crop&w=800&q=80",
    images: [
      "https://images.unsplash.com/photo-1513694203232-719a280e022f?auto=format&fit=crop&w=800&q=80"
    ],
    amenities: [
      "Phòng ngủ riêng biệt",
      "Sofa phòng khách",
      "Smart Tivi 43 inch",
      "Máy lạnh 2 cái",
      "Tủ lạnh Inverter",
      "Máy giặt riêng trong phòng",
      "Bếp từ đôi"
    ],
    electricityPrice: "3.800đ / kWh",
    waterPrice: "100.000đ / người",
    serviceFee: "180.000đ / phòng",
    manager: {
      name: "Chị Lan",
      phone: "0912345678",
      zalo: "0912345678",
      avatar: "https://images.unsplash.com/photo-1580489944761-15a19d654956?auto=format&fit=crop&w=200&q=80"
    },
    description: "Căn hộ mini 1 phòng ngủ cao cấp, trống từ ngày 15 tới. Nhắn Zalo Quản lý để đặt cọc giữ phòng sớm."
  },
  {
    id: "rm-107",
    roomNumber: "HN-202",
    title: "Studio Ban Công Thoáng Mát - Gần ĐH Quốc Gia Hà Nội",
    buildingId: "bld-05",
    buildingName: "Housify Cầu Giấy (Hà Nội)",
    address: "Số 68 Đường Cầu Giấy, P. Quan Hoa, Q. Cầu Giấy, Hà Nội",
    district: "Quận Cầu Giấy",
    city: "Hà Nội",
    floor: 2,
    price: 4200000,
    deposit: 4200000,
    area: 30,
    type: "Studio",
    status: "available",
    featured: false,
    thumbnail: "https://images.unsplash.com/photo-1536376072261-38c75010e6c9?auto=format&fit=crop&w=800&q=80",
    images: [
      "https://images.unsplash.com/photo-1536376072261-38c75010e6c9?auto=format&fit=crop&w=800&q=80"
    ],
    amenities: [
      "Ban công riêng",
      "Điều hòa 2 chiều",
      "Bình nóng lạnh Ariston",
      "Tủ lạnh 2 cánh",
      "Bếp từ riêng",
      "Thang máy",
      "Khóa vân tay"
    ],
    electricityPrice: "3.800đ / kWh",
    waterPrice: "100.000đ / người",
    serviceFee: "150.000đ / phòng",
    manager: {
      name: "Anh Hoàng",
      phone: "0966112233",
      zalo: "0966112233",
      avatar: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=200&q=80"
    },
    description: "Vị trí đắc địa ngay trung tâm Cầu Giấy, gần ĐH Sư Phạm, ĐH Quốc Gia Hà Nội, Học viện Báo Chí. Tòa nhà thang máy, an ninh camera 24/7."
  },
  {
    id: "rm-108",
    roomNumber: "HN-305",
    title: "Phòng Gác Lửng Xinh Xắn Full Nội Thất - Cầu Giấy",
    buildingId: "bld-05",
    buildingName: "Housify Cầu Giấy (Hà Nội)",
    address: "Số 68 Đường Cầu Giấy, P. Quan Hoa, Q. Cầu Giấy, Hà Nội",
    district: "Quận Cầu Giấy",
    city: "Hà Nội",
    floor: 3,
    price: 3600000,
    deposit: 3600000,
    area: 25,
    type: "Gác lửng",
    status: "available",
    featured: false,
    thumbnail: "https://images.unsplash.com/photo-1598928506311-c55ded91a20c?auto=format&fit=crop&w=800&q=80",
    images: [
      "https://images.unsplash.com/photo-1598928506311-c55ded91a20c?auto=format&fit=crop&w=800&q=80"
    ],
    amenities: [
      "Gác lửng cao ráo",
      "Điều hòa",
      "Nóng lạnh",
      "Tủ quần áo",
      "Máy giặt chung",
      "Chỗ để xe tầng 1"
    ],
    electricityPrice: "3.800đ / kWh",
    waterPrice: "90.000đ / người",
    serviceFee: "120.000đ / phòng",
    manager: {
      name: "Anh Hoàng",
      phone: "0966112233",
      zalo: "0966112233",
      avatar: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=200&q=80"
    },
    description: "Phòng mới tinh, gác lửng cao đúc chắc chắn. Không chung chủ, giờ giấc hoàn toàn tự do."
  },
  {
    id: "rm-109",
    roomNumber: "HN-104",
    title: "Căn Hộ Mini Duplex Gần ĐH Thủy Lợi & HV Ngân Hàng",
    buildingId: "bld-06",
    buildingName: "Housify Đống Đa (Hà Nội)",
    address: "Số 12 Phố Chùa Bộc, P. Quang Trung, Q. Đống Đa, Hà Nội",
    district: "Quận Đống Đa",
    city: "Hà Nội",
    floor: 1,
    price: 4500000,
    deposit: 4500000,
    area: 32,
    type: "Duplex",
    status: "available",
    featured: false,
    thumbnail: "https://images.unsplash.com/photo-1586023492125-27b2c045efd7?auto=format&fit=crop&w=800&q=80",
    images: [
      "https://images.unsplash.com/photo-1586023492125-27b2c045efd7?auto=format&fit=crop&w=800&q=80"
    ],
    amenities: [
      "Thiết kế Duplex hiện đại",
      "Điều hòa Inverter",
      "Bếp từ đôi",
      "Tủ lạnh lớn",
      "Sofa nhỏ",
      "Khóa cửa từ"
    ],
    electricityPrice: "3.800đ / kWh",
    waterPrice: "100.000đ / người",
    serviceFee: "160.000đ / phòng",
    manager: {
      name: "Chị Mai",
      phone: "0977889900",
      zalo: "0977889900",
      avatar: "https://images.unsplash.com/photo-1544005313-94ddf0286df2?auto=format&fit=crop&w=200&q=80"
    },
    description: "Sát phố thời trang Chùa Bộc, Phạm Ngọc Thạch, Vincom Phạm Ngọc Thạch. Cực kỳ tiện lợi cho các bạn sinh viên Ngân Hàng, Y Hà Nội, Thủy Lợi."
  },
  {
    id: "rm-110",
    roomNumber: "HN-401",
    title: "Phòng Studio Cửa Sổ Lớn View Hồ Đống Đa - Chùa Bộc",
    buildingId: "bld-06",
    buildingName: "Housify Đống Đa (Hà Nội)",
    address: "Số 12 Phố Chùa Bộc, P. Quang Trung, Q. Đống Đa, Hà Nội",
    district: "Quận Đống Đa",
    city: "Hà Nội",
    floor: 4,
    price: 3900000,
    deposit: 3900000,
    area: 27,
    type: "Studio",
    status: "coming_soon",
    featured: false,
    thumbnail: "https://images.unsplash.com/photo-1512918728675-ed5a9ecdebfd?auto=format&fit=crop&w=800&q=80",
    images: [
      "https://images.unsplash.com/photo-1512918728675-ed5a9ecdebfd?auto=format&fit=crop&w=800&q=80"
    ],
    amenities: [
      "Cửa sổ lớn ngập tràn ánh sáng",
      "Điều hòa 2 chiều",
      "Nóng lạnh",
      "Bàn học / làm việc",
      "Tủ đồ 3 cánh",
      "Thang máy"
    ],
    electricityPrice: "3.800đ / kWh",
    waterPrice: "100.000đ / người",
    serviceFee: "150.000đ / phòng",
    manager: {
      name: "Chị Mai",
      phone: "0977889900",
      zalo: "0977889900",
      avatar: "https://images.unsplash.com/photo-1544005313-94ddf0286df2?auto=format&fit=crop&w=200&q=80"
    },
    description: "Phòng tầng cao view thoáng đãng mát mẻ, đầy đủ tiện nghi vào ở ngay."
  },
  {
    id: "rm-111",
    roomNumber: "P.302",
    title: "Phòng Gác Cao Gần ĐH Bách Khoa & Vạn Hạnh Mall",
    buildingId: "bld-02",
    buildingName: "Housify Quận 10 (TP.HCM)",
    address: "382 Tô Hiến Thành, P.14, Q. 10, TP.HCM",
    district: "Quận 10",
    city: "TP.HCM",
    floor: 3,
    price: 3700000,
    deposit: 3700000,
    area: 26,
    type: "Gác lửng",
    status: "available",
    featured: false,
    thumbnail: "https://images.unsplash.com/photo-1595526114035-0d45ed16cfbf?auto=format&fit=crop&w=800&q=80",
    images: [
      "https://images.unsplash.com/photo-1595526114035-0d45ed16cfbf?auto=format&fit=crop&w=800&q=80"
    ],
    amenities: [
      "Gác đúc kiên cố",
      "Máy lạnh Daikin",
      "Tủ lạnh",
      "Kệ bếp riêng",
      "Khóa vân tay"
    ],
    electricityPrice: "3.500đ / kWh",
    waterPrice: "90.000đ / người",
    serviceFee: "120.000đ / phòng",
    manager: {
      name: "Chị Lan",
      phone: "0912345678",
      zalo: "0912345678",
      avatar: "https://images.unsplash.com/photo-1580489944761-15a19d654956?auto=format&fit=crop&w=200&q=80"
    },
    description: "Gần ĐH Bách Khoa, ĐH Y Dược, ĐH Kinh Tế. Khu vực an ninh, yên tĩnh, hàng quán ăn uống xung quanh tiện lợi."
  },
  {
    id: "rm-112",
    roomNumber: "P.402",
    title: "Studio Full Đồ Hiện Đại - Trung Tâm Bình Thạnh",
    buildingId: "bld-03",
    buildingName: "Housify Bình Thạnh (TP.HCM)",
    address: "158 Nguyễn Gia Trí (D2), P.25, Q. Bình Thạnh, TP.HCM",
    district: "Quận Bình Thạnh",
    city: "TP.HCM",
    floor: 4,
    price: 4300000,
    deposit: 4300000,
    area: 29,
    type: "Studio",
    status: "available",
    featured: false,
    thumbnail: "https://images.unsplash.com/photo-1554995207-c18c203602cb?auto=format&fit=crop&w=800&q=80",
    images: [
      "https://images.unsplash.com/photo-1554995207-c18c203602cb?auto=format&fit=crop&w=800&q=80"
    ],
    amenities: [
      "Nội thất gỗ cao cấp",
      "Máy lạnh Inverter",
      "Tủ lạnh",
      "Smart Tivi",
      "Thang máy",
      "Camera an ninh 24/7"
    ],
    electricityPrice: "3.800đ / kWh",
    waterPrice: "100.000đ / người",
    serviceFee: "150.000đ / phòng",
    manager: {
      name: "Anh Minh",
      phone: "0987654321",
      zalo: "0987654321",
      avatar: "https://images.unsplash.com/photo-1570295999919-56ceb5ecca61?auto=format&fit=crop&w=200&q=80"
    },
    description: "Căn phòng studio thoáng sáng, nội thất đồng bộ hiện đại, dọn vào ở ngay."
  }
];
