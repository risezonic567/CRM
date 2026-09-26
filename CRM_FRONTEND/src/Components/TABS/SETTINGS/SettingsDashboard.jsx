import React from 'react';
import { useSearchParams } from 'react-router-dom';
import { Users, Building2 } from 'lucide-react';
import UserTab from './UserTab/UserTab';
import CompanyTab from './CompanyTab/CompanyTab';
import { SETTINGS_TAB_REGISTRY } from './settingsTabRegistry';
import { canViewSubTab } from '../../roles';

const SettingsDashboard = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const ctab = searchParams.get('ctab') || 'users';

  const tabs = SETTINGS_TAB_REGISTRY.filter((t) =>
    canViewSubTab('settings', t.id)
  );

  const active = tabs.some((t) => t.id === ctab) ? ctab : tabs[0]?.id;

  const renderTabIcon = (id) => {
    switch (id) {
      case 'users':
        return <Users className="w-3.5 h-3.5" />;
      case 'company':
        return <Building2 className="w-3.5 h-3.5" />;
      default:
        return null;
    }
  };

  return (
    <div className="flex flex-col gap-5 text-slate-900 font-sans">
      <div className="flex flex-col gap-3.5 pb-2 border-b border-slate-100">
        <div>
          <h1 className="text-xl font-bold text-slate-900 tracking-tight">Agency & System Settings</h1>
          <p className="text-[13px] text-slate-500 mt-0.5">
            Manage agency branding, financial margins, and user access levels.
          </p>
        </div>

        <div className="inline-flex items-center gap-1 bg-slate-100 p-1 rounded-lg border border-slate-200 w-fit">
          {tabs.map((t) => (
            <button
              key={t.id}
              type="button"
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-md transition-all cursor-pointer ${
                active === t.id
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-500 hover:text-slate-900'
              }`}
              onClick={() => setSearchParams({ tab: 'settings', ctab: t.id })}
            >
              {renderTabIcon(t.id)}
              <span>{t.label}</span>
            </button>
          ))}
        </div>
      </div>

      <div className="mt-1">
        {active === 'users' && <UserTab />}
        {active === 'company' && <CompanyTab />}
      </div>
    </div>
  );
};

export default SettingsDashboard;
