import { useEffect, useState } from "react";
import { Copy, Check, Printer, ArrowRight } from "lucide-react";
import QRCode from "qrcode";
export default function Ticket({ order }) {
  const [qr, setQr] = useState(""),
    [copied, setCopied] = useState(false),
    [copyError, setCopyError] = useState("");
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
      <a href={`#/pedido/${order.id}`}>
        Acompanhar minha senha <ArrowRight size={13} />
      </a>
      <div className="ticket-tools">
        <button
          type="button"
          onClick={async () => {
            try {
              await navigator.clipboard.writeText(link);
              setCopied(true);
              setCopyError("");
            } catch {
              setCopyError(
                "Abra o acompanhamento e copie o endereço do navegador.",
              );
            }
          }}
        >
          {copied ? <Check size={13} /> : <Copy size={13} />}{" "}
          {copied ? "Link copiado" : "Copiar link"}
        </button>
        <button type="button" onClick={() => window.print()}>
          <Printer size={13} />
          Imprimir
        </button>
      </div>
      {copyError && <small role="alert">{copyError}</small>}
      <details>
        <summary>Como acompanhar no celular?</summary>
        <small>
          Escaneie o QR code. O sistema precisa estar aberto por um endereço
          acessível na mesma rede ou por um endereço publicado.
        </small>
      </details>
    </div>
  );
}
