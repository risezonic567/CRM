import React, { useState } from 'react';
import { UserPlus, Edit3, Users, Loader2 } from 'lucide-react';
import { useListUsersQuery } from '../../../../REDUX_FEATURES/REDUX_SLICES/User_api/userApi';
import { ROLE_LABELS, ROLES } from '../../../roles';
import UserAddForm from './UserAddForm';
import UserEditForm from './UserEditForm';

const getUserInitials = (firstName, lastName) => {
  const f = firstName?.[0] || '';
  const l = lastName?.[0] || '';
  return (f + l).toUpperCase() || '?';
};

const getRoleBadgeConfig = (role) => {
  switch (role) {
    case ROLES.ADMIN:
      return 'bg-slate-100 text-slate-800 border-slate-300';
    case ROLES.AGENT:
      return 'bg-sky-50 text-sky-800 border-sky-200';
    default:
      return 'bg-slate-50 text-slate-600 border-slate-200';
  }
};

const UserTab = () => {
  const { data, isFetching } = useListUsersQuery({ page: 1, limit: 50 });
  const [addOpen, setAddOpen] = useState(false);
  const [editUser, setEditUser] = useState(null);
  const users = data?.data || [];

  return (
    <div className="space-y-4">
      {/* Toolbar */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <h2 className="text-sm font-bold text-slate-900">Team Members</h2>
          <span className="text-[11px] font-semibold bg-slate-100 text-slate-600 px-2 py-0.5 rounded-full border border-slate-200">
            {users.length} users
          </span>
        </div>

        <button
          type="button"
          className="inline-flex items-center gap-1.5 bg-slate-900 hover:bg-slate-800 text-white px-3.5 py-1.5 rounded-lg text-xs font-semibold border border-slate-900 transition-colors shadow-sm cursor-pointer"
          onClick={() => setAddOpen(true)}
        >
          <UserPlus className="w-3.5 h-3.5" />
          Add Member
        </button>
      </div>

      {isFetching ? (
        <div className="bg-white border border-slate-200 rounded-lg overflow-hidden shadow-xs">
          <div className="py-14 px-6 text-center flex flex-col items-center justify-center gap-3 text-slate-500 text-xs">
            <Loader2 className="w-6 h-6 animate-spin text-slate-700" />
            <p>Loading team members…</p>
          </div>
        </div>
      ) : (
        <div className="bg-white border border-slate-200 rounded-lg overflow-hidden shadow-xs">
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-left text-xs">
              <thead className="bg-slate-50 border-b border-slate-200">
                <tr>
                  <th className="py-3 px-4 text-[11px] font-bold uppercase tracking-wider text-slate-500 whitespace-nowrap">Member</th>
                  <th className="py-3 px-4 text-[11px] font-bold uppercase tracking-wider text-slate-500 whitespace-nowrap">Email Address</th>
                  <th className="py-3 px-4 text-[11px] font-bold uppercase tracking-wider text-slate-500 whitespace-nowrap">Role</th>
                  <th className="py-3 px-4 text-[11px] font-bold uppercase tracking-wider text-slate-500 whitespace-nowrap">Status</th>
                  <th className="py-3 px-4 text-[11px] font-bold uppercase tracking-wider text-slate-500 whitespace-nowrap text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {users.map((u) => {
                  const fullName = `${u.firstName || ''} ${u.lastName || ''}`.trim() || 'Unnamed';
                  const initials = getUserInitials(u.firstName, u.lastName);
                  const roleClass = getRoleBadgeConfig(u.role);

                  return (
                    <tr key={u.id || u._id} className="hover:bg-slate-50/75 transition-colors">
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-2.5">
                          <div className="w-6 h-6 rounded-full bg-slate-100 text-slate-600 flex items-center justify-center text-[10px] font-bold border border-slate-200 shrink-0">
                            {initials}
                          </div>
                          <span className="font-semibold text-slate-900">{fullName}</span>
                        </div>
                      </td>

                      <td className="py-3 px-4 text-slate-500">
                        {u.email}
                      </td>

                      <td className="py-3 px-4">
                        <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold border ${roleClass}`}>
                          {ROLE_LABELS[u.role] || u.role}
                        </span>
                      </td>

                      <td className="py-3 px-4">
                        <div className={`inline-flex items-center gap-1.5 text-xs font-medium ${u.isActive ? 'text-emerald-600' : 'text-slate-400'}`}>
                          <span className={`w-1.5 h-1.5 rounded-full ${u.isActive ? 'bg-emerald-500' : 'bg-slate-400'}`} />
                          <span>{u.isActive ? 'Active' : 'Inactive'}</span>
                        </div>
                      </td>

                      <td className="py-3 px-4 text-right">
                        <button
                          type="button"
                          className="inline-flex items-center gap-1 px-2.5 py-1 bg-white hover:bg-slate-50 text-slate-700 border border-slate-300 rounded text-xs font-medium transition-colors cursor-pointer shadow-xs"
                          onClick={() => setEditUser(u)}
                        >
                          <Edit3 className="w-3 h-3 text-slate-500" />
                          Edit
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {!users.length && (
            <div className="py-14 px-6 text-center flex flex-col items-center justify-center gap-2">
              <div className="w-11 h-11 rounded-full bg-slate-50 border border-slate-200 text-slate-500 flex items-center justify-center mb-1">
                <Users className="w-5 h-5 text-slate-400" />
              </div>
              <h3 className="text-sm font-semibold text-slate-800">No users registered</h3>
              <p className="text-xs text-slate-500 max-w-xs">
                Click &quot;Add Member&quot; above to create a team account.
              </p>
            </div>
          )}
        </div>
      )}

      {/* Add / Edit Modals */}
      <UserAddForm open={addOpen} onClose={() => setAddOpen(false)} />
      <UserEditForm
        open={Boolean(editUser)}
        user={editUser}
        onClose={() => setEditUser(null)}
      />
    </div>
  );
};

export default UserTab;
