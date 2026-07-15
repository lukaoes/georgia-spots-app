import L from "leaflet";
import { renderToStaticMarkup } from "react-dom/server";
import { CATEGORY_ICONS, MapPin } from "../icons";

// Renders the actual Lucide icon component to a static SVG string so it can be embedded
// inside a Leaflet divIcon (which needs plain HTML, not a React tree).
function iconSvg(category: string, color: string) {
  const Icon = CATEGORY_ICONS[category] || MapPin;
  return renderToStaticMarkup(<Icon color={color} size={16} strokeWidth={2.25} />);
}

export function pinIcon(category: string, highlighted = false) {
  const fill = highlighted ? "#A8522E" : "#274438";
  const glyph = iconSvg(category, "#F2F0E4");
  const html = `
    <div style="position:relative; width:34px; height:44px;">
      <svg width="34" height="44" viewBox="0 0 34 44" xmlns="http://www.w3.org/2000/svg">
        <path d="M17 43C17 43 32 25.5 32 16.5C32 7.9 25.3 1 17 1C8.7 1 2 7.9 2 16.5C2 25.5 17 43 17 43Z"
          fill="${fill}" stroke="#F2F0E4" stroke-width="1.5"/>
      </svg>
      <div style="position:absolute; top:8px; left:0; width:34px; display:flex; justify-content:center;">${glyph}</div>
    </div>`;
  return L.divIcon({
    html,
    className: "",
    iconSize: [34, 44],
    iconAnchor: [17, 43],
    popupAnchor: [0, -40],
  });
}

export function userLocationIcon() {
  const html = `<div style="width:16px;height:16px;border-radius:50%;background:#6B8659;border:3px solid #F2F0E4;box-shadow:0 0 0 2px #6B8659;"></div>`;
  return L.divIcon({ html, className: "", iconSize: [16, 16], iconAnchor: [8, 8] });
}
