import { useEffect, useState } from "react";
import QRCode from "qrcode";
export default function Ticket({ order }) {
  const [qr, setQr] = useState("");
  const link = `${location.origin}/#/pedido/${order.id}`;
  useEffect(() => {
    let active = true;
    QRCode.toDataURL(link, { width: 180, margin: 2, errorCorrectionLevel: "M" })
      .then((value) => {
        if (active) setQr(value);
      })
      .catch(() => {});
    return () => {
      active = false;
    };
  }, [link]);
  return (
    <div className="ticket-tracking">
      {qr && (
        <img
          src={qr}
          width="180"
          height="180"
          alt="QR code para acompanhar esta senha"
        />
      )}
      <a href={`#/pedido/${order.id}`}>Acompanhar minha senha</a>
      <small>
        Para usar no celular, abra o sistema por um endereço acessível na mesma
        rede ou pelo endereço publicado.
      </small>
    </div>
  );
}
