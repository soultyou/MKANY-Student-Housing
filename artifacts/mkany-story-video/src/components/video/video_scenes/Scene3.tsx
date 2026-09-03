import { motion } from 'framer-motion';
import { BrainCircuit, Check, Heart, Moon, Sparkles, Users } from 'lucide-react';

const ease = [0.16, 1, 0.3, 1] as const;

function Profile({ name, detail, color, side }: { name: string; detail: string; color: string; side: 'left' | 'right' }) {
  return (
    <motion.div
      className={`absolute ${side === 'left' ? 'left-[8vw]' : 'right-[8vw]'} top-[23vh] w-[19vw] rounded-[1.2vw] border border-[#f5efe5]/15 bg-[#f5efe5]/[.09] p-[1.1vw] text-right backdrop-blur-md`}
      initial={{ opacity: 0, x: side === 'left' ? '-2vw' : '2vw', y: '1vw' }}
      animate={{ opacity: 1, x: 0, y: 0 }}
      transition={{ delay: side === 'left' ? 0.42 : 0.7, duration: 0.7, ease }}
    >
      <div className="flex items-center gap-[.8vw]">
        <div className={`flex h-[3vw] w-[3vw] items-center justify-center rounded-full ${color} text-[1.15vw] font-black text-[#17494d]`}>{name.slice(0, 1)}</div>
        <div><strong className="arabic block text-[1.15vw] text-[#f5efe5]">{name}</strong><span className="arabic text-[.72vw] text-[#f5efe5]/55">{detail}</span></div>
        <Heart className="mr-auto text-[#ef765e]" size="1.1vw" fill="currentColor" />
      </div>
      <div className="mt-[1vw] flex gap-[.45vw] text-[.63vw] text-[#f5efe5]/65"><span className="flex items-center gap-1 rounded-full bg-[#f5efe5]/10 px-[.6vw] py-[.35vw]"><Moon size=".75vw" /> نوم مرن</span><span className="flex items-center gap-1 rounded-full bg-[#f5efe5]/10 px-[.6vw] py-[.35vw]"><Users size=".75vw" /> هادئ</span></div>
    </motion.div>
  );
}

export function Scene3() {
  return (
    <motion.section
      key="match"
      className="absolute inset-0 overflow-hidden"
      initial={{ opacity: 0, scale: 1.12, clipPath: 'circle(0% at 50% 50%)' }}
      animate={{ opacity: 1, scale: 1, clipPath: 'circle(100% at 50% 50%)' }}
      exit={{ opacity: 0, scale: 0.92, clipPath: 'circle(0% at 50% 50%)' }}
      transition={{ duration: 1, ease }}
    >
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_52%,#386f6e_0%,#17494d_38%,#102f36_100%)]" />
      <div className="absolute inset-0 opacity-[.08] line-grid" />
      <motion.div className="absolute left-[22vw] top-[6vh] h-[23vw] w-[23vw] rounded-full bg-[#d9b98c]/10 blur-[2vw]" animate={{ scale: [1, 1.15, 1], opacity: [0.4, 0.7, 0.4] }} transition={{ duration: 5, repeat: Infinity }} />
      <motion.div className="absolute right-[17vw] bottom-[8vh] h-[15vw] w-[15vw] rounded-full bg-[#ef765e]/10 blur-[1.5vw]" animate={{ scale: [1.1, 0.92, 1.1] }} transition={{ duration: 4.2, repeat: Infinity }} />

      <Profile name="نور" detail="جامعة المنصورة · ٢١ سنة" color="bg-[#d9b98c]" side="left" />
      <Profile name="سارة" detail="جامعة المنصورة · ٢١ سنة" color="bg-[#ef765e]" side="right" />

      <div className="absolute left-1/2 top-[14vh] w-[30vw] -translate-x-1/2 text-center text-[#f5efe5]">
        <motion.div className="mb-[1vh] text-[.85vw] font-bold tracking-[.18em] text-[#d9b98c]" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.2, duration: .45 }}>توافق أذكى</motion.div>
        <motion.h2 className="arabic text-[3.7vw] font-black leading-[1.15] tracking-[-.06em]" initial={{ opacity: 0, y: '1vw' }} animate={{ opacity: 1, y: 0 }} transition={{ delay: .34, duration: .7, ease }}>مش بس غرفة.<br /><span className="text-[#d9b98c]">شريك يشبهك.</span></motion.h2>
      </div>

      <motion.div className="absolute left-1/2 top-[39vh] flex h-[22vw] w-[22vw] -translate-x-1/2 items-center justify-center" initial={{ scale: 0, rotate: -30 }} animate={{ scale: 1, rotate: 0 }} transition={{ delay: .38, duration: 1.1, ease }}>
        <motion.div className="absolute inset-0 rounded-full border border-[#d9b98c]/25" animate={{ scale: [1, 1.12, 1], opacity: [.7, .25, .7] }} transition={{ duration: 2.8, repeat: Infinity }} />
        <motion.div className="absolute inset-[11%] rounded-full border border-[#ef765e]/30" animate={{ rotate: 360 }} transition={{ duration: 16, repeat: Infinity, ease: 'linear' }} />
        <div className="relative flex h-[13vw] w-[13vw] flex-col items-center justify-center rounded-full bg-[#f5efe5] text-[#17494d] shadow-[0_0_5vw_rgba(217,185,140,.26)]">
          <BrainCircuit className="mb-[.8vw] h-[3vw] w-[3vw] text-[#ef765e]" strokeWidth={1.5} />
          <strong className="mono text-[3.5vw] leading-none">94%</strong>
          <span className="arabic mt-[.55vw] text-[.9vw] font-bold">نسبة التوافق</span>
        </div>
        <motion.div className="absolute -right-[1.2vw] top-[3vw] flex h-[2.5vw] w-[2.5vw] items-center justify-center rounded-full bg-[#699b80] text-[#f5efe5]" animate={{ y: [0, '-.6vw', 0] }} transition={{ duration: 2.2, repeat: Infinity }}><Check size="1.3vw" strokeWidth={3} /></motion.div>
      </motion.div>

      <motion.div className="absolute bottom-[8vh] left-1/2 -translate-x-1/2 rounded-full border border-[#f5efe5]/10 bg-[#f5efe5]/[.07] px-[1.2vw] py-[.6vw] text-[.75vw] font-semibold text-[#f5efe5]/70" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 1.2, duration: .5 }}>
        <span className="flex items-center gap-[.5vw]"><Sparkles size=".9vw" className="text-[#d9b98c]" /> يطابق عاداتك، ميزانيتك، وطريقة حياتك</span>
      </motion.div>
    </motion.section>
  );
}
