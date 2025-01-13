import { Search } from 'lucide-react';
import { twMerge } from 'tailwind-merge';

export const SearchBar = ({
  handleInputChange,
  iconStyle,
  inputStyle,
  onKeyDown,
  outerIconStyle,
  outerInputStyle,
  placeholder,
  searchSelected,
  setSearchSelected,
  value,
}: {
  handleInputChange: (value: string) => void;
  iconStyle?: string;
  inputStyle?: string;
  onKeyDown?: (event: React.KeyboardEvent<HTMLInputElement>) => void;
  outerIconStyle?: string;
  outerInputStyle?: string;
  placeholder?: string;
  searchSelected: boolean;
  setSearchSelected: (value: boolean) => void;
  value?: string;
}) => {
  return (
    <div className='relative w-full'>
      <div
        className={twMerge(
          'pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3',
          outerIconStyle
        )}
      >
        <Search
          size={20}
          className={twMerge(
            'transition duration-200',
            searchSelected ? 'stroke-red-600' : 'stroke-gray-400',
            iconStyle
          )}
          aria-hidden='true'
        />
      </div>
      <div className={outerInputStyle}>
        <input
          className={inputStyle}
          onBlur={() => setTimeout(() => setSearchSelected(false), 100)}
          onChange={(event) => handleInputChange(event.target.value)}
          onFocus={() => setSearchSelected(true)}
          onKeyDown={onKeyDown}
          placeholder={placeholder}
          spellCheck='false'
          type='text'
          value={value}
        />
      </div>
    </div>
  );
};
