"use client";

import { useFormStatus } from "react-dom";

type Props = {
  /** ถ้าใส่ จะถามยืนยันก่อนส่งฟอร์ม — ใช้กับปุ่มที่ลบข้อมูลหรือส่ง LINE ออกไป */
  confirm?: string;
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
 * เดิมปุ่มพวกนี้เป็น <button> เปล่า ๆ กดพลาดทีคือส่ง LINE ออกไปแล้ว
 * หรือลบข้อมูลไปเลย และกดรัว ๆ ได้เพราะไม่มีสถานะกำลังทำงาน
 */
export default function ActionButton({
  confirm,
  className,
  pendingText,
  name,
  value,
  formAction,
  children,
}: Props) {
  const { pending } = useFormStatus();

  return (
    <button
      type="submit"
      name={name}
      value={value}
      formAction={formAction}
      disabled={pending}
      aria-busy={pending || undefined}
      className={className}
      onClick={(e) => {
        if (confirm && !window.confirm(confirm)) e.preventDefault();
      }}
    >
      {pending ? pendingText ?? "กำลังทำ…" : children}
    </button>
  );
}
