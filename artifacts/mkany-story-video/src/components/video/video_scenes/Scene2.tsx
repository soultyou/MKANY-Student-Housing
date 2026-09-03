import { motion } from 'framer-motion';
import { BadgeCheck, BedDouble, CalendarDays, Check, MapPin, ShieldCheck, Star } from 'lucide-react';

const ease = [0.16, 1, 0.3, 1] as const;

export function Scene2() {
  return (
    <motion.section
      key="verified"
      className="absolute inset-0 overflow-hidden"
      initial={{ opacity: 0, clipPath: 'polygon(100% 0,100% 0,100% 100%,100% 100%)' }}
      animate={{ opacity: 1, clipPath: 'polygon(0 0,100% 0,100% 100%,0 100%)' }}
      exit={{ opacity: 0, clipPath: 'polygon(0 0,0 0,0 100%,0 100%)' }}
      transition={{ duration: 0.9, ease }}
    >
      <div className="absolute inset-0 bg-[linear-gradient(125deg,#f5efe5_0%,#f5efe5_56%,#e1c99f_56%,#d9b98c_100%)]" />
      <div className="absolute inset-y-0 right-0 w-[44%] opacity-30 line-grid" />
      <div className="absolute -right-[8vw] -top-[13vw] h-[38vw] w-[38vw] rounded-full border-[1.1vw] border-[#17494d]/15" />
      <motion.div
        className="absolute bottom-[7vh] left-[7vw] h-[10vw] w-[10vw] rounded-full bg-[#ef765e]/18"
        animate={{ y: [0, -18, 0], rotate: [0, 20, 0] }}
        transition={{ duration: 5.5, repeat: Infinity, ease: 'easeInOut' }}
      />

      <div className="absolute left-[9vw] top-[16vh] w-[30vw] text-right text-[#17494d]">
        <motion.div
          className="mb-[1.5vh] text-[.95vw] font-bold tracking-[.14em] text-[#ef765e]"
          initial={{ opacity: 0, y: '1vw' }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2, duration: 0.5, ease }}
        >
          اختار بثقة
        </motion.div>
        <motion.h2
          className="arabic text-[4.25vw] font-black leading-[1.12] tracking-[-.06em]"
          initial={{ opacity: 0, x: '-2vw' }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.34, duration: 0.75, ease }}
        >
          كل إعلان
          <br />
          <span className="text-[#ef765e]">وراه حقيقة.</span>
        </motion.h2>
        <motion.p
          className="arabic mt-[2.3vh] text-[1.35vw] leading-[1.75] text-[#617477]"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.78, duration: 0.65 }}
        >
          صور حقيقية، بيانات واضحة، ووسام تحقق يخلّي قرارك أسهل.
        </motion.p>
        <motion.div
          className="mt-[3.5vh] flex items-center justify-end gap-3 text-[.95vw] font-bold"
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 1.12, duration: 0.55, ease }}
        >
          <span className="flex h-[2.3vw] w-[2.3vw] items-center justify-center rounded-full bg-[#699b80] text-[#f5efe5]"><Check size="1.2vw" /></span>
          لا مفاجآت يوم الاستلام
        </motion.div>
      </div>

      <motion.div
        className="absolute right-[9vw] top-[14vh] w-[39vw] max-w-[560px] rotate-[1.5deg]"
        initial={{ opacity: 0, y: '4vw', rotate: 5 }}
        animate={{ opacity: 1, y: 0, rotate: 1.5 }}
        transition={{ delay: 0.42, duration: 0.95, ease }}
      >
        <div className="overflow-hidden rounded-[1.5vw] bg-[#fffaf1] p-[1.3vw] shadow-[0_1.9vw_4vw_rgba(23,73,77,.18)]">
          <div className="relative h-[22vh] min-h-[145px] overflow-hidden rounded-[.9vw] bg-[linear-gradient(135deg,#567a77,#b8a582)]">
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_70%_15%,rgba(245,239,229,.75),transparent_22%),linear-gradient(135deg,transparent_42%,rgba(23,73,77,.45))]" />
            <div className="absolute bottom-[10%] left-[10%] h-[44%] w-[48%] rounded-t-[50%] border-[.5vw] border-[#f5efe5]/80 border-b-0" />
            <div className="absolute right-[10%] top-[14%] h-[55%] w-[23%] rounded-[.3vw] border-[.3vw] border-[#f5efe5]/60" />
            <div className="absolute left-[4%] top-[5%] flex items-center gap-1 rounded-full bg-[#f5efe5]/90 px-[.7vw] py-[.4vw] text-[.68vw] font-bold text-[#17494d]"><MapPin size=".8vw" /> كفر الشيخ</div>
            <div className="absolute bottom-[6%] right-[5%] rounded-full bg-[#17494d] px-[.8vw] py-[.35vw] text-[.68vw] font-bold text-[#f5efe5]">مفروشة بالكامل</div>
          </div>
          <div className="grid grid-cols-[1fr_auto] gap-[1vw] px-[.45vw] pt-[1.1vw] text-right">
            <div>
              <div className="mb-[.35vw] flex items-center gap-1 text-[.7vw] text-[#617477]"><MapPin size=".8vw" /> شارع الجلاء، كفر الشيخ</div>
              <h3 className="arabic text-[1.45vw] font-black text-[#17494d]">غرفة مضيئة قرب الجامعة</h3>
              <div className="mt-[.6vw] flex gap-[1vw] text-[.7vw] text-[#617477]"><span className="flex items-center gap-1"><BedDouble size=".8vw" /> ٣ غرف</span><span className="flex items-center gap-1"><CalendarDays size=".8vw" /> متاحة الآن</span></div>
            </div>
            <div className="text-left"><strong className="mono text-[1.55vw] font-semibold text-[#ef765e]">950</strong><span className="block text-[.65vw] text-[#617477]">جنيه / شهر</span></div>
          </div>
          <div className="mt-[1vw] flex items-center justify-between border-t border-[#17494d]/10 pt-[.85vw]">
            <div className="flex items-center gap-[.5vw] rounded-full bg-[#699b80]/12 px-[.7vw] py-[.4vw] text-[.7vw] font-bold text-[#3e775d]"><ShieldCheck size=".9vw" /> إعلان متحقق</div>
            <div className="flex items-center gap-[.25vw] text-[.72vw] font-bold text-[#c78532]"><Star size=".85vw" fill="currentColor" /> ٤٫٨ / ٥</div>
          </div>
        </div>
        <motion.div
          className="absolute -bottom-[2.1vw] -left-[2.4vw] flex items-center gap-[.55vw] rounded-full border border-[#17494d]/10 bg-[#f5efe5] px-[1vw] py-[.7vw] text-[.78vw] font-bold text-[#17494d] shadow-lg"
          initial={{ opacity: 0, scale: 0.7, x: '-1vw' }}
          animate={{ opacity: 1, scale: 1, x: 0 }}
          transition={{ delay: 1.35, duration: 0.5, ease }}
        >
          <BadgeCheck size="1.1vw" className="text-[#699b80]" /> فحص مكاني مكتمل
        </motion.div>
      </motion.div>
    </motion.section>
  );
}
