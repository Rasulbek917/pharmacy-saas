declare module "qrcode" {
  export interface QRCodeOptions {
    width?: number;
    margin?: number;
    scale?: number;
    color?: {
      dark?: string;
      light?: string;
    };
    errorCorrectionLevel?: "low" | "medium" | "quartile" | "high" | "L" | "M" | "Q" | "H";
  }

  export function toDataURL(
    text: string | Buffer,
    options?: QRCodeOptions
  ): Promise<string>;

  export function toString(
    text: string | Buffer,
    options?: QRCodeOptions & { type?: "svg" | "utf8" }
  ): Promise<string>;
}
