import { SearchBar } from './SearchBar';

type ReviewSearchBarProps = {
  query: string;
  handleInputChange: (query: string) => void;
};

export const ReviewSearchBar = ({
  query,
  handleInputChange,
}: ReviewSearchBarProps) => {
  return (
    <div>
      <SearchBar
        value={query}
        handleInputChange={handleInputChange}
        inputStyle='block w-full bg-gray-100 border border-gray-300 shadow-sm p-3 pl-10 text-sm text-black outline-none dark:border-neutral-50 dark:bg-neutral-800 dark:text-gray-200 dark:placeholder:text-neutral-500 lg:min-w-[570px] dark:border-gray-700 rounded-sm'
        placeholder='Search through reviews'
        onKeyDown={() => null}
        searchSelected={false}
        setSearchSelected={() => null}
      />
    </div>
  );
};
