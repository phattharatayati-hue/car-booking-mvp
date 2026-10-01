/* eslint-disable @typescript-eslint/no-explicit-any */
/**
 * แสดงตัวอย่างข้อความ LINE (ข้อความธรรมดา และ Flex Message) ให้หน้าตาใกล้เคียงในแอป LINE
 * ใช้ในหน้าตั้งค่าการแจ้งเตือน — วาดเองจาก JSON ของการ์ดตัวจริง ไม่ต้องโหลดอะไรจากภายนอก
 */
import type { CSSProperties, ReactNode } from "react";

const SP: Record<string, number> = { none: 0, xs: 2, sm: 4, md: 8, lg: 12, xl: 16, xxl: 20 };
const FS: Record<string, number> = { xxs: 11, xs: 13, sm: 14, md: 16, lg: 19, xl: 22, xxl: 29, "3xl": 35 };
const px = (v: any): string | undefined =>
  v == null ? undefined : typeof v === "number" ? `${v}px` : SP[v] != null ? `${SP[v]}px` : String(v);

function Comp({ c, parent, first, spacing }: { c: any; parent: string; first: boolean; spacing: number }): ReactNode {
  const horiz = parent === "horizontal" || parent === "baseline";
  const st: CSSProperties = {};
  const f = c.flex != null ? c.flex : horiz ? 1 : 0;
  if (c.type !== "filler" && c.type !== "separator") st.flex = f === 0 ? "0 0 auto" : `${f} ${f} 0`;
  const m = c.margin != null ? SP[c.margin] ?? parseInt(c.margin) : first ? 0 : spacing;
  if (!first || c.margin != null) {
    if (horiz) st.marginLeft = m;
    else st.marginTop = m;
  }
  if (c.type === "box") {
    Object.assign(st, {
      display: "flex",
      flexDirection: c.layout === "vertical" ? "column" : "row",
      alignItems: c.layout === "baseline" ? "baseline" : c.alignItems,
      background: c.backgroundColor,
      borderRadius: px(c.cornerRadius),
      padding: px(c.paddingAll),
      paddingTop: px(c.paddingTop),
      paddingBottom: px(c.paddingBottom),
      paddingLeft: px(c.paddingStart),
      paddingRight: px(c.paddingEnd),
      minWidth: 0,
    });
    if (c.borderWidth) st.border = `1px solid ${c.borderColor ?? "#ddd"}`;
    const sp = c.spacing ? SP[c.spacing] ?? parseInt(c.spacing) : 0;
    return (
      <div style={st}>
        {(c.contents ?? []).map((ch: any, i: number) => (
          <Comp key={i} c={ch} parent={c.layout} first={i === 0} spacing={sp} />
        ))}
      </div>
    );
  }
  if (c.type === "text") {
    Object.assign(st, {
      fontSize: FS[c.size ?? "md"] ?? 16,
      fontWeight: c.weight === "bold" ? 700 : 400,
      color: c.color ?? "#111",
      textAlign: c.align === "end" ? "right" : c.align === "center" ? "center" : "left",
      lineHeight: 1.4,
      minWidth: 0,
      whiteSpace: c.wrap ? "pre-wrap" : "nowrap",
      overflow: c.wrap ? undefined : "hidden",
      textOverflow: c.wrap ? undefined : "ellipsis",
      textDecoration: c.decoration === "line-through" ? "line-through" : undefined,
    });
    return (
      <div style={st}>
        {c.contents?.length
          ? c.contents.map((s: any, i: number) => (
              <span key={i} style={{ fontWeight: s.weight === "bold" ? 700 : undefined, color: s.color }}>
                {s.text}
              </span>
            ))
          : c.text}
      </div>
    );
  }
  if (c.type === "button") {
    const style = c.style ?? "link";
    Object.assign(st, {
      height: c.height === "sm" ? 40 : 52,
      borderRadius: 8,
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      fontWeight: 700,
      fontSize: 15,
      background: style === "primary" ? c.color ?? "#17c950" : style === "secondary" ? c.color ?? "#dcdfe5" : "transparent",
      color: style === "primary" ? "#fff" : style === "secondary" ? "#111" : c.color ?? "#42659a",
    });
    return <div style={st}>{c.action?.label}</div>;
  }
  if (c.type === "separator") {
    return horiz ? (
      <div style={{ ...st, borderLeft: `1px solid ${c.color ?? "#e5e5e5"}`, alignSelf: "stretch" }} />
    ) : (
      <div style={{ ...st, borderTop: `1px solid ${c.color ?? "#e5e5e5"}` }} />
    );
  }
  if (c.type === "image") {
    const [a, b] = String(c.aspectRatio ?? "20:13").split(":").map(Number);
    return <div style={{ ...st, width: "100%", aspectRatio: `${a}/${b}`, background: "#cfd8e3" }} />;
  }
  if (c.type === "filler" || c.type === "spacer") return <div style={{ flex: 1 }} />;
  return null;
}

function Bubble({ b }: { b: any }) {
  const styles = b.styles ?? {};
  return (
    <div style={{ width: 280, flex: "none", background: "#fff", borderRadius: 16, overflow: "hidden", display: "flex", flexDirection: "column" }}>
      {(["header", "hero", "body", "footer"] as const).map((sec) =>
        b[sec] ? (
          <div key={sec} style={{ background: styles[sec]?.backgroundColor }}>
            <div style={sec !== "hero" && b[sec].paddingAll == null && b[sec].paddingTop == null ? { padding: "16px 20px" } : undefined}>
              <Comp c={b[sec]} parent="vertical" first spacing={0} />
            </div>
          </div>
        ) : null
      )}
    </div>
  );
}

function Message({ m }: { m: any }) {
  if (m.type === "text") {
    return (
      <div style={{ background: "#fff", color: "#111", padding: "9px 13px", borderRadius: 18, fontSize: 14, lineHeight: 1.45, whiteSpace: "pre-wrap", maxWidth: 280 }}>
        {m.text}
      </div>
    );
  }
  if (m.type === "flex") {
    const c = m.contents;
    if (c.type === "carousel") {
      return (
        <div style={{ display: "flex", gap: 8, overflowX: "auto" }}>
          {c.contents.map((b: any, i: number) => (
            <Bubble key={i} b={b} />
          ))}
        </div>
      );
    }
    return <Bubble b={c} />;
  }
  return null;
}

export default function LinePreview({ messages }: { messages: any[] }) {
  if (!messages.length) return null;
  return (
    <div
      style={{ background: "#8CABD8", borderRadius: 16, padding: 12, fontFamily: "inherit" }}
      className="max-h-[560px] overflow-y-auto"
    >
      <div style={{ display: "flex", flexDirection: "column", gap: 10, alignItems: "flex-start" }}>
        {messages.map((m, i) => (
          <Message key={i} m={m} />
        ))}
      </div>
    </div>
  );
}
