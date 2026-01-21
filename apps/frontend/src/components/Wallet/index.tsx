'use client';

import { Button } from '../shared/Button';
import { motion } from 'motion/react';
import { WalletBg } from './assets/wallet-bg';
import { LevelBg } from './assets/level-bg';
import BoxButton from '../shared/BoxButton';
import { DisconnectIcon } from './assets/disconnect-icon';
import { usePathname } from 'next/navigation';
import { formatAddress, useMinaAppkit } from 'mina-appkit';
import { api } from '@/trpc/react';
import { useEffect, useState, useRef, type KeyboardEvent } from 'react';
import { Formik, Form, Field } from 'formik';
import * as Yup from 'yup';
import { levelFromXp } from '@/lib/constants/levels';

const NameSchema = Yup.object().shape({
  name: Yup.string()
    .trim()
    .min(2, 'Username must be at least 2 characters')
    .max(20, 'Username must be less than 20 characters')
    .matches(
      /^[a-zA-Zа-яА-Я0-9\s]+$/,
      'Username can only contain letters, numbers, and spaces'
    )
    .test(
      'not-empty-after-trim',
      'Username cannot consist only of spaces',
      (value) => (value ? value.trim().length > 0 : false)
    )
    .required('Username is required'),
});

interface WalletProps {
  className?: string;
}

export default function Wallet({ className }: WalletProps = {}) {
  const pathname = usePathname();
  const isHomePage = pathname === '/';
  const { address, isConnected, triggerWallet, disconnect } = useMinaAppkit();
  const [isEditing, setIsEditing] = useState(false);
  const [originalName, setOriginalName] = useState('');
  const editRef = useRef<HTMLDivElement>(null);

  const {
    data: user,
    isFetched: isUserFetched,
    refetch: refetchUser,
  } = api.users.get.useQuery(
    {
      address: address ?? '',
    },
    {
      enabled: !!address,
    }
  );

  const { mutate: createUser } = api.users.create.useMutation();
  const { mutate: updateUserName } = api.users.setName.useMutation();

  useEffect(() => {
    if (address && !user && isUserFetched) {
      createUser(
        {
          address: address,
        },
        {
          onSuccess: () => refetchUser(),
        }
      );
    }
  }, [user, isUserFetched, address]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (editRef.current && !editRef.current.contains(event.target as Node)) {
        // If the name has not changed, just cancel the editing
        if (user?.name === originalName) {
          setIsEditing(false);
        }
      }
    };

    if (isEditing) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isEditing, user?.name, originalName]);

  const handleNameSubmit = (
    values: { name: string },
    { setSubmitting }: any
  ) => {
    if (!address) return;

    const trimmedName = values.name.trim();

    // Check if the name has changed
    if (trimmedName === originalName) {
      setIsEditing(false);
      setSubmitting(false);
      return;
    }

    updateUserName(
      {
        address: address,
        name: trimmedName,
      },
      {
        onSuccess: () => {
          refetchUser();
          setIsEditing(false);
          setSubmitting(false);
        },
        onError: () => {
          setSubmitting(false);
        },
      }
    );
  };

  const handleEditClick = () => {
    setOriginalName(user?.name || '');
    setIsEditing(true);
  };

  const handleCancelEdit = () => {
    setIsEditing(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent, submitForm: () => void) => {
    if (e.key === 'Escape') {
      handleCancelEdit();
    } else if (e.key === 'Enter') {
      e.preventDefault();
      submitForm();
    }
  };

  const displayName = user?.name
    ? `@${user.name}`
    : address
      ? formatAddress(address)
      : 'Unknown';

  return (
    <motion.div
      // initial={isHomePage ? { opacity: 0, y: 50, scale: 0.9 } : false}
      // animate={isHomePage ? { opacity: 1, y: 0, scale: 1 } : false}
      // transition={{ duration: 0.7, ease: 'easeOut', delay: 2.5 }}
      className={className || 'w-full'}
    >
      {isConnected && address ? (
        <Button
          variant="blue"
          text={`${displayName}`}
          onClick={disconnect}
          className="w-70 h-15 text-base font-bold"
        />
      ) : (
        <Button
          variant="blue"
          text="Connect Wallet"
          onClick={triggerWallet}
          className="w-70 h-15 text-base font-bold"
        />
      )}
    </motion.div>
  );
}

// const DEBUG_OLD_COMPONENT = () => {
//   return (
//     <>
//       {isConnected && address ? (
//         <div className="h-32.5 p-6.5 relative flex w-full flex-row items-center justify-between gap-8">
//           <div className="flex w-full flex-col gap-1">
//             {/* Username */}
//             <div className="relative" ref={editRef}>
//               {isEditing ? (
//                 <Formik
//                   initialValues={{ name: user?.name || '' }}
//                   validationSchema={NameSchema}
//                   onSubmit={handleNameSubmit}
//                 >
//                   {({ submitForm }) => (
//                     <Form className="flex max-w-5 items-center gap-2">
//                       <Field
//                         name="name"
//                         type="text"
//                         className="font-pixel text-main-gray border-main-gray border-b-0 text-xl font-bold no-underline outline-0 transition-colors placeholder:text-2xl"
//                         placeholder="Your name..."
//                         autoFocus
//                         onKeyDown={(e: KeyboardEvent) =>
//                           handleKeyDown(e, submitForm)
//                         }
//                       />
//                     </Form>
//                   )}
//                 </Formik>
//               ) : (
//                 <span
//                   className="font-pixel text-main-gray hover:text-main-gray/60 cursor-pointer text-2xl font-bold transition-colors"
//                   onClick={handleEditClick}
//                   title="Click to edit"
//                 >
//                   {displayName}
//                 </span>
//               )}
//             </div>
//             {/* Level */}
//             <div className="relative flex h-full w-full">
//               <div className="z-[1] ml-2 mt-2 flex h-full w-full items-center justify-start">
//                 <span className="font-pixel text-main-gray text-[0.417vw] font-bold">
//                   Lvl. {user?.xp ? levelFromXp(user.xp) : '???'}
//                 </span>
//               </div>
//               <LevelBg className="h-6.5 absolute inset-0 z-0 w-full" />
//             </div>
//           </div>
//           {/* Disconnect */}
//           <div className="flex min-w-20 items-center justify-end">
//             <BoxButton
//               onClick={() => {
//                 disconnect();
//               }}
//               className="h-15 w-15"
//             >
//               <DisconnectIcon className="h-9 w-9" />
//             </BoxButton>
//           </div>
//           {/* Background */}
//           <WalletBg className="absolute inset-0 -z-[1] ml-auto h-full w-full" />
//         </div>
//       ) : (
//         <Button
//           variant="gray"
//           text="Connect Wallet"
//           onClick={() => {
//             triggerWallet();
//           }}
//           className="w-70 h-15 ml-auto text-base font-bold"
//         />
//       )}
//     </>
//   );
// };
