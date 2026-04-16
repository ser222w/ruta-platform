import { describe, it, expect } from 'vitest';
import { defineAbilitiesFor } from '@/server/services/abilities';

describe('CASL abilities', () => {
  describe('ADMIN', () => {
    it('може робити все', () => {
      const ability = defineAbilitiesFor('ADMIN', 'admin-1');
      expect(ability.can('read', 'Booking')).toBe(true);
      expect(ability.can('delete', 'User')).toBe(true);
      expect(ability.can('manage', 'all')).toBe(true);
    });
  });

  describe('CLOSER', () => {
    const closerId = 'closer-1';
    const ability = defineAbilitiesFor('CLOSER', closerId);

    it('може читати бронювання', () => {
      expect(ability.can('read', 'Booking')).toBe(true);
    });

    it('може оновлювати свої бронювання', () => {
      // Перевіряємо що може оновити booking з closerId = свій id
      expect(ability.can('update', { __caslSubjectType__: 'Booking', closerId })).toBe(true);
    });

    it('НЕ може оновлювати чужі бронювання', () => {
      expect(
        ability.can('update', { __caslSubjectType__: 'Booking', closerId: 'other-closer' })
      ).toBe(false);
    });

    it('НЕ може видаляти бронювання', () => {
      expect(ability.can('delete', 'Booking')).toBe(false);
    });
  });

  describe('FARMER', () => {
    const farmerId = 'farmer-1';
    const ability = defineAbilitiesFor('FARMER', farmerId);

    it('може читати бронювання на стадії PREPAYMENT+', () => {
      expect(ability.can('read', { __caslSubjectType__: 'Booking', stage: 'PREPAYMENT' })).toBe(
        true
      );
    });

    it('НЕ може читати бронювання на стадії QUALIFY', () => {
      expect(ability.can('read', { __caslSubjectType__: 'Booking', stage: 'QUALIFY' })).toBe(false);
    });

    it('може оновлювати свої бронювання', () => {
      expect(ability.can('update', { __caslSubjectType__: 'Booking', farmerId })).toBe(true);
    });
  });

  describe('HOUSEKEEPER', () => {
    it('може читати бронювання на стадії CHECKIN/CHECKOUT', () => {
      const ability = defineAbilitiesFor('HOUSEKEEPER');
      expect(ability.can('read', { __caslSubjectType__: 'Booking', stage: 'CHECKIN' })).toBe(true);
      expect(ability.can('read', { __caslSubjectType__: 'Booking', stage: 'QUALIFY' })).toBe(false);
    });
  });

  describe('REVENUE_MANAGER', () => {
    it('може читати все та управляти тарифами', () => {
      const ability = defineAbilitiesFor('REVENUE_MANAGER');
      expect(ability.can('read', 'Booking')).toBe(true);
      expect(ability.can('manage', 'Tariff')).toBe(true);
      expect(ability.can('delete', 'User')).toBe(false);
    });
  });
});
