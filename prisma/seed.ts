import { PrismaClient } from '@prisma/client';
// Better-Auth використовує @better-auth/utils/password (scrypt via @noble/hashes)
// Формат: `salt:hash` (hex-encoded)
import { hashPassword } from '@better-auth/utils/password';

const prisma = new PrismaClient();

const msgFields = (inboxId: string) => ({ inboxId });

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

  // ============================================================
  // DEMO DATA — 3 записи кожної сутності для клозера
  // ============================================================

  // --- 3 гості ---
  const guest1 = await prisma.guestProfile.upsert({
    where: { phone: '+380671111111' },
    update: {},
    create: {
      name: 'Олексій Мороз',
      phone: '+380671111111',
      email: 'moroz@gmail.com',
      preferredChannel: 'TELEGRAM',
      loyaltyTier: 'NEW',
      visitsCount: 0,
      marketingConsent: true,
      birthDate: new Date('1988-03-15')
    }
  });
  const guest2 = await prisma.guestProfile.upsert({
    where: { phone: '+380672222222' },
    update: {},
    create: {
      name: 'Марина Коваль',
      phone: '+380672222222',
      email: 'koval@ukr.net',
      preferredChannel: 'WHATSAPP',
      loyaltyTier: 'FRIEND',
      visitsCount: 2,
      marketingConsent: true,
      birthDate: new Date('1992-07-22')
    }
  });
  const guest3 = await prisma.guestProfile.upsert({
    where: { phone: '+380673333333' },
    update: {},
    create: {
      name: 'Ігор Савченко',
      phone: '+380673333333',
      email: 'savchenko@gmail.com',
      preferredChannel: 'PHONE',
      loyaltyTier: 'FAMILY',
      visitsCount: 5,
      marketingConsent: false,
      birthDate: new Date('1975-11-08')
    }
  });
  console.log('✅ Demo guests created');

  // --- 3 звернення (Inquiry) ---
  const inq1 = await prisma.inquiry.create({
    data: {
      status: 'NEW',
      source: 'TELEGRAM',
      guestId: guest1.id,
      assignedToId: closerUser.id,
      propertyId: polyana.id,
      checkInDate: new Date('2026-06-01'),
      checkOutDate: new Date('2026-06-05'),
      adultsCount: 2,
      contactPhone: guest1.phone,
      contactName: guest1.name
    }
  });
  const inq2 = await prisma.inquiry.create({
    data: {
      status: 'IN_PROGRESS',
      source: 'PHONE',
      guestId: guest2.id,
      assignedToId: closerUser.id,
      propertyId: polyana.id,
      checkInDate: new Date('2026-06-15'),
      checkOutDate: new Date('2026-06-18'),
      adultsCount: 2,
      contactPhone: guest2.phone,
      contactName: guest2.name
    }
  });
  await prisma.inquiry.create({
    data: {
      status: 'CONVERTED',
      source: 'SITE_FORM',
      guestId: guest3.id,
      assignedToId: closerUser.id,
      propertyId: polianytsia.id,
      checkInDate: new Date('2026-05-20'),
      checkOutDate: new Date('2026-05-25'),
      adultsCount: 4,
      contactPhone: guest3.phone,
      contactName: guest3.name
    }
  });
  console.log('✅ Demo inquiries created');

  // --- 3 бронювання ---
  const booking2 = await prisma.booking.create({
    data: {
      bookingNumber: 'P260417002',
      type: 'OPPORTUNITY',
      stage: 'QUALIFY',
      propertyId: polyana.id,
      guestId: guest1.id,
      closerId: closerUser.id,
      checkinDate: new Date('2026-06-01'),
      checkoutDate: new Date('2026-06-05'),
      nightsCount: 4,
      adultsCount: 2,
      mealPlan: 'BB',
      tariffId: baseTariff.id,
      roomsTotal: 12800,
      grandTotal: 12800,
      prepayAmount: 6400,
      paymentStatus: 'unpaid',
      inquiry: { connect: { id: inq1.id } },
      notes: 'З звернення Telegram'
    }
  });
  const booking3 = await prisma.booking.create({
    data: {
      bookingNumber: 'P260417003',
      type: 'OPPORTUNITY',
      stage: 'PROPOSAL_1',
      propertyId: polyana.id,
      guestId: guest2.id,
      closerId: closerUser.id,
      checkinDate: new Date('2026-06-15'),
      checkoutDate: new Date('2026-06-18'),
      nightsCount: 3,
      adultsCount: 2,
      mealPlan: 'HB',
      tariffId: baseTariff.id,
      roomsTotal: 9600,
      grandTotal: 9600,
      prepayAmount: 2880,
      paymentStatus: 'unpaid',
      inquiry: { connect: { id: inq2.id } },
      notes: 'Пропозиція відправлена, чекаємо відповідь'
    }
  });
  await prisma.booking.create({
    data: {
      bookingNumber: 'P260417004',
      type: 'OPPORTUNITY',
      stage: 'PROPOSAL_2',
      propertyId: polyana.id,
      guestId: guest3.id,
      closerId: closerUser.id,
      checkinDate: new Date('2026-05-20'),
      checkoutDate: new Date('2026-05-25'),
      nightsCount: 5,
      adultsCount: 4,
      mealPlan: 'BB',
      tariffId: baseTariff.id,
      roomsTotal: 22000,
      grandTotal: 22000,
      prepayAmount: 6600,
      paymentStatus: 'partial',
      notes: 'Передоплата отримана, очікується повний розрахунок'
    }
  });
  console.log('✅ Demo bookings created');

  // --- 3 задачі (Task) для клозера ---
  await prisma.task.createMany({
    data: [
      {
        type: 'CALL_BACK',
        title: 'Передзвонити Олексію Морозу',
        description: 'Уточнити побажання по номеру, відповісти на питання по харчуванню',
        status: 'PENDING',
        assignedToId: closerUser.id,
        bookingId: booking2.id,
        dueAt: new Date(Date.now() + 2 * 60 * 60 * 1000)
      },
      {
        type: 'SEND_PROPOSAL',
        title: 'Відправити пропозицію Марині Коваль',
        description: 'Підготувати 2 варіанти: стандарт і superior з розбивкою по цінах',
        status: 'IN_PROGRESS',
        assignedToId: closerUser.id,
        bookingId: booking3.id,
        dueAt: new Date(Date.now() + 24 * 60 * 60 * 1000)
      },
      {
        type: 'PAYMENT_REMINDER',
        title: 'Нагадати про доплату — Ігор Савченко',
        description: 'Залишок 15400 грн, заїзд через 3 дні',
        status: 'PENDING',
        assignedToId: closerUser.id,
        dueAt: new Date(Date.now() + 48 * 60 * 60 * 1000)
      }
    ]
  });
  console.log('✅ Demo tasks created');

  // --- 3 дзвінки (PhoneCall) ---
  await prisma.phoneCall.createMany({
    data: [
      {
        externalId: 'demo-call-001',
        direction: 'INCOMING',
        status: 'COMPLETED',
        callerPhone: '+380671111111',
        calleePhone: '+380800301234',
        managerId: closerUser.id,
        employeeName: 'Клозер',
        duration: 185,
        calledAt: new Date(Date.now() - 3 * 60 * 60 * 1000)
      },
      {
        externalId: 'demo-call-002',
        direction: 'INCOMING',
        status: 'MISSED',
        callerPhone: '+380672222222',
        calleePhone: '+380800301234',
        managerId: closerUser.id,
        employeeName: 'Клозер',
        duration: 0,
        calledAt: new Date(Date.now() - 5 * 60 * 60 * 1000)
      },
      {
        externalId: 'demo-call-003',
        direction: 'OUTGOING',
        status: 'COMPLETED',
        callerPhone: '+380800301234',
        calleePhone: '+380673333333',
        managerId: closerUser.id,
        employeeName: 'Клозер',
        duration: 247,
        calledAt: new Date(Date.now() - 24 * 60 * 60 * 1000)
      }
    ]
  });
  console.log('✅ Demo phone calls created');

  // --- Inbox + 3 розмови (Conversation + Messages) ---
  const tgInbox = await prisma.inbox.upsert({
    where: { channelType_externalId: { channelType: 'TELEGRAM', externalId: 'demo-bot-001' } },
    update: {},
    create: {
      channelType: 'TELEGRAM',
      name: 'Telegram — Ruta Polyana',
      externalId: 'demo-bot-001',
      brandId: polyana.id
    }
  });

  await prisma.conversation.create({
    data: {
      inboxId: tgInbox.id,
      channel: 'TELEGRAM',
      status: 'OPEN',
      guestId: guest1.id,
      assignedToId: closerUser.id,
      externalThreadId: '111222333',
      unreadByManager: true,
      messages: {
        create: [
          {
            ...msgFields(tgInbox.id),
            direction: 'INBOUND',
            content: 'Доброго дня! Цікавлюся відпочинком у червні, чи є вільні місця?',
            externalId: 'msg-tg-001',
            sentAt: new Date(Date.now() - 2 * 60 * 60 * 1000)
          },
          {
            ...msgFields(tgInbox.id),
            direction: 'OUTBOUND',
            content: 'Добрий день! Так, маємо вільні номери на червень. Які дати вас цікавлять?',
            externalId: 'msg-tg-002',
            sentAt: new Date(Date.now() - 60 * 60 * 1000)
          },
          {
            ...msgFields(tgInbox.id),
            direction: 'INBOUND',
            content: 'З 1 по 5 червня, 2 дорослих',
            externalId: 'msg-tg-003',
            sentAt: new Date(Date.now() - 50 * 60 * 1000)
          }
        ]
      }
    }
  });
  await prisma.conversation.create({
    data: {
      inboxId: tgInbox.id,
      channel: 'TELEGRAM',
      status: 'PENDING',
      guestId: guest2.id,
      assignedToId: closerUser.id,
      externalThreadId: '444555666',
      unreadByManager: false,
      messages: {
        create: [
          {
            ...msgFields(tgInbox.id),
            direction: 'INBOUND',
            content: 'Привіт, я у вас вже була торік. Є знижки для постійних гостей?',
            externalId: 'msg-tg-004',
            sentAt: new Date(Date.now() - 6 * 60 * 60 * 1000)
          },
          {
            ...msgFields(tgInbox.id),
            direction: 'OUTBOUND',
            content:
              'Доброго дня, Марино! Так, для постійних гостей діє програма лояльності. Надішлю деталі.',
            externalId: 'msg-tg-005',
            sentAt: new Date(Date.now() - 5 * 60 * 60 * 1000)
          }
        ]
      }
    }
  });
  await prisma.conversation.create({
    data: {
      inboxId: tgInbox.id,
      channel: 'TELEGRAM',
      status: 'RESOLVED',
      guestId: guest3.id,
      assignedToId: closerUser.id,
      externalThreadId: '777888999',
      unreadByManager: false,
      messages: {
        create: [
          {
            ...msgFields(tgInbox.id),
            direction: 'INBOUND',
            content: 'Хочу забронювати 2 номери з 20 по 25 травня для сімʼї',
            externalId: 'msg-tg-006',
            sentAt: new Date(Date.now() - 48 * 60 * 60 * 1000)
          },
          {
            ...msgFields(tgInbox.id),
            direction: 'OUTBOUND',
            content: 'Чудово! Оформив бронювання P260417004. Посилання на оплату надіслав.',
            externalId: 'msg-tg-007',
            sentAt: new Date(Date.now() - 47 * 60 * 60 * 1000)
          }
        ]
      }
    }
  });
  console.log('✅ Demo conversations + messages created');

  // --- KPI demo дані (для BI) ---
  const now = new Date();
  const month = now.getMonth() + 1;
  const year = now.getFullYear();
  const kpiEntries = [
    { metric: 'REVENUE_TOTAL' as const, actual: 487500, plan: 520000 },
    { metric: 'OCCUPANCY_PCT' as const, actual: 72, plan: 80 },
    { metric: 'ADR' as const, actual: 3125, plan: 3250 },
    { metric: 'REVPAR' as const, actual: 2250, plan: 2600 },
    { metric: 'BOOKINGS_COUNT' as const, actual: 156, plan: 180 },
    { metric: 'CONVERSION_PCT' as const, actual: 66.7, plan: 75 }
  ];
  for (const kpi of kpiEntries) {
    await prisma.kpiActual.upsert({
      where: {
        propertyId_metric_month_year: { propertyId: polyana.id, metric: kpi.metric, month, year }
      },
      update: { value: kpi.actual },
      create: { propertyId: polyana.id, metric: kpi.metric, month, year, value: kpi.actual }
    });
    await prisma.kpiPlan.upsert({
      where: {
        propertyId_metric_month_year: { propertyId: polyana.id, metric: kpi.metric, month, year }
      },
      update: { value: kpi.plan },
      create: {
        propertyId: polyana.id,
        metric: kpi.metric,
        month,
        year,
        value: kpi.plan,
        createdBy: adminUser.id
      }
    });
  }
  console.log('✅ Demo KPI data created');

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
