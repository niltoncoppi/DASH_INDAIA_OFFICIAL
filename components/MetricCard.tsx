import React from 'react';

interface MetricCardProps {
  title: string;
  value: string | number;
  subValue?: string;
  color?: 'blue' | 'green' | 'indigo' | 'orange';
  icon?: React.ReactNode;
}

export const MetricCard: React.FC<MetricCardProps> = ({ title, value, subValue, color = 'blue', icon }) => {
  const colorClasses = {
    blue: 'border-l-blue-500 text-blue-600',
    green: 'border-l-green-500 text-green-600',
    indigo: 'border-l-indigo-500 text-indigo-600',
    orange: 'border-l-orange-500 text-orange-600',
  };

  return (
    <div className={`bg-white rounded-lg shadow-sm p-6 border-l-4 ${colorClasses[color]} transition-transform hover:scale-[1.01]`}>
      <div className="flex justify-between items-start">
        <div>
          <p className="text-sm font-medium text-gray-500 uppercase tracking-wider">{title}</p>
          <h3 className="mt-2 text-3xl font-bold text-gray-900">{value}</h3>
          {subValue && (
            <p className="mt-1 text-sm text-gray-500">{subValue}</p>
          )}
        </div>
        {icon && (
          <div className={`p-2 rounded-full bg-opacity-10 bg-${color}-500 text-${color}-600`}>
            {icon}
          </div>
        )}
      </div>
    </div>
  );
};