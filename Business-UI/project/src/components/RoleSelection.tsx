import React from 'react';
import { UserCircle2, Building2, Briefcase } from 'lucide-react';
import type { EmployeeRole, UserType } from '../types/auth';

interface RoleSelectionProps {
  selectedType: UserType | null;
  selectedRole: EmployeeRole | null;
  onTypeSelect: (type: UserType) => void;
  onRoleSelect: (role: EmployeeRole) => void;
  onSubmit: () => void;
}

export function RoleSelection({
  selectedType,
  selectedRole,
  onTypeSelect,
  onRoleSelect,
  onSubmit
}: RoleSelectionProps) {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-medium text-gray-900 mb-4">Select your type</h2>
        <div className="grid grid-cols-2 gap-4">
          <button
            type="button"
            onClick={() => onTypeSelect('business')}
            className={`flex flex-col items-center justify-center p-6 border rounded-lg transition-colors ${
              selectedType === 'business'
                ? 'border-indigo-600 bg-indigo-50'
                : 'border-gray-200 hover:border-indigo-600'
            }`}
          >
            <Building2 className={`h-8 w-8 mb-2 ${
              selectedType === 'business' ? 'text-indigo-600' : 'text-gray-400'
            }`} />
            <span className={selectedType === 'business' ? 'text-indigo-600' : 'text-gray-900'}>
              Business
            </span>
          </button>

          <button
            type="button"
            onClick={() => onTypeSelect('employee')}
            className={`flex flex-col items-center justify-center p-6 border rounded-lg transition-colors ${
              selectedType === 'employee'
                ? 'border-indigo-600 bg-indigo-50'
                : 'border-gray-200 hover:border-indigo-600'
            }`}
          >
            <UserCircle2 className={`h-8 w-8 mb-2 ${
              selectedType === 'employee' ? 'text-indigo-600' : 'text-gray-400'
            }`} />
            <span className={selectedType === 'employee' ? 'text-indigo-600' : 'text-gray-900'}>
              Employee
            </span>
          </button>
        </div>
      </div>

      {selectedType === 'employee' && (
        <div>
          <h2 className="text-lg font-medium text-gray-900 mb-4">Select your role</h2>
          <div className="grid grid-cols-3 gap-4">
            {(['engineer', 'doctor', 'sales'] as const).map((role) => (
              <button
                key={role}
                type="button"
                onClick={() => onRoleSelect(role)}
                className={`flex flex-col items-center justify-center p-6 border rounded-lg transition-colors ${
                  selectedRole === role
                    ? 'border-indigo-600 bg-indigo-50'
                    : 'border-gray-200 hover:border-indigo-600'
                }`}
              >
                <Briefcase className={`h-8 w-8 mb-2 ${
                  selectedRole === role ? 'text-indigo-600' : 'text-gray-400'
                }`} />
                <span className={selectedRole === role ? 'text-indigo-600' : 'text-gray-900'}>
                  {role.charAt(0).toUpperCase() + role.slice(1)}
                </span>
              </button>
            ))}
          </div>
        </div>
      )}

      <button
        type="button"
        onClick={onSubmit}
        disabled={!selectedType || (selectedType === 'employee' && !selectedRole)}
        className="w-full bg-indigo-600 text-white py-2 px-4 rounded-lg hover:bg-indigo-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
      >
        Continue
      </button>
    </div>
  );
}