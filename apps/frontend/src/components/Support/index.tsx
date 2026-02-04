'use client';

import { Button } from '../shared/Button';
import { Background } from './assets/background';
import { Tab } from '@/lib/enums/Tab';
import { Formik, Form, Field, ErrorMessage } from 'formik';
import { motion } from 'motion/react';
import * as Yup from 'yup';
import { Cross } from './assets/cross';
import { api } from '@/trpc/react';
import {
  useModalSound,
  useClickSound,
  useHoverSound,
} from '@/lib/hooks/useAudio';

const validationSchema = Yup.object({
  issue: Yup.string()
    .required('Please describe your issue')
    .min(10, 'Description must be at least 10 characters'),
  contact: Yup.string()
    .required('Please provide contact information')
    .matches(
      /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$|^@[a-zA-Z0-9_]+$/,
      'Please provide a valid email or telegram handle'
    ),
});

export default function Support({ setTab }: { setTab: (tab: Tab) => void }) {
  // Play modal sounds
  useModalSound();
  const playClickSound = useClickSound();
  const playHoverSound = useHoverSound();

  const { mutate: createFeedback, isPending } =
    api.feedback.create.useMutation();

  return (
    <>
      {isPending && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="h-15 w-15 animate-spin rounded-full border-4 border-white border-t-transparent" />
        </div>
      )}

      <div className="w-143.5 h-165 relative flex flex-col">
        <div className="p-12.5 flex flex-col gap-2.5">
          <span className="font-pixel text-main-gray mt-2.5 text-center text-3xl font-bold">
            Support
          </span>
          {/* Form */}
          <Formik
            initialValues={{ issue: '', contact: '' }}
            validationSchema={validationSchema}
            onSubmit={(values, { resetForm }) => {
              createFeedback(
                {
                  description: values.issue,
                  contact: values.contact,
                },
                {
                  onSuccess: () => {
                    setTab(Tab.HOME);
                  },
                  onError: (error) => {
                    console.error('Failed to send feedback', error);
                    setTab(Tab.HOME);
                  },
                }
              );
              resetForm();
            }}
          >
            {({ isValid }) => (
              <Form className="flex flex-col gap-2.5">
                <div className="mt-1 flex flex-col gap-2.5">
                  <label className="font-pixel text-main-gray text-base">
                    Describe your Issue
                  </label>
                  <div className="flex flex-col gap-1">
                    <Field
                      as="textarea"
                      name="issue"
                      className="border-3 text-main-gray font-pixel h-50 w-full resize-none appearance-none border-black p-2.5 text-base focus:outline-none"
                    />
                    <ErrorMessage
                      name="issue"
                      component="div"
                      className="font-pixel text-xs text-red-500"
                    />
                  </div>
                </div>

                <div className="flex flex-col gap-2.5">
                  <label className="font-pixel text-main-gray text-base">
                    How we can contact you?
                  </label>
                  <div className="flex flex-col gap-1">
                    <Field
                      as="textarea"
                      name="contact"
                      className="border-3 h-12.5 text-main-gray font-pixel w-full resize-none appearance-none border-black p-2.5 text-base focus:outline-none"
                    />
                    <ErrorMessage
                      name="contact"
                      component="div"
                      className="font-pixel text-xs text-red-500"
                    />
                  </div>
                  <span className="text-main-gray font-pixel text-sm">
                    Please provide your e-mail or telegram handle so that we can
                    contact you!
                  </span>
                </div>

                <Button
                  text="Send"
                  variant="gray"
                  className="h-15 w-90 mx-auto"
                  type="submit"
                  disabled={isPending || !isValid}
                  enableHoverSound
                  enableClickSound
                />
              </Form>
            )}
          </Formik>
        </div>
        <div className="pt-12.5 pr-12.5 absolute right-0 top-0">
          <motion.button
            onClick={() => {
              playClickSound();
              setTab(Tab.HOME);
            }}
            onMouseEnter={playHoverSound}
            className="flex cursor-pointer flex-col items-center justify-center"
            whileHover={{ rotate: 90 }}
            transition={{ duration: 0.25, ease: 'easeInOut' }}
          >
            <Cross className="h-9 w-9" />
          </motion.button>
        </div>
        <Background className="w-143.5 h-165 absolute left-0 top-0 -z-[1]" />
      </div>
    </>
  );
}
