import { Dialog, Transition } from '@headlessui/react';
import { Form, Formik } from 'formik';
import { Fragment } from 'react';
import { toast } from 'sonner';
import { twMerge } from 'tailwind-merge';

import { useDarkMode } from '../hooks/useDarkMode';
import type { Course } from '../lib/model';
import { repo } from '../lib/repo';
import {
  ReviewForm,
  ReviewFormInitialValues,
  ReviewSchema,
} from './ReviewForm';

type ReviewFormProps = {
  course: Course;
  open: boolean;
  onClose: () => void;
  handleSubmit: (res: Response) => void;
};

export const AddReviewForm = ({
  course,
  open,
  onClose,
  handleSubmit,
}: ReviewFormProps) => {
  const [darkMode] = useDarkMode();

  const initialValues: ReviewFormInitialValues = {
    content: '',
    instructors: [],
    rating: 0,
    difficulty: 0,
  };

  const handleClose = () => {
    onClose();
    toast.success('Review draft saved.');
  };

  return (
    <Transition appear show={open} as={Fragment}>
      <Dialog
        as='div'
        className={twMerge('relative z-50', darkMode ? 'dark' : '')}
        onClose={handleClose}
      >
        <Transition.Child
          as={Fragment}
          enter='ease-out duration-200'
          enterFrom='opacity-0'
          enterTo='opacity-100'
          leave='ease-in duration-200'
          leaveFrom='opacity-100'
          leaveTo='opacity-0'
        >
          <div className='fixed inset-0 bg-black/25' />
        </Transition.Child>

        <div className='fixed inset-y-0 left-0 w-screen overflow-y-scroll'>
          <div className='flex min-h-full items-center justify-center p-4 text-center'>
            <Transition.Child
              as={Fragment}
              enter='ease-out duration-200'
              enterFrom='opacity-0 scale-95'
              enterTo='opacity-100 scale-100'
              leave='ease-in duration-150'
              leaveFrom='opacity-100 scale-100'
              leaveTo='opacity-0 scale-95'
            >
              <Dialog.Panel className='w-[448px] overflow-hidden rounded-2xl bg-white p-6 text-left align-middle shadow-xl transition-all dark:bg-neutral-800'>
                <Dialog.Title
                  as='h3'
                  className='mb-4 text-lg font-medium leading-6 text-gray-900 dark:text-gray-200'
                >
                  {`Reviewing ${course.subject} ${course.code} - ${course.title}`}
                </Dialog.Title>
                <Formik
                  initialValues={initialValues}
                  validationSchema={ReviewSchema}
                  onSubmit={async (values, actions) => {
                    const res = await repo.addReview(course._id, values);
                    actions.setSubmitting(false);
                    onClose();
                    handleSubmit(res);
                  }}
                >
                  {({ values, setFieldValue, resetForm }) => (
                    <Form>
                      <ReviewForm
                        course={course}
                        values={values}
                        setFieldValue={setFieldValue}
                        resetForm={resetForm}
                      />
                    </Form>
                  )}
                </Formik>
              </Dialog.Panel>
            </Transition.Child>
          </div>
        </div>
      </Dialog>
    </Transition>
  );
};
