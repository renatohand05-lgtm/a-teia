import { describe, expect, it } from "vitest";
import { formatBRL, formatDateBR, formatDateTimeBR, parseBrazilianNumber } from "@/lib/format";
import { displayMoneyInput, maskMoneyTyping, moneyMaskPreservesParse } from "@/lib/input-mask";

describe("Refinamento 9 — máscaras e formato", () => {
  it("formata digitação 600000 como 600.000 sem corromper o parse", () => {
    expect(maskMoneyTyping("600000")).toBe("600.000");
    expect(parseBrazilianNumber("600.000")).toBe(600000);
    expect(parseBrazilianNumber(maskMoneyTyping("600000"))).toBe(600000);
    expect(moneyMaskPreservesParse("600000")).toBe(true);
  });

  it("preserva centavos e milhar brasileiro", () => {
    expect(maskMoneyTyping("123456")).toBe("123.456");
    expect(maskMoneyTyping("1234,5")).toBe("1.234,5");
    expect(maskMoneyTyping("1234,56")).toBe("1.234,56");
    expect(parseBrazilianNumber("1.234,56")).toBe(1234.56);
    expect(displayMoneyInput(600000)).toBe("600.000");
    expect(displayMoneyInput(45.5)).toBe("45,50");
  });

  it("vazio continua ausência, zero continua zero", () => {
    expect(maskMoneyTyping("")).toBe("");
    expect(parseBrazilianNumber("")).toBeNull();
    expect(parseBrazilianNumber("0")).toBe(0);
    expect(parseBrazilianNumber("0,00")).toBe(0);
    expect(formatBRL(0)).toMatch(/R\$\s*0/);
    expect(formatBRL(null)).toBe("—");
  });

  it("datas e valores premium não alteram persistência", () => {
    expect(formatDateBR("2026-09-19T15:00:00.000Z")).toMatch(/\d{2}\/\d{2}\/\d{4}/);
    expect(formatDateTimeBR("2026-09-19T15:00:00.000Z")).toMatch(/\d{2}\/\d{2}\/\d{4}/);
    expect(formatBRL(1234.56)).toMatch(/1\.234,56/);
  });
});
