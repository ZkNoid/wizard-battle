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
import { useRouter } from 'next/navigation';
import {
  LOSE_XP,
  WIN_XP,
  levelFromXp,
  xpToNextLevel,
} from '@/lib/constants/levels';
import { useMinaAppkit } from 'mina-appkit';
import { api } from '@/trpc/react';
import { useInGameStore, useUserInformationStore } from '@/lib/store';
import Image from 'next/image';

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
  const { setBackground } = useBackgroundImageStore();
  const text = type === 'win' ? 'You Win' : 'You Lose';
  const phraseDelay = 0.5 + text.length * 0.1 + 0.2;
  const { setDefaultState } = useUserInformationStore();
  const { address } = useMinaAppkit();
  const { mutate: gainXp } = api.users.gainXp.useMutation();
  const { data: user } = api.users.get.useQuery(
    { address: address ?? '' },
    {
      enabled: !!address,
    }
  );
  const xpToGain = type === 'win' ? WIN_XP : LOSE_XP;

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

  // Gain XP process, need to improve when changed xp logic
  useEffect(() => {
    if (!address || !user) return;

    const lastGameResultXp = sessionStorage.getItem('lastGameResultXp');

    if (lastGameResultXp && Number(lastGameResultXp) === user.xp) {
      throw new Error(
        `Already claimed reward, lastGameResultXp: ${lastGameResultXp}, currentUserXp: ${user.xp}`
      );
    }

    sessionStorage.setItem(
      'lastGameResultXp',
      (Number(lastGameResultXp) + xpToGain).toString()
    );

    if (type === 'win') {
      gainXp({ address, xp: xpToGain });
    } else {
      gainXp({ address, xp: xpToGain });
    }
  }, [address, type]);

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
            expWidth={
              user?.xp
                ? (levelFromXp(user.xp + xpToGain) /
                    xpToNextLevel(user.xp + xpToGain)) *
                  100
                : 0
            }
            expColor="#557FE8"
            level={user?.xp ? levelFromXp(user.xp + xpToGain) : 1}
            plusExp={xpToGain}
          />
          <Experience
            title="Character Experience: Wizard"
            expWidth={
              user?.xp
                ? (levelFromXp(user.xp + xpToGain) /
                    xpToNextLevel(user.xp + xpToGain)) *
                  100
                : 0
            }
            expColor="#FF5627"
            level={user?.xp ? levelFromXp(user.xp + xpToGain) : 1}
            plusExp={xpToGain}
          />
        </motion.div>
      </div>
    </div>
  );
}
