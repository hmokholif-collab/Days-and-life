'use client';
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';

// رسم أعمدة ساعات آخر 7 أيام — في ملف لوحده عشان يتحمّل lazy من صفحة الإحصائيات.
export default function WeeklyChart({ data, hoursWord, hoursLabel }: { data: { day: string; hours: number }[]; hoursWord: string; hoursLabel: string }) {
  return (
    <div className="mt-6 h-72" dir="ltr">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data}>
          <CartesianGrid strokeDasharray="3 3" vertical={false} />
          <XAxis dataKey="day" />
          <YAxis />
          <Tooltip formatter={(v) => [`${v} ${hoursWord}`, hoursLabel]} />
          <Bar dataKey="hours" fill="#ff6b5f" radius={[8, 8, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
