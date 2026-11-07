import { StudyTimer } from '@/components/study-timer';
export default function TimerPage() {
  return (
    <div className="mx-auto max-w-3xl p-5 md:p-10">
      <h1 className="text-3xl font-black">المؤقت</h1>
      <p className="mt-2 text-slate-500">ركّز 25 دقيقة، خد استراحة، وكرر. الجلسات اللي تخلصها بتتسجل في يومك.</p>
      <div className="mt-6"><StudyTimer /></div>
    </div>
  );
}
