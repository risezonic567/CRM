import React, { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { Edit3, X, Loader2 } from 'lucide-react';
import UserFormBody from './UserFormBody';
import { useUpdateUserMutation } from '../../../../REDUX_FEATURES/REDUX_SLICES/User_api/userApi';
import { getErrorMessage } from '../../../../utils/getErrorMessage';

const UserEditForm = ({ open, user, onClose }) => {
  const [values, setValues] = useState(null);
  const [updateUser, { isLoading }] = useUpdateUserMutation();

  useEffect(() => {
    if (user) {
      setValues({
        firstName: user.firstName,
        lastName: user.lastName,
        email: user.email,
        password: '',
        role: user.role,
        isActive: user.isActive,
      });
    }
  }, [user]);

  if (!open || !values) return null;

  const handleSubmit = async () => {
    try {
      const body = { ...values };
      if (!body.password) delete body.password;
      await updateUser({ id: user.id || user._id, body }).unwrap();
      toast.success('User updated successfully');
      onClose?.();
    } catch (err) {
      toast.error(getErrorMessage(err, 'Update failed'));
    }
  };

  return (
    <div className="fixed inset-0 bg-slate-950/40 backdrop-blur-xs z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div
        className="bg-white rounded-xl w-full max-w-lg max-h-[90vh] overflow-y-auto shadow-2xl border border-slate-200 flex flex-col"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
      >
        <div className="p-4 sm:px-6 border-b border-slate-100 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-slate-100 border border-slate-200 flex items-center justify-center text-slate-800">
              <Edit3 className="w-4 h-4" strokeWidth={1.8} />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900">Edit Team Member</h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Update account details, role permissions, and active status
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 hover:bg-slate-100 w-7 h-7 rounded-md flex items-center justify-center transition-colors cursor-pointer"
            aria-label="Close dialog"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-4 sm:p-6">
          <UserFormBody values={values} onChange={setValues} mode="edit" />
        </div>

        <div className="py-3 px-4 sm:px-6 bg-slate-50 border-t border-slate-100 flex items-center justify-end gap-2.5">
          <button
            type="button"
            onClick={onClose}
            className="px-3.5 py-2 text-xs font-medium text-slate-600 bg-white hover:bg-slate-50 border border-slate-300 rounded-lg transition-colors cursor-pointer shadow-xs"
          >
            Cancel
          </button>
          <button
            type="button"
            disabled={isLoading}
            className="inline-flex items-center gap-2 px-4 py-2 text-xs font-semibold text-white bg-slate-900 hover:bg-slate-800 disabled:opacity-60 disabled:cursor-not-allowed rounded-lg border border-slate-900 transition-colors shadow-xs cursor-pointer"
            onClick={handleSubmit}
          >
            {isLoading ? (
              <>
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                Saving…
              </>
            ) : (
              'Save Changes'
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

export default UserEditForm;
