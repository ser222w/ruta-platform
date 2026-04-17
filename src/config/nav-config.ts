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
        items: []
      },
      {
        title: 'Calls',
        url: '/dashboard/calls',
        icon: 'phone',
        isActive: false,
        items: []
      }
    ]
  },
  {
    label: 'Operations',
    items: [
      {
        title: 'Bookings',
        url: '/dashboard/bookings',
        icon: 'calendar',
        isActive: false,
        items: []
      },
      {
        title: 'Rooms',
        url: '/dashboard/rooms',
        icon: 'workspace',
        isActive: false,
        items: []
      },
      {
        title: 'Payments',
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
        title: 'Reports',
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
