"use client";

import { useRef, useState } from "react";
import { useFormStatus } from "react-dom";
import ConfirmDialog from "@/components/ConfirmDialog";

type Props = {
  /** ถ้าใส่ จะถามยืนยันก่อนส่งฟอร์ม — ใช้กับปุ่มที่ลบข้อมูลหรือส่ง LINE ออกไป */
  confirm?: string;
  /** ข้อความบนปุ่มยืนยันในกล่อง ไม่ใส่จะใช้ "ยืนยัน" */
  confirmText?: string;
  className?: string;
  /** ข้อความระหว่างกำลังทำงาน ไม่ใส่จะใช้ "กำลังทำ…" */
  pendingText?: string;
  name?: string;
  value?: string;
  /** ใช้เมื่อปุ่มนี้ยิง server action คนละตัวกับ action ของฟอร์ม */
  formAction?: string | ((formData: FormData) => void | Promise<void>);
  children: React.ReactNode;
};

/**
 * ปุ่มส่งฟอร์มที่ (1) ถามยืนยันก่อน และ (2) กันกดซ้ำระหว่างรอ
 *
 * เดิมใช้ window.confirm ซึ่งเป็นกล่องของเบราว์เซอร์ — หน้าตาไม่เข้ากับระบบ
 * และบล็อกทั้งหน้าไว้ (ใน in-app browser ของ LINE บางรุ่นกดแล้วหน้าค้าง)
 * จึงเปลี่ยนเป็นกล่องยืนยันของเราเอง
 */
export default function ActionButton({
  confirm,
  confirmText,
  className,
  pendingText,
  name,
  value,
  formAction,
  children,
}: Props) {
  const { pending } = useFormStatus();
  const btnRef = useRef<HTMLButtonElement | null>(null);
  const approved = useRef(false);
  const [asking, setAsking] = useState(false);

  return (
    <>
      <button
        ref={btnRef}
        type="submit"
        name={name}
        value={value}
        formAction={formAction}
        disabled={pending}
        aria-busy={pending || undefined}
        className={className}
        onClick={(e) => {
          if (!confirm) return;
          if (approved.current) {
            approved.current = false;
            return;
          }
          e.preventDefault();
          setAsking(true);
        }}
      >
        {pending ? pendingText ?? "กำลังทำ…" : children}
      </button>

      <ConfirmDialog
        open={asking}
        message={confirm ?? ""}
        confirmText={confirmText}
        onCancel={() => setAsking(false)}
        onConfirm={() => {
          approved.current = true;
          setAsking(false);
          btnRef.current?.click();
        }}
      />
    </>
  );
}
