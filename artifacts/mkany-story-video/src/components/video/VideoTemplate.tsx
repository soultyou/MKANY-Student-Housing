// Video Template - Replace ReplitLoadingScene with your scenes

import { AnimatePresence, motion } from 'framer-motion';
import { useVideoPlayer } from '@/lib/video';
import { Scene1 } from './video_scenes/Scene1';
import { Scene2 } from './video_scenes/Scene2';
import { Scene3 } from './video_scenes/Scene3';
import { Scene4 } from './video_scenes/Scene4';
import { Scene5 } from './video_scenes/Scene5';

const SCENE_DURATIONS = {
  discover: 4200,
  verified: 4300,
  match: 4500,
  book: 4500,
  owners: 5000,
};

export default function VideoTemplate() {
  const { currentScene } = useVideoPlayer({
    durations: SCENE_DURATIONS,
  });

  return (
    <div className="video-root" aria-label="فيديو قصة مكاني" role="img">
      <motion.div
        className="absolute inset-0 z-0"
        animate={{
          backgroundColor: currentScene === 2 || currentScene === 4 ? '#12383e' : currentScene === 1 || currentScene === 3 ? '#f5efe5' : '#17494d',
        }}
        transition={{ duration: 1.2, ease: [0.16, 1, 0.3, 1] }}
      />
      <motion.div
        className="absolute -right-[10vw] -top-[14vw] z-[1] h-[42vw] w-[42vw] rounded-full border-[1.5vw] border-[#d9b98c]/20"
        animate={{
          x: currentScene * -3.5 + 'vw',
          y: currentScene % 2 === 0 ? '2vw' : '-1vw',
          rotate: currentScene * 18,
          borderColor: currentScene === 2 || currentScene === 4 ? 'rgba(217,185,140,.18)' : 'rgba(23,73,77,.13)',
        }}
        transition={{ duration: 1.4, ease: [0.16, 1, 0.3, 1] }}
      />
      <motion.div
        className="absolute bottom-[-17vw] left-[-7vw] z-[1] h-[35vw] w-[35vw] rounded-full"
        animate={{
          x: currentScene * 4 + 'vw',
          scale: currentScene === 2 || currentScene === 4 ? 1.18 : 1,
          backgroundColor: currentScene === 2 || currentScene === 4 ? 'rgba(239,118,94,.08)' : 'rgba(217,185,140,.15)',
        }}
        transition={{ duration: 1.25, ease: [0.16, 1, 0.3, 1] }}
      />
      <div className="absolute inset-0 z-[2] opacity-30 line-grid" />

      <motion.div
        className="absolute left-[5vw] top-[4vh] z-30 flex items-center gap-[.8vw]"
        animate={{ color: currentScene === 2 || currentScene === 4 ? '#f5efe5' : '#17494d' }}
        transition={{ duration: .8 }}
      >
        <img
          src={`${import.meta.env.BASE_URL}mkany-logo.png`}
          alt="مكاني"
          className="h-[4.8vw] w-[4.8vw] object-contain"
          style={{ filter: currentScene === 2 || currentScene === 4 ? 'invert(1) brightness(1.2)' : 'none' }}
        />
        <div className="hidden text-right sm:block">
          <div className="mono text-[.72vw] font-semibold tracking-[.22em]">MKANY</div>
          <div className="arabic text-[.65vw] font-semibold opacity-60">سكنك يبدأ من هنا</div>
        </div>
      </motion.div>
      <motion.div
        className="absolute right-[5vw] top-[5vh] z-30 mono text-[.7vw] font-semibold tracking-[.14em]"
        animate={{ color: currentScene === 2 || currentScene === 4 ? 'rgba(245,239,229,.5)' : 'rgba(23,73,77,.45)' }}
      >
        ٠{currentScene + 1} / ٠٥
      </motion.div>

      <AnimatePresence mode="sync" initial={false}>
        {currentScene === 0 && <Scene1 />}
        {currentScene === 1 && <Scene2 />}
        {currentScene === 2 && <Scene3 />}
        {currentScene === 3 && <Scene4 />}
        {currentScene === 4 && <Scene5 />}
      </AnimatePresence>

      <div className="scene-vignette z-[10]" />
      <div className="grain" />
    </div>
  );
}
