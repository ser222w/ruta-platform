import { AbilityBuilder, createMongoAbility } from '@casl/ability';
import type { Role } from '@prisma/client';

export function defineAbilitiesFor(role: Role, userId?: string) {
  const { can, build } = new AbilityBuilder(createMongoAbility);

  switch (role) {
    case 'ADMIN':
      can('manage', 'all');
      break;

    case 'DIRECTOR':
      can('read', 'all');
      can('update', 'Booking');
      can('manage', 'User');
      break;

    case 'CLOSER':
      can('read', 'Booking');
      can('create', 'Booking');
      if (userId) {
        can('update', 'Booking', { closerId: userId });
      }
      can('read', 'GuestProfile');
      can('create', 'GuestProfile');
      break;

    case 'FARMER':
      can('read', 'Booking', {
        stage: { $in: ['PREPAYMENT', 'DEVELOPMENT', 'CHECKIN', 'CHECKOUT'] }
      });
      if (userId) {
        can('update', 'Booking', { farmerId: userId });
      }
      break;

    case 'HOUSEKEEPER':
      can('read', 'Booking', {
        stage: { $in: ['CHECKIN', 'CHECKOUT'] }
      });
      break;

    case 'REVENUE_MANAGER':
      can('read', 'all');
      can('manage', 'Tariff');
      can('manage', 'RoomCategory');
      break;
  }

  return build();
}
