import { Field } from 'formik';
import { useState } from 'react';
import * as Yup from 'yup';

import { Course } from '../model/Course';
import { Autocomplete } from './Autocomplete';

export const ReviewSchema = Yup.object().shape({
  content: Yup.string().required('Required'),
  instructor: Yup.string().required('Required'),
  rating: Yup.number().min(0).max(5).required('Required'),
});

type ReviewFormInitialValues = {
  content: string;
  instructor: string;
  rating: number;
};

type ReviewFormProps = {
  course: Course;
  setFieldValue: (
    field: string,
    value: any,
    shouldValidate?: boolean | undefined
  ) => void;
  values: ReviewFormInitialValues;
};

export const ReviewForm = ({
  course,
  setFieldValue,
  values,
}: ReviewFormProps) => {
  const [query, setQuery] = useState('');

  const instructorNames = Array.from(
    new Set(course.instructors.map((instructor) => instructor.name))
  );

  const filteredInstructors =
    query === ''
      ? instructorNames
      : instructorNames.filter((instructor) => {
          return instructor.toLowerCase().includes(query.toLowerCase());
        });

  return (
    <>
      <label htmlFor='instructor' className='mb-2 dark:text-gray-200'>
        Instructor
      </label>
      <Autocomplete
        arr={filteredInstructors}
        setValue={(instructor) => setFieldValue('instructor', instructor)}
        value={values.instructor}
        setQuery={setQuery}
      />
      <div className='flex flex-col'>
        <Field
          component='textarea'
          rows='8'
          id='content'
          name='content'
          placeholder='Write your thoughts on this course...'
          className='mt-6 resize-none rounded-md bg-gray-50 p-3 outline-none dark:bg-neutral-700 dark:text-gray-200 dark:caret-white'
        />
        <label htmlFor='rating' className='mb-2 mt-4 dark:text-gray-200'>
          Rating
        </label>
        <Field
          type='number'
          id='rating'
          name='rating'
          className='mb-4 w-fit rounded-md bg-gray-50 p-2 dark:bg-neutral-700 dark:text-gray-200'
        />
        <button
          type='submit'
          className='ml-auto mt-4 w-fit rounded-md bg-red-500 px-3 py-2 text-white transition duration-300 hover:bg-red-600'
        >
          Submit
        </button>
      </div>
    </>
  );
};
