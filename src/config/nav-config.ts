import { NavGroup } from '@/types';

export const navGroups: NavGroup[] = [
  {
    label: 'Sales',
    items: [
      {
        title: 'Сьогодні',
        url: '/dashboard/today',
        icon: 'dashboard',
        isActive: true,
        items: []
      },
      {
        title: 'Звернення',
        url: '/dashboard/inquiries',
        icon: 'userPen',
        isActive: false,
        items: []
      },
      {
        title: 'CRM',
        url: '/dashboard/crm',
        icon: 'kanban',
        isActive: false,
        items: []
      },
      {
        title: 'Inbox',
        url: '/dashboard/inbox',
        icon: 'chat',
        isActive: false,
        items: [
          { title: 'Нові', url: '/dashboard/inbox?tab=new' },
          { title: 'На догляді', url: '/dashboard/inbox?tab=mine' },
          { title: 'Всі', url: '/dashboard/inbox?tab=all' },
          { title: 'Архів', url: '/dashboard/inbox?tab=archived' }
        ]
      },
      {
        title: 'Дзвінки',
        url: '/dashboard/calls',
        icon: 'phone',
        isActive: false,
        items: [
          { title: 'Пропущені', url: '/dashboard/calls?tab=missed' },
          { title: 'Черга передзвонів', url: '/dashboard/calls?tab=queue' },
          { title: 'Всі сьогодні', url: '/dashboard/calls?tab=today' }
        ]
      }
    ]
  },
  {
    label: 'Operations',
    items: [
      {
        title: 'Замовлення',
        url: '/dashboard/bookings',
        icon: 'calendar',
        isActive: false,
        items: [
          { title: 'Активні', url: '/dashboard/bookings?tab=active' },
          { title: 'Сплачені', url: '/dashboard/bookings?tab=paid' },
          { title: 'Втрачені', url: '/dashboard/bookings?tab=lost' },
          { title: 'Скасовані', url: '/dashboard/bookings?tab=cancelled' }
        ]
      },
      {
        title: 'Номери',
        url: '/dashboard/rooms',
        icon: 'workspace',
        isActive: false,
        items: []
      },
      {
        title: 'Платежі',
        url: '/dashboard/payments',
        icon: 'billing',
        isActive: false,
        items: []
      }
    ]
  },
  {
    label: 'Analytics',
    items: [
      {
        title: 'Звіти',
        url: '/dashboard/reports',
        icon: 'trendingUp',
        isActive: false,
        items: [],
        roles: ['ADMIN', 'DIRECTOR', 'REVENUE_MANAGER']
      },
      {
        title: 'Planning',
        url: '/dashboard/planning',
        icon: 'adjustments',
        isActive: false,
        items: [],
        roles: ['ADMIN', 'DIRECTOR', 'REVENUE_MANAGER']
      }
    ]
  },
  {
    label: '',
    items: [
      {
        title: 'Account',
        url: '#',
        icon: 'account',
        isActive: true,
        items: [
          {
            title: 'Profile',
            url: '/dashboard/profile',
            icon: 'profile',
            shortcut: ['m', 'm']
          },
          {
            title: 'Notifications',
            url: '/dashboard/notifications',
            icon: 'notification',
            shortcut: ['n', 'n']
          },
          {
            title: 'Settings',
            url: '/dashboard/settings',
            icon: 'settings',
            shortcut: ['s', 's']
          }
        ]
      }
    ]
  }
];
