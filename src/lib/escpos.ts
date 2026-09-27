/**
 * ESC/POS Thermal Receipt Generator & Direct Printer Driver
 * Supports 58mm (32 cols) and 80mm (48 cols) thermal printers (USB, Serial, Network bridge)
 */

export interface ReceiptItemData {
  medicineName: string;
  quantity: number;
  unitPrice: number;
  discount: number;
  totalPrice: number;
}

export interface ReceiptData {
  receiptNumber: string;
  pharmacyName: string;
  pharmacyPhone?: string;
  pharmacyAddress?: string;
  cashierName: string;
  createdAt?: string | Date;
  totalAmount: number;
  discountAmount: number;
  taxRate?: number;
  taxAmount?: number;
  payableAmount: number;
  paidAmount: number;
  changeAmount: number;
  paymentMethod: string;
  items: ReceiptItemData[];
}

export type PaperWidth = "58mm" | "80mm";

export interface EscPosOptions {
  paperWidth?: PaperWidth;
  openDrawer?: boolean;
  cutPaper?: boolean;
}

// ESC/POS Byte Commands
const CMD = {
  INIT: [0x1b, 0x40], // ESC @
  ALIGN_LEFT: [0x1b, 0x61, 0x00], // ESC a 0
  ALIGN_CENTER: [0x1b, 0x61, 0x01], // ESC a 1
  ALIGN_RIGHT: [0x1b, 0x61, 0x02], // ESC a 2
  BOLD_ON: [0x1b, 0x45, 0x01], // ESC E 1
  BOLD_OFF: [0x1b, 0x45, 0x00], // ESC E 0
  DOUBLE_ON: [0x1d, 0x21, 0x11], // GS ! 17 (Double width & height)
  DOUBLE_OFF: [0x1d, 0x21, 0x00], // GS ! 0
  CUT_FULL: [0x1d, 0x56, 0x41, 0x03], // GS V A 3 (feed 3 lines and cut)
  DRAWER_KICK: [0x1b, 0x70, 0x00, 0x19, 0xfa], // ESC p 0 25 250
  FEED_LINE: [0x0a], // LF
};

/**
 * Clean Uzbek text for thermal printer character encoding
 */
function sanitizeText(str: string): string {
  if (!str) return "";
  return str
    .replace(/[‘ʻ`ʼ]/g, "'")
    .replace(/–/g, "-")
    .replace(/—/g, "-");
}

/**
 * Pad two text columns across receipt width
 */
function twoColumns(left: string, right: string, width: number): string {
  const leftClean = sanitizeText(left);
  const rightClean = sanitizeText(right);
  const spaceNeeded = width - leftClean.length - rightClean.length;

  if (spaceNeeded <= 0) {
    return leftClean.slice(0, width - rightClean.length - 1) + " " + rightClean + "\n";
  }
  return leftClean + " ".repeat(spaceNeeded) + rightClean + "\n";
}

/**
 * Format currency with so'm
 */
function formatSum(amount: number): string {
  return Math.round(amount).toLocaleString("uz-UZ") + " so'm";
}

/**
 * Generate raw ESC/POS binary data for 58mm or 80mm printer
 */
export function generateEscPosBytes(receipt: ReceiptData, options: EscPosOptions = {}): Uint8Array {
  const paperWidth = options.paperWidth || "58mm";
  const cols = paperWidth === "80mm" ? 48 : 32;
  const divider = "-".repeat(cols) + "\n";

  const buffer: number[] = [];

  const addBytes = (bytes: number[]) => {
    for (let i = 0; i < bytes.length; i++) {
      buffer.push(bytes[i]);
    }
  };

  const addText = (text: string) => {
    const sanitized = sanitizeText(text);
    // Simple single-byte / UTF-8 encoding
    const encoder = new TextEncoder();
    const encoded = encoder.encode(sanitized);
    for (let i = 0; i < encoded.length; i++) {
      buffer.push(encoded[i]);
    }
  };

  // 1. Initialize Printer
  addBytes(CMD.INIT);

  // Open drawer if requested
  if (options.openDrawer) {
    addBytes(CMD.DRAWER_KICK);
  }

  // 2. Pharmacy Header (Centered, Bold)
  addBytes(CMD.ALIGN_CENTER);
  addBytes(CMD.BOLD_ON);
  addBytes(CMD.DOUBLE_ON);
  addText(receipt.pharmacyName.toUpperCase() + "\n");
  addBytes(CMD.DOUBLE_OFF);
  addBytes(CMD.BOLD_OFF);

  if (receipt.pharmacyAddress) {
    addText(receipt.pharmacyAddress + "\n");
  }
  if (receipt.pharmacyPhone) {
    addText("Tel: " + receipt.pharmacyPhone + "\n");
  }

  addText(divider);

  // 3. Receipt Info (Left aligned)
  addBytes(CMD.ALIGN_LEFT);
  addText(twoColumns("Chek raqami:", receipt.receiptNumber, cols));

  const dateStr = receipt.createdAt
    ? new Date(receipt.createdAt).toLocaleString("uz-UZ", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      })
    : new Date().toLocaleString("uz-UZ");

  addText(twoColumns("Sana / Vaqt:", dateStr, cols));
  addText(twoColumns("Kassir:", receipt.cashierName, cols));

  const payMethodText =
    receipt.paymentMethod === "CARD"
      ? "Plastik karta"
      : receipt.paymentMethod === "ELECTRONIC"
      ? "Elektron to'lov"
      : "Naqd pul";
  addText(twoColumns("To'lov turi:", payMethodText, cols));

  addText(divider);

  // 4. Items Table
  addBytes(CMD.BOLD_ON);
  addText(twoColumns("MAHSULOT", "SUMMA", cols));
  addBytes(CMD.BOLD_OFF);

  for (const item of receipt.items) {
    addText(sanitizeText(item.medicineName) + "\n");
    const qtyPrice = `${item.quantity} x ${Math.round(item.unitPrice).toLocaleString("uz-UZ")}`;
    const total = formatSum(item.totalPrice);
    addText(twoColumns("  " + qtyPrice, total, cols));
    if (item.discount > 0) {
      addText(twoColumns("  (Chegirma:", `-${formatSum(item.discount)})`, cols));
    }
  }

  addText(divider);

  // 5. Totals
  addText(twoColumns("Jami qiymat:", formatSum(receipt.totalAmount), cols));
  if (receipt.discountAmount > 0) {
    addText(twoColumns("Chegirma:", `-${formatSum(receipt.discountAmount)}`, cols));
  }
  if (receipt.taxAmount && receipt.taxAmount > 0) {
    const taxLabel = receipt.taxRate ? `QQS (${receipt.taxRate}%):` : "QQS:";
    addText(twoColumns(taxLabel, formatSum(receipt.taxAmount), cols));
  }

  addBytes(CMD.BOLD_ON);
  addBytes(CMD.DOUBLE_ON);
  addText(twoColumns("TO'LOV:", formatSum(receipt.payableAmount), cols));
  addBytes(CMD.DOUBLE_OFF);
  addBytes(CMD.BOLD_OFF);

  addText(twoColumns("Qabul qilindi:", formatSum(receipt.paidAmount), cols));
  if (receipt.changeAmount > 0) {
    addBytes(CMD.BOLD_ON);
    addText(twoColumns("Qaytim:", formatSum(receipt.changeAmount), cols));
    addBytes(CMD.BOLD_OFF);
  }

  addText(divider);

  // 6. Footer (Centered)
  addBytes(CMD.ALIGN_CENTER);
  addText("Xaridingiz uchun tashakkur!\n");
  addText("Salomat bo'ling!\n\n");

  // 7. Cut Paper
  if (options.cutPaper !== false) {
    addBytes(CMD.CUT_FULL);
  }

  return new Uint8Array(buffer);
}

/**
 * Direct print using Web Serial API (Direct USB-to-Serial / COM thermal printers)
 */
export async function printDirectWebSerial(bytes: Uint8Array): Promise<{ success: boolean; message: string }> {
  if (typeof navigator === "undefined" || !("serial" in navigator)) {
    return {
      success: false,
      message: "Ushbu brauzer Web Serial API ni qo‘llab-quvvatlamaydi (Chrome, Edge tavsiya qilinadi).",
    };
  }

  try {
    const port = await (navigator as any).serial.requestPort();
    await port.open({ baudRate: 9600 });
    const writer = port.writable.getWriter();
    await writer.write(bytes);
    writer.releaseLock();
    await port.close();

    return { success: true, message: "Chek termal printerga muvaffaqiyatli yuborildi!" };
  } catch (err: any) {
    return {
      success: false,
      message: `Printer bilan aloqa o‘rnatilmadi: ${err.message || "Ulanish bekor qilindi"}`,
    };
  }
}

/**
 * Print via local hardware bridge (e.g., local print service on localhost:8080)
 */
export async function printViaLocalBridge(
  bytes: Uint8Array,
  bridgeUrl = "http://localhost:8080/print"
): Promise<{ success: boolean; message: string }> {
  try {
    const res = await fetch(bridgeUrl, {
      method: "POST",
      headers: { "Content-Type": "application/octet-stream" },
      body: bytes as any,
    });
    if (res.ok) {
      return { success: true, message: "Chek mahalliy printer servisiga yuborildi!" };
    }
    return { success: false, message: `Mahalliy printer servisi xatosi: ${res.statusText}` };
  } catch (e: any) {
    return { success: false, message: "Mahalliy printer servisi (localhost:8080) topilmadi." };
  }
}
