import { UserBar } from "./UserBar";

export function Users() {
  return (
    <div className='grid grid-cols-8 items-center px-57'>
      {/* Left user bar */}
      <UserBar name="John Doe" level={98} health={100} maxHealth={100} className="col-span-3" />
      <div className='col-span-2' />
      {/* Right user bar */}
      <UserBar name="Volan de Mort" level={100} health={30} maxHealth={100} className="col-span-3" />
    </div>
  );
}
