'use client';

import { useBackgroundImageStore } from '@/lib/store/backgroundImageStore';
import { motion } from 'motion/react';
import { useEffect } from 'react';
import { CrownImage } from './assets/crown-image';
import { SkullImage } from './assets/skull-image';
import { Button } from '../shared/Button';
import { DividerImage } from './assets/divider-image';
import { Experience } from './Experiense';
import { PlaySteps } from '@/lib/enums/PlaySteps';
import { useRouter, useSearchParams } from 'next/navigation';
import {
  levelFromXp,
  xpProgressPercent,
} from '@/lib/constants/levels';
import { useMinaAppkit } from 'mina-appkit';
import { api } from '@/trpc/react';
import { useInGameStore, useUserInformationStore } from '@/lib/store';
import Image from 'next/image';
import { allWizards } from '../../../../common/wizards';

export default function GameResult({
  type,
  setPlayStep,
  rewards,
}: {
  type: 'win' | 'lose';
  setPlayStep: (step: PlaySteps) => void;
  rewards?: Array<{ itemId: string; amount: number; total: number }>;
}) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { setBackground } = useBackgroundImageStore();
  const text = type === 'win' ? 'You Win' : 'You Lose';
  const phraseDelay = 0.5 + text.length * 0.1 + 0.2;
  const { setDefaultState, stater } = useUserInformationStore();
  const { address } = useMinaAppkit();
  
  const currentWizard = stater?.state?.wizardId
    ? allWizards.find(
        (w) => w.id.toString() === stater.state.wizardId.toString()
      )
    : null;
  const wizardName = currentWizard?.name ?? 'Wizard';

  const { data: user } = api.users.get.useQuery(
    { address: address ?? '' },
    {
      enabled: !!address,
    }
  );
  const xpToGain = Number(searchParams.get('experience')) || 0;

  // Get wizard-specific XP based on current character
  const wizardXp = (() => {
    if (!user || !currentWizard) return 0;
    switch (currentWizard.name) {
      case 'Wizard':
        return user.mage_xp ?? 0;
      case 'Archer':
        return user.archer_xp ?? 0;
      case 'Phantom Duelist':
        return user.duelist_xp ?? 0;
      default:
        return 0;
    }
  })();
    // Set background image on mount and reset on unmount
    useEffect(() => {
      setBackground(type);
      return () => {
        setBackground('base');
      };
    }, []);

  // Update state to default one
  useEffect(() => {
    setDefaultState();
  }, []);

  return (
    <div className="flex h-full w-full flex-col">
      {/* Image */}
      <div className="mt-5 flex w-full items-center justify-center">
        {/* {type === 'win' && <CrownImage className="w-71 h-71" />} */}
        {/* {type === 'lose' && <SkullImage className="w-71 h-71" />} */}
        {type === 'win' && (
          <Image
            src={'/result/crown.png'}
            width={300}
            height={300}
            alt="crown"
            unoptimized={true}
            quality={100}
            className="w-71 h-71 object-contain object-center"
          />
        )}
        {type === 'lose' && (
          <Image
            src={'/result/skull.png'}
            width={300}
            height={300}
            alt="skull"
            unoptimized={true}
            quality={100}
            className="w-71 h-71 object-contain object-center"
          />
        )}
      </div>

      <div className="mt-5 flex flex-col items-center justify-center gap-5">
        {/* Title */}
        <span className="font-pixel text-[23.529vw] font-bold text-white lg:!text-[5.208vw]">
          {text.split('').map((char, index) => (
            <motion.span
              key={index}
              initial={{
                opacity: 0,
                y: 50,
                scale: 0.5,
                rotate: -10,
              }}
              animate={{
                opacity: 1,
                y: 0,
                scale: 1,
                rotate: 0,
              }}
              transition={{
                type: 'spring',
                stiffness: 200,
                damping: 10,
                delay: 0.5 + index * 0.1,
              }}
            >
              {char}
            </motion.span>
          ))}
        </span>

        {/* Phrase */}
        <motion.span
          className="font-pixel text-3xl font-bold text-white"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{
            duration: 0.5,
            delay: phraseDelay,
            ease: 'easeOut',
          }}
        >
          {type === 'win' ? 'Play more?' : 'Try again?'}
        </motion.span>

        {/* Nav buttons */}
        <motion.div
          className="mt-7.5 flex items-center gap-5"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: phraseDelay + 1 }}
        >
          <Button
            variant="blue"
            onClick={() => {
              setPlayStep(PlaySteps.SELECT_MODE);
            }}
            className="w-69 h-15"
          >
            Yes
          </Button>
          <Button
            variant="gray"
            onClick={() => {
              router.push('/');
            }}
            className="w-69 h-15"
          >
            No
          </Button>
        </motion.div>

        {/* Divider */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: phraseDelay + 1.2 }}
        >
          <DividerImage className="w-230 mt-5 h-6" />
        </motion.div>

        {/* Rewards */}
        <motion.div
          className="mt-2.5 flex flex-col"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: phraseDelay + 1.5 }}
        >
          <span className="font-pixel text-center text-xl font-bold text-white">
            Your Reward
          </span>
          {type === 'win' && rewards?.length ? (
            <div className="mb-4 mt-2 rounded-lg bg-white/10 p-4 backdrop-blur-sm">
              {rewards.map((reward) => (
                <div key={reward.itemId} className="flex flex-col">
                  <div className="flex items-center justify-between">
                    <span className="font-pixel text-lg text-white">
                      {reward.itemId} Earned:
                    </span>
                    <span className="font-pixel text-xl text-yellow-400">
                      +{reward.amount}
                    </span>
                  </div>
                  <div className="mt-1 flex items-center justify-between">
                    <span className="font-pixel text-sm text-white/70">
                      Total:
                    </span>
                    <span className="font-pixel text-lg text-yellow-400">
                      {reward.total}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          ) : null}
          <Experience
            title="Account Experience"
            expWidth={xpProgressPercent((user?.xp ?? 0) + xpToGain)}
            expColor="#557FE8"
            level={levelFromXp((user?.xp ?? 0) + xpToGain)}
            plusExp={xpToGain}
          />
          <Experience
            title={`Character Experience: ${wizardName}`}
            expWidth={xpProgressPercent(wizardXp + xpToGain)}
            expColor="#FF5627"
            level={levelFromXp(wizardXp + xpToGain)}
            plusExp={xpToGain}
          />
        </motion.div>
      </div>
    </div>
  );
}
