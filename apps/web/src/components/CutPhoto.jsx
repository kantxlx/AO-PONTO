import { useState } from "react";
import { Beef } from "lucide-react";
import { cutImages } from "../media.js";
export default function CutPhoto({ cut, className = "" }) {
  const [failed, setFailed] = useState(false);
  const src = cutImages[cut?.id];
  return src && !failed ? (
    <img
      className={`cut-photo ${className}`}
      src={src}
      alt={cut.name}
      loading="lazy"
      decoding="async"
      width="480"
      height="360"
      onError={() => setFailed(true)}
    />
  ) : (
    <div
      className={`cut-photo photo-placeholder ${className}`}
      aria-label={cut?.name}
    >
      <Beef size={54} strokeWidth={1.2} />
    </div>
  );
}
