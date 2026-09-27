import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function hashPassword(password) {
  const salt = await bcrypt.genSalt(10);
  return bcrypt.hash(password, salt);
}

async function main() {
  console.log("Ma'lumotlar bazasini tozalash va o'zbekcha boshlang'ich ma'lumotlarni yuklash boshlandi...");

  // Clean existing data
  await prisma.auditLog.deleteMany({});
  await prisma.notification.deleteMany({});
  await prisma.returnItem.deleteMany({});
  await prisma.return.deleteMany({});
  await prisma.payment.deleteMany({});
  await prisma.saleItem.deleteMany({});
  await prisma.sale.deleteMany({});
  await prisma.inventoryTransaction.deleteMany({});
  await prisma.productBatch.deleteMany({});
  await prisma.customer.deleteMany({});
  await prisma.medicine.deleteMany({});
  await prisma.category.deleteMany({});
  await prisma.manufacturer.deleteMany({});
  await prisma.supplier.deleteMany({});
  await prisma.subscription.deleteMany({});
  await prisma.user.deleteMany({});
  await prisma.pharmacy.deleteMany({});

  const superAdminPassword = await hashPassword("superpassword123");
  const defaultPassword = await hashPassword("admin123");
  const omborchiPassword = await hashPassword("omborchi123");
  const kassirPassword = await hashPassword("kassir123");

  // 1. Super Admin
  const superAdmin = await prisma.user.create({
    data: {
      role: "SUPER_ADMIN",
      fullName: "Alisher Rustamov (Super Admin)",
      username: "superadmin",
      passwordHash: superAdminPassword,
      phone: "+998 90 123 45 67",
      status: "ACTIVE",
    },
  });
  console.log("✓ Super Admin yaratildi: superadmin / superpassword123");

  // 2. Pharmacy 1: SHIFO NUR DORIXONA (ACTIVE, 30 days subscription)
  const now = new Date();
  const subEndDate = new Date();
  subEndDate.setDate(now.getDate() + 30);

  const shifoPharmacy = await prisma.pharmacy.create({
    data: {
      name: "SHIFO NUR DORIXONA",
      phone: "+998 71 200 11 22",
      address: "Toshkent sh., Yunusobod tumani, Amir Temur ko'chasi 14-uy",
      adminName: "Jasur Qosimov",
      status: "ACTIVE",
      subscriptionType: "MONTHLY",
      subscriptionStartDate: now,
      subscriptionEndDate: subEndDate,
    },
  });

  // Users for SHIFO NUR
  const shifoAdmin = await prisma.user.create({
    data: {
      pharmacyId: shifoPharmacy.id,
      role: "PHARMACY_ADMIN",
      fullName: "Jasur Qosimov (Dorixona Mudiri)",
      username: "shifo_admin",
      passwordHash: defaultPassword,
      phone: "+998 93 111 22 33",
      status: "ACTIVE",
    },
  });

  const shifoOmborchi = await prisma.user.create({
    data: {
      pharmacyId: shifoPharmacy.id,
      role: "WAREHOUSEMAN",
      fullName: "Bobur Mirzayev (Bosh Omborchi)",
      username: "shifo_omborchi",
      passwordHash: omborchiPassword,
      phone: "+998 94 222 33 44",
      status: "ACTIVE",
    },
  });

  const shifoKassir = await prisma.user.create({
    data: {
      pharmacyId: shifoPharmacy.id,
      role: "CASHIER",
      fullName: "Madina Karimova (Kassir)",
      username: "shifo_kassir",
      passwordHash: kassirPassword,
      phone: "+998 97 333 44 55",
      status: "ACTIVE",
    },
  });

  // Subscription record for SHIFO NUR
  await prisma.subscription.create({
    data: {
      pharmacyId: shifoPharmacy.id,
      planName: "Standart oylik obuna (30 kun)",
      durationDays: 30,
      startDate: now,
      endDate: subEndDate,
      price: 350000,
      status: "ACTIVE",
      activatedBy: "superadmin",
      paymentMethod: "Bank o'tkazmasi",
    },
  });

  // Categories for SHIFO NUR
  const catOgriq = await prisma.category.create({
    data: { pharmacyId: shifoPharmacy.id, name: "Og‘riq qoldiruvchilar", description: "Og‘riqqa qarshi vositalar" },
  });
  const catAntibiotik = await prisma.category.create({
    data: { pharmacyId: shifoPharmacy.id, name: "Antibiotiklar", description: "Bakteriyalarga qarshi dori vositalari" },
  });
  const catVitamin = await prisma.category.create({
    data: { pharmacyId: shifoPharmacy.id, name: "Vitaminlar va minerallar", description: "Immunitetni mustahkamlovchi" },
  });
  const catShamollash = await prisma.category.create({
    data: { pharmacyId: shifoPharmacy.id, name: "Shamollash va gripp", description: "Isitma va shamollashga qarshi" },
  });
  const catOshqozon = await prisma.category.create({
    data: { pharmacyId: shifoPharmacy.id, name: "Oshqozon-ichak", description: "Hazm qilishni yaxshilovchi vositalar" },
  });

  // Suppliers for SHIFO NUR
  const supDoriDarmon = await prisma.supplier.create({
    data: {
      pharmacyId: shifoPharmacy.id,
      name: "Dori-Darmon AK",
      phone: "+998 71 220 30 40",
      address: "Toshkent sh., Chilonzor tumani, 5-mavze",
      contactPerson: "Rustam aka",
      totalPurchases: 15400000,
      totalPaid: 13900000,
      debt: 1500000,
    },
  });

  const supJurabek = await prisma.supplier.create({
    data: {
      pharmacyId: shifoPharmacy.id,
      name: "Jurabek Laboratories MChJ",
      phone: "+998 71 230 45 67",
      address: "Toshkent sh., Olmazor tumani",
      contactPerson: "Farhod Ergashev",
      totalPurchases: 8200000,
      totalPaid: 8200000,
      debt: 0,
    },
  });

  const supNobel = await prisma.supplier.create({
    data: {
      pharmacyId: shifoPharmacy.id,
      name: "Nobel Pharmsanoat",
      phone: "+998 71 207 00 00",
      address: "Toshkent sh., Mirzo Ulug'bek tumani",
      contactPerson: "Dilorom opa",
      totalPurchases: 12000000,
      totalPaid: 7800000,
      debt: 4200000,
    },
  });

  // Customers for SHIFO NUR
  const cust1 = await prisma.customer.create({
    data: {
      pharmacyId: shifoPharmacy.id,
      name: "Anvar Mahmudov",
      phone: "+998 90 999 88 77",
      totalSpent: 125000,
      purchasesCount: 3,
    },
  });

  const cust2 = await prisma.customer.create({
    data: {
      pharmacyId: shifoPharmacy.id,
      name: "Zuhra Aliyeva",
      phone: "+998 91 888 77 66",
      totalSpent: 48000,
      purchasesCount: 1,
    },
  });

  // Medicines & Batches for SHIFO NUR
  const med1 = await prisma.medicine.create({
    data: {
      pharmacyId: shifoPharmacy.id,
      name: "Paratsetamol 500 mg №10",
      barcode: "4780001234567",
      qrCode: "MED-PARA-500",
      categoryId: catOgriq.id,
      salePrice: 5000,
      minStock: 20,
      unit: "quti",
      description: "Og'riq qoldiruvchi va isitma tushiruvchi vosita",
      status: "ACTIVE",
    },
  });

  const batch1 = await prisma.productBatch.create({
    data: {
      pharmacyId: shifoPharmacy.id,
      medicineId: med1.id,
      batchNumber: "PT-2026-01",
      initialQuantity: 150,
      currentQuantity: 120,
      purchasePrice: 3500,
      salePrice: 5000,
      expiryDate: new Date("2028-09-22"),
      supplierId: supJurabek.id,
      status: "NORMAL",
    },
  });

  const med2 = await prisma.medicine.create({
    data: {
      pharmacyId: shifoPharmacy.id,
      name: "Tsitramon P №10",
      barcode: "4780002345678",
      qrCode: "MED-TSIT-010",
      categoryId: catOgriq.id,
      salePrice: 4000,
      minStock: 15,
      unit: "quti",
      description: "Bosh og'rig'iga qarshi dori vositasi",
      status: "ACTIVE",
    },
  });

  // Near expiry & low stock batch
  const batch2 = await prisma.productBatch.create({
    data: {
      pharmacyId: shifoPharmacy.id,
      medicineId: med2.id,
      batchNumber: "PT-2026-02",
      initialQuantity: 50,
      currentQuantity: 8, // Low stock!
      purchasePrice: 2800,
      salePrice: 4000,
      expiryDate: new Date(Date.now() + 25 * 24 * 60 * 60 * 1000), // 25 days left!
      supplierId: supDoriDarmon.id,
      status: "APPROACHING",
    },
  });

  const med3 = await prisma.medicine.create({
    data: {
      pharmacyId: shifoPharmacy.id,
      name: "Amoksitsillin 500 mg №20",
      barcode: "4780003456789",
      qrCode: "MED-AMOX-500",
      categoryId: catAntibiotik.id,
      salePrice: 28000,
      minStock: 10,
      unit: "quti",
      description: "Keng ta'sir doirasiga ega antibiotik",
      status: "ACTIVE",
    },
  });

  const batch3 = await prisma.productBatch.create({
    data: {
      pharmacyId: shifoPharmacy.id,
      medicineId: med3.id,
      batchNumber: "PT-2026-03",
      initialQuantity: 60,
      currentQuantity: 45,
      purchasePrice: 21000,
      salePrice: 28000,
      expiryDate: new Date("2027-12-31"),
      supplierId: supNobel.id,
      status: "NORMAL",
    },
  });

  const med4 = await prisma.medicine.create({
    data: {
      pharmacyId: shifoPharmacy.id,
      name: "Vitamin C 1000 mg shiqildoq",
      barcode: "4780004567890",
      qrCode: "MED-VITC-100",
      categoryId: catVitamin.id,
      salePrice: 38000,
      minStock: 10,
      unit: "tubik",
      description: "Immunitetni quvvatlovchi vitamin C",
      status: "ACTIVE",
    },
  });

  const batch4 = await prisma.productBatch.create({
    data: {
      pharmacyId: shifoPharmacy.id,
      medicineId: med4.id,
      batchNumber: "PT-2026-04",
      initialQuantity: 40,
      currentQuantity: 32,
      purchasePrice: 29000,
      salePrice: 38000,
      expiryDate: new Date("2028-05-15"),
      supplierId: supJurabek.id,
      status: "NORMAL",
    },
  });

  const med5 = await prisma.medicine.create({
    data: {
      pharmacyId: shifoPharmacy.id,
      name: "Mezim Forte №20",
      barcode: "4780005678901",
      qrCode: "MED-MEZM-020",
      categoryId: catOshqozon.id,
      salePrice: 34000,
      minStock: 10,
      unit: "quti",
      description: "Hazm qilish fermenti",
      status: "ACTIVE",
    },
  });

  const batch5 = await prisma.productBatch.create({
    data: {
      pharmacyId: shifoPharmacy.id,
      medicineId: med5.id,
      batchNumber: "PT-2026-05",
      initialQuantity: 70,
      currentQuantity: 58,
      purchasePrice: 26000,
      salePrice: 34000,
      expiryDate: new Date("2027-08-20"),
      supplierId: supNobel.id,
      status: "NORMAL",
    },
  });

  const med6 = await prisma.medicine.create({
    data: {
      pharmacyId: shifoPharmacy.id,
      name: "No-shpa 40 mg №24",
      barcode: "4780006789012",
      qrCode: "MED-NOSH-040",
      categoryId: catOgriq.id,
      salePrice: 42000,
      minStock: 8,
      unit: "quti",
      description: "Spazmolitik ta'sirga ega dori vositasi",
      status: "ACTIVE",
    },
  });

  const batch6 = await prisma.productBatch.create({
    data: {
      pharmacyId: shifoPharmacy.id,
      medicineId: med6.id,
      batchNumber: "PT-2026-06",
      initialQuantity: 30,
      currentQuantity: 24,
      purchasePrice: 33000,
      salePrice: 42000,
      expiryDate: new Date("2027-11-10"),
      supplierId: supDoriDarmon.id,
      status: "NORMAL",
    },
  });

  // Expired medicine (to verify system blocks sale of expired products!)
  const medExpired = await prisma.medicine.create({
    data: {
      pharmacyId: shifoPharmacy.id,
      name: "Analgin 500 mg №10 (Eski partiya)",
      barcode: "4780008901234",
      qrCode: "MED-ANAL-500",
      categoryId: catOgriq.id,
      salePrice: 3500,
      minStock: 5,
      unit: "quti",
      description: "Muddati o'tgan partiya sinov uchun",
      status: "ACTIVE",
    },
  });

  await prisma.productBatch.create({
    data: {
      pharmacyId: shifoPharmacy.id,
      medicineId: medExpired.id,
      batchNumber: "PT-2024-99",
      initialQuantity: 20,
      currentQuantity: 15,
      purchasePrice: 2000,
      salePrice: 3500,
      expiryDate: new Date("2026-01-01"), // Expired!
      supplierId: supDoriDarmon.id,
      status: "EXPIRED",
    },
  });

  // Sample Completed Sales
  const sale1 = await prisma.sale.create({
    data: {
      pharmacyId: shifoPharmacy.id,
      receiptNumber: "CHK-20260922-1001",
      cashierId: shifoKassir.id,
      customerId: cust1.id,
      totalAmount: 28000,
      discountAmount: 3000,
      payableAmount: 25000,
      paidAmount: 25000,
      changeAmount: 0,
      paymentMethod: "CASH",
      status: "COMPLETED",
      items: {
        create: [
          {
            medicineId: med1.id,
            batchId: batch1.id,
            quantity: 2,
            unitPrice: 5000,
            discount: 0,
            totalPrice: 10000,
            purchasePrice: 3500,
          },
          {
            medicineId: med4.id,
            batchId: batch4.id,
            quantity: 1,
            unitPrice: 38000,
            discount: 3000,
            totalPrice: 35000,
            purchasePrice: 29000,
          },
        ],
      },
      payments: {
        create: {
          pharmacyId: shifoPharmacy.id,
          amount: 25000,
          paymentMethod: "CASH",
          status: "SUCCESS",
        },
      },
    },
  });

  // Notifications for SHIFO NUR
  await prisma.notification.createMany({
    data: [
      {
        pharmacyId: shifoPharmacy.id,
        title: "Qoldiq kamaydi!",
        message: 'Diqqat: "Tsitramon P №10" qoldig\'i 8 donagacha kamaydi.',
        type: "LOW_STOCK",
      },
      {
        pharmacyId: shifoPharmacy.id,
        title: "Yaroqlilik muddati yaqinlashmoqda!",
        message: 'Tsitramon P (Partiya #PT-2026-02) yaroqlilik muddati 25 kundan so‘ng tugaydi.',
        type: "EXPIRY_APPROACHING",
      },
    ],
  });

  // 3. Pharmacy 2: MALHAM FARM DORIXONA (TRIAL, 5 days remaining)
  const trialEnd = new Date();
  trialEnd.setDate(now.getDate() + 5);

  const malhamPharmacy = await prisma.pharmacy.create({
    data: {
      name: "MALHAM FARM DORIXONA",
      phone: "+998 66 300 44 55",
      address: "Samarqand sh., Registon ko'chasi 5-uy",
      adminName: "Alisher Vohidov",
      status: "TRIAL",
      trialStartDate: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000),
      trialEndDate: trialEnd,
      subscriptionType: "TRIAL",
    },
  });

  await prisma.user.create({
    data: {
      pharmacyId: malhamPharmacy.id,
      role: "PHARMACY_ADMIN",
      fullName: "Alisher Vohidov",
      username: "malham_admin",
      passwordHash: defaultPassword,
      phone: "+998 90 444 55 66",
      status: "ACTIVE",
    },
  });

  // 4. Pharmacy 3: YANGI HAYOT DORIXONA (BLOCKED - subscription expired)
  const hayotPharmacy = await prisma.pharmacy.create({
    data: {
      name: "YANGI HAYOT DORIXONA",
      phone: "+998 65 221 88 99",
      address: "Buxoro sh., Mustaqillik shoh ko'chasi 28-uy",
      adminName: "Sherzod Jo'rayev",
      status: "BLOCKED",
      subscriptionType: "MONTHLY",
      subscriptionStartDate: new Date("2026-08-01"),
      subscriptionEndDate: new Date("2026-09-01"), // Expired!
      notes: "Oylik obuna to'lovi muddati o'tganligi sababli bloklangan",
    },
  });

  await prisma.user.create({
    data: {
      pharmacyId: hayotPharmacy.id,
      role: "PHARMACY_ADMIN",
      fullName: "Sherzod Jo'rayev",
      username: "hayot_admin",
      passwordHash: defaultPassword,
      phone: "+998 91 555 66 77",
      status: "ACTIVE",
    },
  });

  // Audit Logs
  await prisma.auditLog.createMany({
    data: [
      {
        pharmacyId: shifoPharmacy.id,
        userName: "Jasur Qosimov",
        action: "TIZIM_SOZLANDI",
        entity: "Pharmacy",
        details: "SHIFO NUR DORIXONA sozlamalari va dori katalogi yuklandi",
      },
      {
        pharmacyId: shifoPharmacy.id,
        userName: "Madina Karimova",
        action: "SOTUV_QILINDI",
        entity: "Sale",
        details: "Chek #CHK-20260922-1001: 25 000 so'm (Naqd pul)",
      },
      {
        userName: "Alisher Rustamov (Super Admin)",
        action: "DORIXONA_QOSHILDI",
        entity: "Pharmacy",
        details: "Yangi dorixona qo'shildi: MALHAM FARM DORIXONA (7 kunlik sinov)",
      },
      {
        userName: "Alisher Rustamov (Super Admin)",
        action: "DORIXONA_BLOKLANDI",
        entity: "Pharmacy",
        details: "YANGI HAYOT DORIXONA obunasi tugagani sababli bloklandi",
      },
    ],
  });

  console.log("✓ Barcha ma'lumotlar muvaffaqiyatli saqlandi!");
  console.log("------------------------------------------------------------");
  console.log("Kirish hisoblari:");
  console.log("1. Super Admin:      superadmin     / superpassword123");
  console.log("2. Dorixona Admin:   shifo_admin    / admin123  (Aktiv)");
  console.log("3. Omborchi:         shifo_omborchi / omborchi123");
  console.log("4. Kassir:           shifo_kassir   / kassir123");
  console.log("5. Sinovdagi Admin:  malham_admin   / admin123  (5 kun trial qolgan)");
  console.log("6. Bloklangan Admin: hayot_admin    / admin123  (Bloklash xabarini ko'rish uchun)");
  console.log("------------------------------------------------------------");
}

main()
  .catch((e) => {
    console.error("Seed xatolik:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
