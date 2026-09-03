import { motion } from 'framer-motion';
import { CalendarDays, Check, FileText, KeyRound, LockKeyhole, ShieldCheck } from 'lucide-react';

const ease = [0.16, 1, 0.3, 1] as const;

export function Scene4() {
  return (
    <motion.section
      key="book"
      className="absolute inset-0 overflow-hidden"
      initial={{ opacity: 0, clipPath: 'polygon(0 0,0 0,100% 100%,0 100%)' }}
      animate={{ opacity: 1, clipPath: 'polygon(0 0,100% 0,100% 100%,0 100%)' }}
      exit={{ opacity: 0, clipPath: 'polygon(100% 0,100% 0,0 100%,100% 100%)' }}
      transition={{ duration: 0.9, ease }}
    >
      <div className="absolute inset-0 bg-[linear-gradient(116deg,#e8dfd2_0%,#f5efe5_58%,#d9b98c_58%,#caa978_100%)]" />
      <div className="absolute left-0 top-0 h-full w-[48%] opacity-50 line-grid" />
      <div className="absolute left-[3vw] top-[7vh] h-[22vw] w-[22vw] rounded-full border-[.7vw] border-[#17494d]/10" />

      <div className="absolute right-[8vw] top-[17vh] w-[31vw] text-right text-[#17494d]">
        <motion.div className="mb-[1.6vh] flex items-center justify-end gap-[.6vw] text-[.9vw] font-bold tracking-[.15em] text-[#ef765e]" initial={{ opacity: 0, x: '2vw' }} animate={{ opacity: 1, x: 0 }} transition={{ delay: .2, duration: .55, ease }}><span className="h-[.16vw] w-[3vw] bg-[#ef765e]" /> أمان من أول نقرة</motion.div>
        <motion.h2 className="arabic text-[4vw] font-black leading-[1.14] tracking-[-.06em]" initial={{ opacity: 0, y: '1.5vw' }} animate={{ opacity: 1, y: 0 }} transition={{ delay: .38, duration: .75, ease }}>احجز عامك<br /><span className="text-[#ef765e]">وأنت مطمّن.</span></motion.h2>
        <motion.p className="arabic mt-[2.6vh] text-[1.35vw] leading-[1.75] text-[#617477]" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: .8, duration: .6 }}>عقد سنوي واضح، دفع محمي، ومفتاح في موعده.</motion.p>
        <motion.div className="mt-[3.7vh] space-y-[1.1vw]" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 1.12, duration: .55 }}>
          {['عقد إلكتروني موثوق', 'تأكيد فوري للحجز', 'دعم حتى تستلم المفتاح'].map((label, i) => <div className="flex items-center justify-end gap-[.65vw] text-[.9vw] font-bold" key={label}><span>{label}</span><span className="flex h-[1.8vw] w-[1.8vw] items-center justify-center rounded-full bg-[#699b80] text-[#f5efe5]"><Check size=".9vw" strokeWidth={3} /></span><span className="mono text-[.7vw] text-[#8e9b98]">0{i + 1}</span></div>)}
        </motion.div>
      </div>

      <motion.div className="absolute left-[10vw] top-[15vh] w-[32vw] rotate-[-3deg]" initial={{ opacity: 0, y: '4vw', rotate: -9 }} animate={{ opacity: 1, y: 0, rotate: -3 }} transition={{ delay: .35, duration: .95, ease }}>
        <div className="relative overflow-hidden rounded-[1.3vw] bg-[#17494d] p-[1.7vw] text-[#f5efe5] shadow-[0_2vw_4.5vw_rgba(23,73,77,.23)]">
          <div className="absolute -left-[5vw] -top-[5vw] h-[14vw] w-[14vw] rounded-full border border-[#d9b98c]/25" />
          <div className="mb-[2.7vw] flex items-center justify-between border-b border-[#f5efe5]/15 pb-[1vw]">
            <div className="flex items-center gap-[.7vw]"><div className="flex h-[2.2vw] w-[2.2vw] items-center justify-center rounded-[.65vw] bg-[#d9b98c] text-[#17494d]"><FileText size="1.15vw" /></div><div><span className="arabic block text-[.9vw] font-bold">عقد الإيجار السنوي</span><span className="mono text-[.58vw] text-[#f5efe5]/45">MK-2024-09-18</span></div></div>
            <ShieldCheck className="text-[#699b80]" size="1.35vw" />
          </div>
          <div className="space-y-[1.25vw] text-right">
            <div className="flex items-center justify-between border-b border-[#f5efe5]/10 pb-[.9vw]"><span className="mono text-[.82vw] text-[#d9b98c]">950 EGP</span><span className="arabic text-[.72vw] text-[#f5efe5]/55">الإيجار الشهري</span></div>
            <div className="flex items-center justify-between border-b border-[#f5efe5]/10 pb-[.9vw]"><span className="mono text-[.82vw] text-[#d9b98c]">01 / 09 / 24</span><span className="arabic text-[.72vw] text-[#f5efe5]/55">بداية السكن</span></div>
            <div className="flex items-center justify-between"><span className="arabic text-[.82vw] font-bold text-[#f5efe5]">محمية بالكامل</span><LockKeyhole className="text-[#699b80]" size="1vw" /></div>
          </div>
          <motion.div className="mt-[2.2vw] flex items-center gap-[.6vw] rounded-[.7vw] bg-[#f5efe5]/10 px-[.8vw] py-[.7vw] text-[.72vw] font-bold" initial={{ opacity: 0, scale: .9 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 1.25, duration: .5, ease }}><span className="flex h-[1.6vw] w-[1.6vw] items-center justify-center rounded-full bg-[#699b80]"><Check size=".85vw" strokeWidth={3} /></span> تم التوقيع الرقمي بنجاح</motion.div>
          <motion.div className="absolute -right-[1.8vw] -top-[1.5vw] flex h-[4.3vw] w-[4.3vw] items-center justify-center rounded-full border-[.28vw] border-[#f5efe5] bg-[#ef765e] text-[#f5efe5] shadow-xl" animate={{ rotate: [0, 8, 0], scale: [1, 1.05, 1] }} transition={{ duration: 2.7, repeat: Infinity }}><KeyRound size="1.7vw" /></motion.div>
        </div>
        <div className="absolute -bottom-[2.2vw] -right-[2vw] flex items-center gap-[.55vw] rounded-full bg-[#f5efe5] px-[1vw] py-[.65vw] text-[.75vw] font-bold text-[#17494d] shadow-lg"><CalendarDays size="1vw" className="text-[#ef765e]" /> موعد الاستلام: ١ سبتمبر</div>
      </motion.div>
    </motion.section>
  );
}
