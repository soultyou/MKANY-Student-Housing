import { motion } from 'framer-motion';
import { Building2, MapPin, Search, Sparkles } from 'lucide-react';

const ease = [0.16, 1, 0.3, 1] as const;

export function Scene1() {
  return (
    <motion.section
      key="discover"
      className="absolute inset-0 overflow-hidden"
      initial={{ opacity: 0, clipPath: 'circle(0% at 82% 52%)' }}
      animate={{ opacity: 1, clipPath: 'circle(120% at 82% 52%)' }}
      exit={{ opacity: 0, clipPath: 'circle(0% at 18% 52%)' }}
      transition={{ duration: 1.05, ease }}
    >
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_72%_48%,#d9b98c_0%,transparent_29%),linear-gradient(116deg,#17494d_0%,#1e5b5b_52%,#e8dfd2_52%,#f5efe5_100%)]" />
      <div className="absolute -left-[8vw] bottom-[8vh] h-[28vw] w-[28vw] rounded-full border-[1.5vw] border-[#ef765e]/25" />
      <div className="absolute right-[11vw] top-[13vh] h-[14vw] w-[14vw] rounded-full border border-[#f5efe5]/30" />
      <div className="absolute right-[2vw] top-[27vh] h-[38vw] w-[38vw] rounded-full border border-[#17494d]/10" />

      <motion.div
        className="absolute right-[7vw] top-[18vh] w-[39vw] max-w-[570px]"
        initial={{ x: '9vw', opacity: 0, rotate: 3 }}
        animate={{ x: 0, opacity: 1, rotate: 0 }}
        transition={{ delay: 0.46, duration: 1, ease }}
      >
        <div className="relative h-[48vh] min-h-[280px] overflow-hidden rounded-[2vw] bg-[#f5efe5] p-[1.6vw] shadow-[0_2vw_5vw_rgba(7,35,39,.24)]">
          <div className="relative h-full overflow-hidden rounded-[1.25vw] bg-[#d9b98c]">
            <div className="absolute inset-0 opacity-50 line-grid" />
            <div className="absolute left-[13%] top-[20%] h-[52%] w-[59%] rotate-[-8deg] rounded-[48%] bg-[#f5efe5]/70 blur-[1px]" />
            {[['18%', '22%', '4vw'], ['64%', '16%', '3vw'], ['67%', '58%', '5vw'], ['25%', '66%', '2.8vw']].map(([left, top, size], i) => (
              <motion.div
                key={left}
                className="absolute rounded-full border-[.3vw] border-[#17494d] bg-[#f5efe5] p-[.5vw]"
                style={{ left, top, width: size, height: size }}
                animate={{ y: [0, -8, 0], scale: [1, 1.08, 1] }}
                transition={{ duration: 3 + i * 0.4, repeat: Infinity, ease: 'easeInOut', delay: i * 0.2 }}
              >
                <MapPin className="h-full w-full text-[#17494d]" strokeWidth={2.4} />
              </motion.div>
            ))}
            <motion.div
              className="absolute bottom-[8%] right-[8%] flex items-center gap-2 rounded-full bg-[#17494d] px-[1vw] py-[.6vw] text-[.8vw] font-bold text-[#f5efe5]"
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 1.1, duration: 0.45, ease }}
            >
              <Sparkles size="1vw" /> بالقرب من جامعتك
            </motion.div>
          </div>
          <div className="absolute left-[2.4vw] top-[2.5vw] flex items-center gap-2 rounded-full bg-[#f5efe5]/95 px-[1vw] py-[.65vw] text-[.82vw] font-bold text-[#17494d]">
            <Search size="1.1vw" /> ٢٬٤٠٠ وحدة موثقة
          </div>
        </div>
      </motion.div>

      <div className="absolute left-[9vw] top-[20vh] w-[40vw] text-right text-[#f5efe5]">
        <motion.div
          className="mb-[2vh] flex items-center gap-[.7vw] text-[1vw] font-bold tracking-[.15em] text-[#d9b98c]"
          initial={{ opacity: 0, x: '-2vw' }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.22, duration: 0.6, ease }}
        >
          <span className="h-[.18vw] w-[4vw] bg-[#ef765e]" /> بداية الحكاية
        </motion.div>
        <motion.h1
          className="arabic text-[6.1vw] font-black leading-[1.06] tracking-[-.07em]"
          initial={{ opacity: 0, y: '2vw' }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.38, duration: 0.85, ease }}
        >
          سكنك
          <br />
          <span className="text-[#d9b98c]">يبدأ من هنا.</span>
        </motion.h1>
        <motion.p
          className="arabic mt-[2.8vh] max-w-[29vw] text-[1.45vw] font-medium leading-[1.75] text-[#f5efe5]/75"
          initial={{ opacity: 0, y: '1vw' }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.76, duration: 0.7, ease }}
        >
          رحلة البحث عن بيت قريب، واضح، ومناسب لك — تبدأ بخطوة واحدة.
        </motion.p>
        <motion.div
          className="mt-[4vh] flex items-center gap-[1vw] text-[.9vw] font-semibold text-[#f5efe5]/70"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1.2, duration: 0.6 }}
        >
          <Building2 size="1.3vw" className="text-[#ef765e]" />
          مكاني / MKANY
        </motion.div>
      </div>
    </motion.section>
  );
}
