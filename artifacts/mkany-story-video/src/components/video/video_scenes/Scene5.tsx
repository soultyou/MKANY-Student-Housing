import { motion } from 'framer-motion';
import { BarChart3, Building2, Check, Home, Plus, Store, TrendingUp, Users } from 'lucide-react';

const ease = [0.16, 1, 0.3, 1] as const;

export function Scene5() {
  return (
    <motion.section
      key="owners"
      className="absolute inset-0 overflow-hidden"
      initial={{ opacity: 0, clipPath: 'circle(0% at 18% 50%)' }}
      animate={{ opacity: 1, clipPath: 'circle(120% at 18% 50%)' }}
      exit={{ opacity: 0, clipPath: 'circle(0% at 50% 50%)' }}
      transition={{ duration: 1.05, ease }}
    >
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_18%_42%,#326c6c_0%,#17494d_44%,#102f36_100%)]" />
      <div className="absolute inset-0 opacity-[.07] line-grid" />
      <motion.div className="absolute -right-[7vw] top-[7vh] h-[32vw] w-[32vw] rounded-full border-[1.3vw] border-[#d9b98c]/20" animate={{ rotate: 360 }} transition={{ duration: 28, repeat: Infinity, ease: 'linear' }} />
      <motion.div className="absolute bottom-[5vh] left-[29vw] h-[12vw] w-[12vw] rounded-full bg-[#ef765e]/10 blur-[1.5vw]" animate={{ y: [0, -16, 0] }} transition={{ duration: 4, repeat: Infinity, ease: 'easeInOut' }} />

      <div className="absolute left-[9vw] top-[19vh] w-[37vw] text-right text-[#f5efe5]">
        <motion.div className="mb-[1.4vh] flex items-center gap-[.6vw] text-[.9vw] font-bold tracking-[.15em] text-[#d9b98c]" initial={{ opacity: 0, x: '-2vw' }} animate={{ opacity: 1, x: 0 }} transition={{ delay: .2, duration: .55, ease }}><span className="h-[.16vw] w-[3vw] bg-[#ef765e]" /> وللملاك… مساحة أكبر</motion.div>
        <motion.h2 className="arabic text-[4.65vw] font-black leading-[1.08] tracking-[-.065em]" initial={{ opacity: 0, y: '1.5vw' }} animate={{ opacity: 1, y: 0 }} transition={{ delay: .36, duration: .8, ease }}>بيتك يستاهل<br /><span className="text-[#d9b98c]">المستأجر الصح.</span></motion.h2>
        <motion.p className="arabic mt-[2.5vh] max-w-[29vw] text-[1.35vw] leading-[1.75] text-[#f5efe5]/70" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: .78, duration: .65 }}>اعرض وحدتك، تابع طلباتك، واملأها بطلاب موثوقين — من مكان واحد.</motion.p>
        <motion.div className="mt-[3.5vh] flex items-center gap-[.7vw] text-[.9vw] font-bold text-[#d9b98c]" initial={{ opacity: 0, scale: .9 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 1.15, duration: .5, ease }}><span className="flex h-[2.2vw] w-[2.2vw] items-center justify-center rounded-full bg-[#ef765e] text-[#f5efe5]"><Plus size="1.1vw" /></span> سوق سكني مبني على الثقة</motion.div>
      </div>

      <motion.div className="absolute right-[8vw] top-[13vh] w-[39vw] max-w-[560px] rotate-[2.5deg]" initial={{ opacity: 0, x: '3vw', y: '3vw', rotate: 8 }} animate={{ opacity: 1, x: 0, y: 0, rotate: 2.5 }} transition={{ delay: .38, duration: 1, ease }}>
        <div className="rounded-[1.45vw] bg-[#f5efe5] p-[1.25vw] text-[#17494d] shadow-[0_2vw_5vw_rgba(6,31,37,.3)]">
          <div className="mb-[1.2vw] flex items-center justify-between border-b border-[#17494d]/10 pb-[.9vw]">
            <div className="flex items-center gap-[.65vw]"><div className="flex h-[2.4vw] w-[2.4vw] items-center justify-center rounded-[.7vw] bg-[#17494d] text-[#d9b98c]"><Store size="1.2vw" /></div><div><strong className="arabic block text-[1vw]">سوق الملاك</strong><span className="arabic text-[.65vw] text-[#617477]">نظرة سريعة على وحداتك</span></div></div>
            <div className="flex items-center gap-[.35vw] rounded-full bg-[#699b80]/12 px-[.7vw] py-[.4vw] text-[.65vw] font-bold text-[#3e775d]"><span className="h-[.45vw] w-[.45vw] rounded-full bg-[#699b80]" /> مباشر</div>
          </div>
          <div className="grid grid-cols-3 gap-[.7vw]">
            {[['الوحدات النشطة', '١٢', Home, 'bg-[#d9b98c]/35'], ['طلبات هذا الشهر', '٤٧', Users, 'bg-[#ef765e]/20'], ['إشغال الوحدات', '٨٦٪', TrendingUp, 'bg-[#699b80]/20']].map(([label, value, Icon, bg]) => {
              const IconComponent = Icon as typeof Home;
              return <div key={label as string} className="rounded-[.8vw] border border-[#17494d]/8 p-[.8vw] text-right"><div className={`mb-[.8vw] flex h-[1.85vw] w-[1.85vw] items-center justify-center rounded-[.5vw] ${bg}`}><IconComponent size="1vw" /></div><strong className="mono block text-[1.45vw]">{value as string}</strong><span className="arabic text-[.62vw] text-[#617477]">{label as string}</span></div>;
            })}
          </div>
          <div className="mt-[1vw] flex items-end gap-[.6vw] rounded-[.8vw] bg-[#17494d] p-[1vw] text-[#f5efe5]">
            <div className="flex-1"><div className="mb-[.6vw] flex items-center justify-between text-[.62vw] text-[#f5efe5]/60"><span>نشاط الحجوزات</span><span className="flex items-center gap-1 text-[#d9b98c]"><BarChart3 size=".8vw" /> آخر ٦ أشهر</span></div><div className="flex h-[4vw] items-end gap-[.5vw]">{[35, 52, 43, 67, 61, 88, 76, 94].map((height, i) => <motion.div key={i} className={`flex-1 rounded-t-[.25vw] ${i === 7 ? 'bg-[#ef765e]' : 'bg-[#d9b98c]'}`} initial={{ height: 0 }} animate={{ height: `${height}%` }} transition={{ delay: .9 + i * .06, duration: .45, ease }} />)}</div></div>
            <div className="flex w-[7vw] flex-col items-center justify-center border-r border-[#f5efe5]/15 pr-[.8vw] text-center"><Building2 className="mb-[.5vw] text-[#d9b98c]" size="1.25vw" /><strong className="mono text-[1.4vw]">+٢٫٤K</strong><span className="arabic text-[.58vw] text-[#f5efe5]/55">وحدة موثقة</span></div>
          </div>
          <motion.div className="mt-[.9vw] flex items-center justify-between rounded-[.7vw] border border-[#699b80]/25 bg-[#699b80]/10 px-[.8vw] py-[.65vw]" initial={{ opacity: 0, y: '.6vw' }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 1.55, duration: .5, ease }}><span className="flex items-center gap-[.5vw] text-[.7vw] font-bold text-[#3e775d]"><Check size=".9vw" /> طلب جديد من طالب متوافق</span><span className="arabic text-[.62vw] text-[#617477]">منذ دقيقتين</span></motion.div>
        </div>
      </motion.div>

      <motion.div className="absolute bottom-[5vh] right-[8vw] text-[.72vw] font-bold tracking-[.12em] text-[#f5efe5]/35" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 1.5 }}>MKANY / مكاني · بيتك، على طريقتك</motion.div>
    </motion.section>
  );
}
