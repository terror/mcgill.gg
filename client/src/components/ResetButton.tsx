import { RefreshCw } from 'react-feather';
import { twMerge } from 'tailwind-merge';

type ResetButtonProps = {
  className?: string;
  onClear: () => void;
};

export const ResetButton = ({ className, onClear }: ResetButtonProps) => {
  return (
    <div
      className={twMerge(
        'flex h-8 w-8 items-center justify-center rounded-full transition duration-200 hover:bg-gray-100 dark:hover:bg-neutral-700',
        className ?? ''
      )}
    >
      <button onClick={onClear}>
        <RefreshCw className={'size-5 text-gray-500 dark:text-neutral-400'} />
      </button>
    </div>
  );
};
