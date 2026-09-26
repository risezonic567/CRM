// Phase 1 roles: admin | agent | viewer

export const ROLES = {
  ADMIN: 'admin',
  AGENT: 'agent',
  VIEWER: 'viewer',
};

export const ROLE_LABELS = {
  [ROLES.ADMIN]: 'Admin',
  [ROLES.AGENT]: 'Agent',
  [ROLES.VIEWER]: 'Viewer',
};

export const ROLE_PERMISSIONS = {
  [ROLES.ADMIN]: ['dashboard', 'calls', 'inquiries', 'settings'],
  [ROLES.AGENT]: ['dashboard', 'calls', 'inquiries'],
  [ROLES.VIEWER]: ['dashboard', 'calls', 'inquiries'],
};

export const SUB_TAB_PERMISSIONS = {
  'settings.users': [ROLES.ADMIN],
  'settings.company': [ROLES.ADMIN],
};

export const CURRENT_USER = {
  role: ROLES.ADMIN,
  name: 'Admin User',
};

export const syncCurrentUserFromAuth = (user) => {
  if (!user) {
    CURRENT_USER.role = ROLES.ADMIN;
    CURRENT_USER.name = 'Admin User';
    return;
  }
  CURRENT_USER.role = user.role || ROLES.ADMIN;
  CURRENT_USER.name =
    [user.firstName, user.lastName].filter(Boolean).join(' ') || user.email || 'User';
};

export const canViewSubTab = (parentTabId, subTabId) => {
  const currentRole = CURRENT_USER.role || ROLES.ADMIN;
  const key = `${parentTabId}.${subTabId}`;
  const allowedRoles = SUB_TAB_PERMISSIONS[key];
  if (allowedRoles) return allowedRoles.includes(currentRole);
  return true;
};

export const filterSubItemsByRole = (parentTabId, subItems) => {
  if (!subItems || !Array.isArray(subItems)) return [];
  return subItems.filter((subItem) => canViewSubTab(parentTabId, subItem.id));
};

export const isViewer = () => CURRENT_USER.role === ROLES.VIEWER;
export const isAdmin = () => CURRENT_USER.role === ROLES.ADMIN;
