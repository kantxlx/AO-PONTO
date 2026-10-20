import { useEffect, useState } from "react";
export default function Clock() {
  const [time, setTime] = useState(new Date());
  useEffect(() => {
    const timer = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);
  return (
    <div className="live-clock">
      <strong>
        {time.toLocaleTimeString("pt-BR", {
          timeZone: "America/Sao_Paulo",
          hour: "2-digit",
          minute: "2-digit",
        })}
      </strong>
      <span>
        {time.toLocaleDateString("pt-BR", {
          timeZone: "America/Sao_Paulo",
          day: "numeric",
          month: "long",
        })}
      </span>
    </div>
  );
}
