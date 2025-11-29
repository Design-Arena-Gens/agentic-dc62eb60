import Tesseract from "tesseract.js";

export type OcrResult = {
  text: string;
  confidence: number;
};

export async function runOcr(buffer: Buffer): Promise<OcrResult> {
  try {
    const result = await Tesseract.recognize(buffer, "eng", {
      logger: () => undefined
    });
    const confidence = typeof result.data.confidence === "number" ? result.data.confidence : 0;
    return {
      text: result.data.text ?? "",
      confidence: Math.round(confidence)
    };
  } catch (error) {
    console.error("OCR failure", error);
    return {
      text: "",
      confidence: 0
    };
  }
}
