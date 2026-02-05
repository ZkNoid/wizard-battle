import { NavButton } from './NavButton';

export function Navigation({
  page,
  setPage,
  maxPages,
}: {
  page: number;
  setPage: (page: number) => void;
  maxPages: number;
}) {
  return (
    <nav className="px-12.5 absolute bottom-0 right-0 flex w-full flex-row items-center gap-5">
      {/* Page number */}
      <div className="font-pixel text-main-gray mb-9 ml-[47%] mr-auto mt-auto text-xl font-bold">
        {page}/{maxPages}
      </div>
      {/* Right button */}
      {page != 1 && (
        <NavButton
          position="left"
          onClick={() => setPage(page - 1)}
          className="mb-12.5"
        />
      )}
      {/* Left button */}
      {page != maxPages && (
        <NavButton
          position="right"
          onClick={() => setPage(page + 1)}
          className="mb-12.5"
        />
      )}
    </nav>
  );
}
