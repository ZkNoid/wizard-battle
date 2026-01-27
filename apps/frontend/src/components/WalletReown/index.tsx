'use client';

import { Button } from '../shared/Button';
import { motion } from 'motion/react';
import { usePathname } from 'next/navigation';
import {
  useAppKit,
  useAppKitAccount,
  useDisconnect,
  useAppKitNetwork,
} from '@reown/appkit/react';
import { avalanche } from '@reown/appkit/networks';
import { useEffect } from 'react';

// Helper function to format address (similar to Mina's formatAddress)
const formatAddress = (address: string): string => {
  if (!address) return '';
  return `${address.slice(0, 6)}...${address.slice(-4)}`;
};

interface WalletReownProps {
  className?: string;
}

export default function WalletReown({ className }: WalletReownProps = {}) {
  const pathname = usePathname();
  const isHomePage = pathname === '/';
  const { open } = useAppKit();
  const { address, isConnected } = useAppKitAccount();
  const { disconnect } = useDisconnect();
  const { chainId, switchNetwork } = useAppKitNetwork();

  // Switch to Avalanche chain after wallet connection
  useEffect(() => {
    if (isConnected && chainId !== avalanche.id) {
      switchNetwork(avalanche);
    }
  }, [isConnected, chainId, switchNetwork]);

  const handleButtonClick = () => {
    if (isConnected) {
      disconnect();
    } else {
      open();
    }
  };

  const displayText =
    isConnected && address ? formatAddress(address) : 'Connect Wallet';

  return (
    <motion.div
      // initial={isHomePage ? { opacity: 0, y: 50, scale: 0.9 } : false}
      // animate={isHomePage ? { opacity: 1, y: 0, scale: 1 } : false}
      // transition={{ duration: 0.7, ease: 'easeOut', delay: 2.5 }}
      className={className || 'w-full'}
    >
      <Button
        variant="blue"
        text={displayText}
        onClick={handleButtonClick}
        className="w-70 h-15 text-base font-bold"
      />
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
