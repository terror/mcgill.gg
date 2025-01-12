import { Disclosure } from '@headlessui/react';
import { AnimatePresence, motion } from 'framer-motion';
import { ChevronDown, Github, Mail } from 'lucide-react';
import React from 'react';
import { Helmet } from 'react-helmet-async';
import { FaDiscord } from 'react-icons/fa';
import { Link } from 'react-router-dom';

import { Layout } from '../components/Layout';
import { Paragraph } from '../components/Paragraph';

type Question = {
  title: string;
  content: React.ReactNode;
};

type QuestionsProps = {
  input: Question[];
};

const Questions = ({ input }: QuestionsProps) => {
  return (
    <div className='flex min-w-full max-w-md flex-col items-center space-y-3 dark:bg-neutral-900'>
      {input.map((item: Question) => (
        <Disclosure as='div' key={item.title} className='w-full'>
          {({ open }) => (
            <>
              <Disclosure.Button className='focus-visible:ring-mcgill-red/75 mx-auto flex w-full justify-between rounded-lg bg-gray-200 px-4 py-2 text-left text-sm font-medium text-gray-700 hover:bg-gray-300 focus:outline-none focus-visible:ring dark:bg-neutral-700 dark:text-gray-300 dark:hover:bg-neutral-600'>
                <span>{item.title}</span>
                <motion.div
                  animate={{ rotate: open ? 180 : 0 }}
                  transition={{ duration: 0.3 }}
                >
                  <ChevronDown className='size-5 text-gray-900 dark:text-gray-300' />
                </motion.div>
              </Disclosure.Button>
              <AnimatePresence initial={false}>
                {open && (
                  <motion.div
                    initial='collapsed'
                    animate='open'
                    exit='collapsed'
                    variants={{
                      open: { opacity: 1, height: 'auto' },
                      collapsed: { opacity: 0, height: 0 },
                    }}
                    transition={{
                      duration: 0.3,
                      ease: [0.04, 0.62, 0.23, 0.98],
                    }}
                  >
                    <Disclosure.Panel
                      static
                      className='px-4 pb-2 pt-4 text-sm text-gray-700 dark:text-gray-200'
                    >
                      {item.content}
                    </Disclosure.Panel>
                  </motion.div>
                )}
              </AnimatePresence>
            </>
          )}
        </Disclosure>
      ))}
    </div>
  );
};

type TitleProps = {
  children: React.ReactNode;
};

const Title = ({ children }: TitleProps) => {
  return (
    <div className='mb-3 mt-10 md:mb-5'>
      <h2 className='mb-auto text-2xl font-bold text-gray-700 dark:text-gray-200 md:text-3xl'>
        {children}
      </h2>
    </div>
  );
};

type PersonLink = {
  title: string;
  url: string;
};

const Person = ({
  name,
  imageUrl,
  links,
}: {
  name: string;
  imageUrl: string;
  links?: PersonLink[];
}) => {
  return (
    <div className='flex flex-col items-center gap-y-2 rounded-lg p-4 transition-transform duration-300 ease-in-out hover:scale-105'>
      <img
        className='size-[100px] rounded-full object-cover shadow-md'
        src={imageUrl}
        alt={name}
      />
      <div className='flex flex-col items-center'>
        <Paragraph className='font-semibold'>{name}</Paragraph>
        <div className='flex gap-x-2'>
          {links?.map((link: PersonLink, i) => (
            <React.Fragment key={i}>
              <a target='_blank' rel='noopener noreferrer' href={link.url}>
                <Paragraph className='hover:text-mcgill-red underline transition-colors duration-200'>
                  {link.title}
                </Paragraph>
              </a>
              {i !== links.length - 1 && <Paragraph>•</Paragraph>}
            </React.Fragment>
          ))}
        </div>
      </div>
    </div>
  );
};

const questions = [
  {
    title: 'How do we ensure review legitimacy?',
    content:
      'We require authentication with McGill email addresses via Microsoft Office 365, ensuring that only verified McGill students can submit reviews.',
  },
  {
    title: 'When will instructor ratings be available?',
    content:
      "Instructor ratings are currently our top priority and are in active development. We'll announce their availability as soon as they're ready!",
  },
  {
    title: 'Are there other similar tools for McGill students?',
    content: (
      <p>
        Yes! We encourage you to explore other great student-made tools like{' '}
        <a
          href='https://cloudberry.fyi'
          className='hover:text-mcgill-red underline'
          target='_blank'
          rel='noopener noreferrer'
        >
          cloudberry.fyi
        </a>{' '}
        and{' '}
        <a
          href='https://demetrios-koziris.github.io/McGillEnhanced/support'
          className='hover:text-mcgill-red underline'
          target='_blank'
          rel='noopener noreferrer'
        >
          McGill Enhanced
        </a>
        . These complement mcgill.courses to enhance your McGill experience!
      </p>
    ),
  },
];

const people = [
  {
    name: "Liam Scalzulli (CS '2025)",
    imageUrl:
      'https://media.licdn.com/dms/image/v2/D4E03AQGcvphemecHHw/profile-displayphoto-shrink_400_400/profile-displayphoto-shrink_400_400/0/1718323978830?e=1741219200&v=beta&t=jo2_mDIk2QFvzLURprB2Cxck_Ez5Z2UfAsm7tBhUYnA',
    links: [
      { title: 'Github', url: 'https://github.com/terror' },
      { title: 'Linkedin', url: 'https://www.linkedin.com/in/liamscalzulli/' },
    ],
  },
  {
    name: "Jeff Zhang (Hons CS '2025)",
    imageUrl:
      'https://media.licdn.com/dms/image/v2/D4E03AQEiV-UNsvxZHg/profile-displayphoto-shrink_400_400/profile-displayphoto-shrink_400_400/0/1712454391246?e=1741219200&v=beta&t=WAHy8QoDxR50pIZdkFRUBcEzsiWnClx-eFaFlVtsjLc',
    links: [
      { title: 'Github', url: 'https://github.com/39bytes' },
      { title: 'LinkedIn', url: 'https://www.linkedin.com/in/jeff-zhang72/' },
    ],
  },
  {
    name: "Sam Zhang (CS & Stats '2025)",
    imageUrl:
      'https://media.licdn.com/dms/image/v2/D5603AQGOMBYq2DtcxQ/profile-displayphoto-shrink_400_400/profile-displayphoto-shrink_400_400/0/1696648321898?e=1741824000&v=beta&t=e0MAXmge5Reo4MFQGcg7BOdpJEPTII6TqnWPF3r5gkA',
    links: [
      { title: 'Github', url: 'https://github.com/samzhang02' },
      { title: 'Linkedin', url: 'https://www.linkedin.com/in/zhang-sam/' },
    ],
  },
  {
    name: "Joey Yu (CS '2025)",
    imageUrl:
      'https://media.licdn.com/dms/image/v2/D4E03AQHQfxpD5h1Y2w/profile-displayphoto-shrink_400_400/profile-displayphoto-shrink_400_400/0/1721320736053?e=1741824000&v=beta&t=2q77Ue28ab60dDeouczAXdLVWGYB9BYEni57nz65cms',
    links: [{ title: 'Github', url: 'https://github.com/itsjoeoui' }],
  },
];

const fadeInUp = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0 },
};

export const About = () => {
  return (
    <Layout>
      <motion.div
        initial='hidden'
        animate='visible'
        variants={{
          visible: {
            transition: {
              staggerChildren: 0.1,
            },
          },
        }}
        className='m-auto mb-10 flex max-w-[800px] flex-col px-2 sm:px-8 md:px-16'
      >
        <Helmet>
          <title>About - mcgill.courses</title>
          <meta property='og:type' content='website' />
          <meta property='og:url' content='https://mcgill.courses/about' />
          <meta property='og:title' content='About - mcgill.courses' />
          <meta property='twitter:url' content='https://mcgill.courses/about' />
          <meta property='twitter:title' content='About - mcgill.courses' />
        </Helmet>

        <motion.div variants={fadeInUp}>
          <Title>
            Welcome to <span className='text-mcgill-red'>mcgill.courses</span>!
          </Title>
          <Paragraph className='leading-loose text-gray-700 dark:text-gray-200'>
            <Link className='hover:text-mcgill-red underline' to='/'>
              mcgill.courses
            </Link>{' '}
            is a student-driven platform providing transparent and comprehensive
            reviews for courses and instructors at{' '}
            <a
              className='hover:text-mcgill-red underline'
              href='https://www.mcgill.ca/'
              target='_blank'
              rel='noopener noreferrer'
            >
              McGill University
            </a>
            . Our mission is to empower students with the information they need
            to make informed academic decisions.
          </Paragraph>
          <Paragraph className='mt-4'>
            <span className='font-bold'>Disclaimer</span>: mcgill.courses is an
            independent initiative and is not affiliated with McGill University.
          </Paragraph>
        </motion.div>

        <motion.div variants={fadeInUp}>
          <Title>Our Story</Title>
          <Paragraph>
            <Link className='hover:text-mcgill-red underline' to='/'>
              mcgill.courses
            </Link>{' '}
            was born in{' '}
            <a
              className='hover:text-mcgill-red underline'
              href='https://github.com/terror/mcgill.courses/commit/45268b4e39801a4d9531d7b8ad5654fcca5bb01d'
              target='_blank'
              rel='noopener noreferrer'
            >
              March 2023
            </a>{' '}
            from a simple idea: create a centralized hub for McGill course
            information and reviews. What started as a side project has
            blossomed into a robust platform, thanks to our dedicated team of
            developers and designers.
          </Paragraph>
        </motion.div>

        <motion.div variants={fadeInUp}>
          <Title>Meet the Team</Title>
          <motion.ul
            variants={fadeInUp}
            className='mt-8 grid grid-cols-1 gap-4 sm:grid-cols-2'
          >
            {people.map((person) => (
              <motion.li
                key={person.name}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
              >
                <Person {...person} />
              </motion.li>
            ))}
          </motion.ul>
        </motion.div>

        <motion.div variants={fadeInUp}>
          <Paragraph className='mt-8'>
            Curious about our latest updates? Check out our{' '}
            <Link className='hover:text-mcgill-red underline' to='/changelog'>
              changelog
            </Link>{' '}
            to see what we've been working on!
          </Paragraph>
        </motion.div>

        <motion.div variants={fadeInUp}>
          <Title>Frequently Asked Questions</Title>
          <Questions input={questions} />
        </motion.div>

        <motion.div variants={fadeInUp}>
          <Title>Get in Touch</Title>
          <Paragraph>
            We value your feedback and contributions. Whether you have
            questions, suggestions, or want to contribute to the project, we're
            here to listen. Reach out through our GitHub repository, join our
            community Discord server, or send us an email.
          </Paragraph>
          <motion.div
            className='mt-6 flex gap-x-4'
            variants={{
              visible: {
                transition: {
                  staggerChildren: 0.1,
                },
              },
            }}
          >
            {[
              {
                icon: Github,
                href: 'https://www.github.com/terror/mcgill.courses',
                label: 'GitHub',
              },
              {
                icon: FaDiscord,
                href: 'https://discord.gg/d67aYpC7',
                label: 'Discord',
              },
              {
                icon: Mail,
                href: 'mailto:admin@mcgill.courses',
                label: 'Email',
              },
            ].map(({ icon: Icon, href, label }) => (
              <motion.a
                key={label}
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.9 }}
                target='_blank'
                rel='noopener noreferrer'
                href={href}
                aria-label={label}
              >
                <Icon
                  className='hover:text-mcgill-red dark:hover:text-mcgill-red text-gray-500 transition-colors duration-300 dark:text-gray-300'
                  size={40}
                />
              </motion.a>
            ))}
          </motion.div>
        </motion.div>
      </motion.div>
    </Layout>
  );
};
