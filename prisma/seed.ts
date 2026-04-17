import { PrismaClient } from '@prisma/client';
// Better-Auth використовує @better-auth/utils/password (scrypt via @noble/hashes)
// Формат: `salt:hash` (hex-encoded)
import { hashPassword } from '@better-auth/utils/password';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Seeding RUTA Platform...');

  // --- 4 готелі ---
  const polyana = await prisma.property.upsert({
    where: { slug: 'polyana' },
    update: {},
    create: {
      slug: 'polyana',
      name: 'Рута Резорт Поляна',
      city: 'Поляна',
      region: 'carpathians',
      totalRooms: 118
    }
  });

  const polianytsia = await prisma.property.upsert({
    where: { slug: 'polianytsia' },
    update: {},
    create: {
      slug: 'polianytsia',
      name: 'Рута Резорт Поляниця', // НІКОЛИ не плутати з Поляною!
      city: 'Поляниця',
      region: 'carpathians',
      totalRooms: 51
    }
  });

  const zatoka = await prisma.property.upsert({
    where: { slug: 'zatoka' },
    update: {},
    create: {
      slug: 'zatoka',
      name: 'Сонячна Поляна Затока',
      city: 'Затока',
      region: 'coast',
      totalRooms: 0 // сезонний
    }
  });

  await prisma.property.upsert({
    where: { slug: 'terasa' },
    update: {},
    create: {
      slug: 'terasa',
      name: 'Вілла Тераса',
      city: 'Поляна',
      region: 'misc',
      totalRooms: 0
    }
  });

  console.log('✅ Properties created');

  // --- Категорії номерів (Поляна) ---
  const standard = await prisma.roomCategory.upsert({
    where: { id: 'cat-polyana-standard' },
    update: {},
    create: {
      id: 'cat-polyana-standard',
      propertyId: polyana.id,
      name: 'Стандарт',
      capacity: 2,
      totalRooms: 40,
      amenities: ['WiFi', 'TV', 'Балкон']
    }
  });

  const superior = await prisma.roomCategory.upsert({
    where: { id: 'cat-polyana-superior' },
    update: {},
    create: {
      id: 'cat-polyana-superior',
      propertyId: polyana.id,
      name: 'Супер Люкс',
      capacity: 2,
      totalRooms: 30,
      amenities: ['WiFi', 'TV', 'Балкон', 'Джакузі']
    }
  });

  const suite = await prisma.roomCategory.upsert({
    where: { id: 'cat-polyana-suite' },
    update: {},
    create: {
      id: 'cat-polyana-suite',
      propertyId: polyana.id,
      name: 'Сюїт',
      capacity: 4,
      totalRooms: 10,
      amenities: ['WiFi', 'TV', 'Балкон', 'Джакузі', 'Вітальня']
    }
  });

  // --- Категорії номерів (Поляниця) ---
  const polianytsiaSuperior = await prisma.roomCategory.upsert({
    where: { id: 'cat-polianytsia-superior' },
    update: {},
    create: {
      id: 'cat-polianytsia-superior',
      propertyId: polianytsia.id,
      name: 'Супер Люкс',
      capacity: 2,
      totalRooms: 30,
      amenities: ['WiFi', 'TV', 'Вид на гори']
    }
  });

  const polianytsiaSuite = await prisma.roomCategory.upsert({
    where: { id: 'cat-polianytsia-suite' },
    update: {},
    create: {
      id: 'cat-polianytsia-suite',
      propertyId: polianytsia.id,
      name: 'Сюїт',
      capacity: 4,
      totalRooms: 21,
      amenities: ['WiFi', 'TV', 'Вид на гори', 'Джакузі']
    }
  });

  console.log('✅ Room categories created');

  // --- Базовий тариф (Поляна) ---
  const baseTariff = await prisma.tariff.upsert({
    where: { id: 'tariff-polyana-base-2026' },
    update: {},
    create: {
      id: 'tariff-polyana-base-2026',
      propertyId: polyana.id,
      name: 'Базовий 2026',
      mealPlan: 'BB',
      isActive: true,
      validFrom: new Date('2026-01-01'),
      validUntil: new Date('2026-12-31'),
      lines: {
        create: [
          {
            roomCategoryId: standard.id,
            pricePerNight: 2800,
            minNights: 2,
            weekendSurcharge: 300
          },
          {
            roomCategoryId: superior.id,
            pricePerNight: 4200,
            minNights: 2,
            weekendSurcharge: 500
          },
          {
            roomCategoryId: suite.id,
            pricePerNight: 7500,
            minNights: 2,
            weekendSurcharge: 1000
          }
        ]
      }
    }
  });

  console.log('✅ Tariffs created');

  // --- Правила лояльності ---
  await prisma.loyaltyRule.upsert({
    where: { id: 'loyalty-friend' },
    update: {},
    create: {
      id: 'loyalty-friend',
      tier: 'FRIEND',
      discountPct: 5,
      minNights: 1,
      bonusPoints: 100,
      description: 'FRIEND (1+ візит): знижка 5%'
    }
  });

  await prisma.loyaltyRule.upsert({
    where: { id: 'loyalty-family' },
    update: {},
    create: {
      id: 'loyalty-family',
      tier: 'FAMILY',
      discountPct: 10,
      minNights: 1,
      bonusPoints: 200,
      description: 'FAMILY (5+ візитів): знижка 10%'
    }
  });

  await prisma.loyaltyRule.upsert({
    where: { id: 'loyalty-vip' },
    update: {},
    create: {
      id: 'loyalty-vip',
      tier: 'VIP',
      discountPct: 15,
      minNights: 1,
      bonusPoints: 500,
      description: 'VIP (10+ візитів або ручне): знижка 15%'
    }
  });

  console.log('✅ Loyalty rules created');

  // --- Тестові користувачі ---
  // Better-Auth зберігає паролі через Account model
  // Створюємо User + Account (email+password provider)
  const passwordHash = await hashPassword('Test1234!');

  const adminUser = await prisma.user.upsert({
    where: { email: 'admin@ruta.cam' },
    update: {},
    create: {
      email: 'admin@ruta.cam',
      name: 'Адмін RUTA',
      role: 'ADMIN',
      emailVerified: true,
      accounts: {
        create: {
          accountId: 'admin@ruta.cam',
          providerId: 'credential',
          password: passwordHash
        }
      }
    }
  });

  const closerUser = await prisma.user.upsert({
    where: { email: 'closer@ruta.cam' },
    update: {},
    create: {
      email: 'closer@ruta.cam',
      name: 'Тест Менеджер (Closer)',
      role: 'CLOSER',
      emailVerified: true,
      accounts: {
        create: {
          accountId: 'closer@ruta.cam',
          providerId: 'credential',
          password: passwordHash
        }
      }
    }
  });

  await prisma.user.upsert({
    where: { email: 'farmer@ruta.cam' },
    update: {},
    create: {
      email: 'farmer@ruta.cam',
      name: 'Тест Фармер',
      role: 'FARMER',
      emailVerified: true,
      accounts: {
        create: {
          accountId: 'farmer@ruta.cam',
          providerId: 'credential',
          password: passwordHash
        }
      }
    }
  });

  await prisma.user.upsert({
    where: { email: 'director@ruta.cam' },
    update: {},
    create: {
      email: 'director@ruta.cam',
      name: 'Тест Директор',
      role: 'DIRECTOR',
      emailVerified: true,
      accounts: {
        create: {
          accountId: 'director@ruta.cam',
          providerId: 'credential',
          password: passwordHash
        }
      }
    }
  });

  console.log('✅ Test users created');

  // --- Тестовий гість + бронювання ---
  const testGuest = await prisma.guestProfile.upsert({
    where: { phone: '+380991234567' },
    update: {},
    create: {
      name: 'Тетяна Петренко',
      phone: '+380991234567',
      email: 'test-guest@example.com',
      preferredChannel: 'TELEGRAM',
      loyaltyTier: 'FRIEND',
      visitsCount: 1,
      marketingConsent: true
    }
  });

  await prisma.booking.upsert({
    where: { bookingNumber: 'P260416001' },
    update: {},
    create: {
      bookingNumber: 'P260416001',
      type: 'OPPORTUNITY',
      stage: 'PROPOSAL_1',
      propertyId: polyana.id,
      guestId: testGuest.id,
      closerId: closerUser.id,
      checkinDate: new Date('2026-05-10'),
      checkoutDate: new Date('2026-05-14'),
      nightsCount: 4,
      adultsCount: 2,
      mealPlan: 'BB',
      tariffId: baseTariff.id,
      roomsTotal: 11200,
      grandTotal: 11200,
      prepayAmount: 3360,
      paymentStatus: 'unpaid',
      notes: 'Тестове бронювання для розробки'
    }
  });

  console.log('✅ Test guest + booking created');
  console.log('\n🎉 Seed complete!');
  console.log('\nТестові акаунти (пароль: Test1234!):');
  console.log('  admin@ruta.cam     → ADMIN');
  console.log('  director@ruta.cam  → DIRECTOR');
  console.log('  closer@ruta.cam    → CLOSER');
  console.log('  farmer@ruta.cam    → FARMER');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
