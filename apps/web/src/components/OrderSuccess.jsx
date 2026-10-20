import { useEffect, useRef, useState } from "react";
import { ArrowRight, Check, Beef } from "lucide-react";
import QRCode from "qrcode";

export default function OrderSuccess({ order, onNewOrder }) {
  const dialog = useRef(null);
  const reset = useRef(onNewOrder);
  reset.current = onNewOrder;
  const remaining = () =>
    Math.max(0, Math.ceil((order.kioskExpiresAt - Date.now()) / 1000));
  const [seconds, setSeconds] = useState(remaining);
  const [qr, setQr] = useState("");
  useEffect(() => {
    const node = dialog.current;
    node.showModal();
    const tick = () => {
      const value = remaining();
      setSeconds(value);
      if (!value) reset.current();
    };
    tick();
    const timer = setInterval(tick, 250);
    document.addEventListener("visibilitychange", tick);
    return () => {
      clearInterval(timer);
      document.removeEventListener("visibilitychange", tick);
      node.close();
    };
  }, [order.id, order.kioskExpiresAt]);
  useEffect(() => {
    let active = true;
    QRCode.toDataURL(`${location.origin}/#/pedido/${order.id}`, {
      width: 160,
      margin: 2,
    })
      .then((value) => {
        if (active) setQr(value);
      })
      .catch(() => {});
    return () => {
      active = false;
    };
  }, [order.id]);
  return (
    <dialog
      ref={dialog}
      className="kiosk-success"
      aria-labelledby="order-success-title"
      onCancel={(event) => {
        event.preventDefault();
        reset.current();
      }}
    >
      <div className="success-brand">
        <Beef size={28} /> ao ponto.
      </div>
      <div className="success-content">
        <span className="success-check">
          <Check size={35} />
        </span>
        <p className="eyebrow">TUDO CERTO COM A SUA ESCOLHA</p>
        <h1 id="order-success-title">Pedido enviado ao açougue!</h1>
        <p>Anote ou fotografe sua senha e aguarde a chamada no painel.</p>
        <div className="kiosk-ticket" role="status">
          <span>SUA SENHA É</span>
          <strong>{String(order.ticket.number).padStart(3, "0")}</strong>
        </div>
        <div className="success-follow">
          {qr && (
            <img
              src={qr}
              width="116"
              height="116"
              alt="QR code para acompanhar sua senha no celular"
            />
          )}
          <p>
            <b>Agora é com o nosso balcão.</b>
            <br />
            Você pode acompanhar a senha pelo QR code.
            <br />
            <small>
              O celular precisa conseguir acessar o endereço do sistema.
            </small>
          </p>
        </div>
        <button className="primary" onClick={onNewOrder}>
          Novo pedido <ArrowRight size={23} />
        </button>
        <p className="success-countdown">
          Este totem ficará pronto para o próximo cliente em <b>{seconds}s</b>.
        </p>
      </div>
      <span className="success-footer">
        BOA ESCOLHA. BOM ATENDIMENTO. NO PONTO.
      </span>
    </dialog>
  );
}
