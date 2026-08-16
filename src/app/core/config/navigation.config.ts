import { APP_PERMISSIONS, AppPermission } from './rbac.config';

/**
 * Estrutura única da navegação da sidebar.
 * Para mudar a navegação, edite este array — a sidebar renderiza a partir daqui.
 *
 * `icon` é o nome do ícone Lucide (PascalCase). A sidebar mapeia o nome para o
 * objeto do ícone. Ao adicionar um item com um ícone novo, registre-o também no
 * mapa de ícones da sidebar (sidebar.component.ts).
 */
export interface NavItem {
  label: string;
  route: string;
  icon: string;
  permission: AppPermission;
  exact?: boolean;
}

export interface NavGroup {
  /** Rótulo do grupo. Vazio ('') = grupo sem cabeçalho (itens de topo). */
  label: string;
  items: NavItem[];
}

export const NAVIGATION: NavGroup[] = [
  {
    label: '',
    items: [
      {
        label: 'Dashboard',
        route: '/dashboard',
        icon: 'LayoutDashboard',
        permission: APP_PERMISSIONS.DASHBOARD_READ,
      },
    ],
  },
  {
    label: 'Comercial',
    items: [
      {
        label: 'Pessoas',
        route: '/people',
        icon: 'Users',
        permission: APP_PERMISSIONS.PEOPLE_READ,
      },
      {
        label: 'Interações',
        route: '/interactions',
        icon: 'MessageSquare',
        permission: APP_PERMISSIONS.INTERACTIONS_READ,
      },
    ],
  },
  {
    label: 'Empreendimentos',
    items: [
      {
        label: 'Empreendimentos',
        route: '/developments',
        icon: 'Building2',
        permission: APP_PERMISSIONS.DEVELOPMENTS_READ,
      },
    ],
  },
  {
    label: 'Investidores',
    items: [
      {
        label: 'Investimentos',
        route: '/investments',
        icon: 'TrendingUp',
        permission: APP_PERMISSIONS.INVESTMENTS_READ,
      },
      {
        label: 'Retornos',
        route: '/returns',
        icon: 'Coins',
        permission: APP_PERMISSIONS.RETURNS_READ,
      },
    ],
  },
  {
    label: 'Gestão',
    items: [
      {
        label: 'Relatórios',
        route: '/reports',
        icon: 'FileSpreadsheet',
        permission: APP_PERMISSIONS.REPORTS_EXPORT,
      },
    ],
  },
  {
    label: 'Cadastros',
    items: [
      {
        label: 'Empresas / SPEs',
        route: '/companies',
        icon: 'Landmark',
        permission: APP_PERMISSIONS.COMPANIES_READ,
      },
      {
        label: 'Contas Bancárias',
        route: '/bank-accounts',
        icon: 'Wallet',
        permission: APP_PERMISSIONS.BANK_ACCOUNTS_READ,
      },
    ],
  },
  {
    label: 'Administração',
    items: [
      {
        label: 'Usuários',
        route: '/users',
        icon: 'UserCog',
        permission: APP_PERMISSIONS.USERS_MANAGE,
        exact: true,
      },
      {
        label: 'Convites',
        route: '/users/invitations',
        icon: 'UserPlus',
        permission: APP_PERMISSIONS.USERS_MANAGE,
      },
      {
        label: 'Auditoria',
        route: '/audit-logs',
        icon: 'ScrollText',
        permission: APP_PERMISSIONS.AUDIT_READ,
      },
    ],
  },
];
