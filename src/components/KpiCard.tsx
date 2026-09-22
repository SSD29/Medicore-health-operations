import React from 'react';

interface KpiCardProps {
  id?: string;
  title: string;
  value: string | number;
  subtitle?: string;
  benchmarkText?: string;
  benchmarkStatus?: 'positive' | 'negative' | 'neutral' | 'warning';
  icon: React.FC<{ className?: string }>;
  accentColor?: 'teal' | 'blue' | 'amber' | 'rose' | 'indigo' | 'emerald' | 'purple';
}

export const KpiCard: React.FC<KpiCardProps> = ({
  id,
  title,
  value,
  subtitle,
  benchmarkText,
  benchmarkStatus = 'neutral',
  icon: Icon,
  accentColor = 'teal',
}) => {
  const colorMap = {
    teal: {
      bg: 'bg-teal-50',
      border: 'border-teal-200/60',
      iconBg: 'bg-teal-500/10 text-teal-600',
      badgeBg: 'bg-teal-50 text-teal-700 border-teal-200',
    },
    blue: {
      bg: 'bg-blue-50',
      border: 'border-blue-200/60',
      iconBg: 'bg-blue-500/10 text-blue-600',
      badgeBg: 'bg-blue-50 text-blue-700 border-blue-200',
    },
    amber: {
      bg: 'bg-amber-50',
      border: 'border-amber-200/60',
      iconBg: 'bg-amber-500/10 text-amber-600',
      badgeBg: 'bg-amber-50 text-amber-700 border-amber-200',
    },
    rose: {
      bg: 'bg-rose-50',
      border: 'border-rose-200/60',
      iconBg: 'bg-rose-500/10 text-rose-600',
      badgeBg: 'bg-rose-50 text-rose-700 border-rose-200',
    },
    indigo: {
      bg: 'bg-indigo-50',
      border: 'border-indigo-200/60',
      iconBg: 'bg-indigo-500/10 text-indigo-600',
      badgeBg: 'bg-indigo-50 text-indigo-700 border-indigo-200',
    },
    emerald: {
      bg: 'bg-emerald-50',
      border: 'border-emerald-200/60',
      iconBg: 'bg-emerald-500/10 text-emerald-600',
      badgeBg: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    },
    purple: {
      bg: 'bg-purple-50',
      border: 'border-purple-200/60',
      iconBg: 'bg-purple-500/10 text-purple-600',
      badgeBg: 'bg-purple-50 text-purple-700 border-purple-200',
    },
  };

  const c = colorMap[accentColor] || colorMap.teal;

  const statusBadgeClass = {
    positive: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    negative: 'bg-rose-50 text-rose-700 border-rose-200',
    warning: 'bg-amber-50 text-amber-800 border-amber-200',
    neutral: 'bg-slate-50 text-slate-600 border-slate-200',
  }[benchmarkStatus];

  return (
    <div
      id={id}
      className="bg-white rounded-xl border border-slate-200/80 p-4 shadow-xs hover:shadow-sm transition-shadow relative overflow-hidden flex flex-col justify-between"
    >
      <div className="flex items-start justify-between gap-2 mb-2">
        <span className="text-[12px] font-semibold text-slate-500 tracking-wide uppercase">
          {title}
        </span>
        <div className={`p-2 rounded-lg ${c.iconBg}`}>
          <Icon className="w-4 h-4" />
        </div>
      </div>

      <div className="mb-2">
        <div className="text-2xl font-bold text-slate-900 tracking-tight">{value}</div>
        {subtitle && <div className="text-[11px] text-slate-400 mt-0.5">{subtitle}</div>}
      </div>

      {benchmarkText && (
        <div className="pt-2 border-t border-slate-100 flex items-center">
          <span
            className={`inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium border ${statusBadgeClass}`}
          >
            {benchmarkText}
          </span>
        </div>
      )}
    </div>
  );
};
