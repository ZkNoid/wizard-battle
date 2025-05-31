import { UserBar } from "./UserBar";

export function Users() {
  return (
    <>
      {/* Left user bar */}
      <div
        className="absolute"
        style={{
          left: "13%",
          top: "16%",
        }}
      >
        <UserBar name="John Doe" level={98} health={100} maxHealth={100} />
      </div>
      {/* Right user bar */}
      <div
        className="absolute"
        style={{
          right: "18.75%",
          top: "16%",
        }}
      >
        <UserBar name="Volan de Mort" level={100} health={30} maxHealth={100} />
      </div>
    </>
  );
}
