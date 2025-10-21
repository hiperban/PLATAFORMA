"use client";

import React, { useMemo, useState, useEffect } from "react";

/* ========= Utils ========= */
const currency = new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "BRL",
});
const formatBRL = (v: number) => currency.format(isFinite(v) ? v : 0);

// Converte texto digitado (com qualquer coisa) em número BRL (centavos)
function parseBRLInputToNumber(text: string): number {
  const digits = (text || "").replace(/\D+/g, "");
  const asNumber = Number(digits) / 100;
  return isNaN(asNumber) ? 0 : asNumber;
}
// Aplica máscara BRL em tempo real
function toBRLMask(text: string): string {
  return currency.format(parseBRLInputToNumber(text));
}

/* ========= Logos (hotlink simples) ========= */
const LOGOS: Record<string, string> = {
Santander:
    "https://upload.wikimedia.org/wikipedia/commons/b/b8/Banco_Santander_Logotipo.svg",
  BV:
    "https://upload.wikimedia.org/wikipedia/commons/1/15/Banco_BV_Logo.svg",
  "Itaú":
    "https://upload.wikimedia.org/wikipedia/commons/1/19/Ita%C3%BA_Unibanco_logo_2023.svg",
  "Banco PAN":
    "https://logodownload.org/wp-content/uploads/2019/07/banco-pan-logo-0-1.png",
  Porto:
    "https://logodownload.org/wp-content/uploads/2022/09/porto-seguro-bank-logo-0.png",
};

/* ========= Tabelas de taxas (exemplo base) ========= */
type TipoVeiculo = "Leve" | "Moto" | "Caminhão";
type TabelaTaxa = {
  nome: string;
  tipos: Partial<
    Record<
      TipoVeiculo,
      { maxAnos: number; faixas: { maxIdade: number; taxaMes: number }[] }
    >
  >;
};

// Observação: só Santander e BV têm Moto
const TABELAS: TabelaTaxa[] = [
  {
    nome: "Santander",
    tipos: {
      Leve: {
        maxAnos: 25,
        faixas: [
          { maxIdade: 5, taxaMes: 0.017 },
          { maxIdade: 10, taxaMes: 0.019 },
          { maxIdade: 25, taxaMes: 0.022 },
        ],
      },
      Moto: {
        maxAnos: 10,
        faixas: [
          { maxIdade: 3, taxaMes: 0.024 },
          { maxIdade: 10, taxaMes: 0.028 },
        ],
      },
      Caminhão: {
        maxAnos: 19,
        faixas: [
          { maxIdade: 8, taxaMes: 0.0185 },
          { maxIdade: 19, taxaMes: 0.021 },
        ],
      },
    },
  },
  {
    nome: "BV",
    tipos: {
      Leve: {
        maxAnos: 25,
        faixas: [
          { maxIdade: 5, taxaMes: 0.018 },
          { maxIdade: 12, taxaMes: 0.020 },
          { maxIdade: 25, taxaMes: 0.023 },
        ],
      },
      Moto: {
        maxAnos: 10,
        faixas: [
          { maxIdade: 4, taxaMes: 0.026 },
          { maxIdade: 10, taxaMes: 0.030 },
        ],
      },
      Caminhão: {
        maxAnos: 19,
        faixas: [
          { maxIdade: 10, taxaMes: 0.019 },
          { maxIdade: 19, taxaMes: 0.022 },
        ],
      },
    },
  },
  {
    nome: "Itaú",
    tipos: {
      Leve: {
        maxAnos: 25,
        faixas: [
          { maxIdade: 5, taxaMes: 0.0165 },
          { maxIdade: 10, taxaMes: 0.0185 },
          { maxIdade: 25, taxaMes: 0.021 },
        ],
      },
      Caminhão: {
        maxAnos: 19,
        faixas: [
          { maxIdade: 8, taxaMes: 0.018 },
          { maxIdade: 19, taxaMes: 0.0205 },
        ],
      },
    },
  },
  {
    nome: "Banco PAN",
    tipos: {
      Leve: {
        maxAnos: 25,
        faixas: [
          { maxIdade: 7, taxaMes: 0.020 },
          { maxIdade: 25, taxaMes: 0.0235 },
        ],
      },
      Caminhão: {
        maxAnos: 19,
        faixas: [
          { maxIdade: 10, taxaMes: 0.0205 },
          { maxIdade: 19, taxaMes: 0.0225 },
        ],
      },
    },
  },
  {
    nome: "Porto",
    tipos: {
      Leve: {
        maxAnos: 25,
        faixas: [
          { maxIdade: 5, taxaMes: 0.0175 },
          { maxIdade: 12, taxaMes: 0.0195 },
          { maxIdade: 25, taxaMes: 0.022 },
        ],
      },
      Caminhão: {
        maxAnos: 19,
        faixas: [
          { maxIdade: 8, taxaMes: 0.0185 },
          { maxIdade: 19, taxaMes: 0.0215 },
        ],
      },
    },
  },
];

/* ========= Parâmetros ocultos globais ========= */
const TARIFAS_EMBUTIDAS = 500;  // R$ somados ao principal (oculto)
const SEGURO_MENSAL = 200;      // R$ somado à parcela (oculto)
const IOF_DIARIO = 0.000082;    // 0,0082% ao dia
const IOF_ADICIONAL = 0.0038;   // 0,38% adicional

/* ========= Finance ========= */
function pmt(i: number, n: number, pv: number) {
  if (n === 0) return 0;
  if (i === 0) return pv / n;
  const f = Math.pow(1 + i, n);
  return (pv * i * f) / (f - 1);
}
// IOF aproximado de CDC PF (adicional + diário * dias)
function calcularIOF(principal: number, prazoMeses: number) {
  const dias = prazoMeses * 30; // aproximação simples
  return principal * (IOF_ADICIONAL + IOF_DIARIO * dias);
}

/* ========= Página ========= */
export default function Page() {
  // Estado do formulário
  const [tipo, setTipo] = useState<TipoVeiculo>("Leve");
  const [anoModelo, setAnoModelo] = useState<number | "">("");
  const [anoFab, setAnoFab] = useState<number | "">("");
  const [prazo, setPrazo] = useState<number>(60); // SELECT

  const [valorVeiculoText, setValorVeiculoText] = useState("");
  const [entradaText, setEntradaText] = useState("");

  // Começa com campos zerados
  useEffect(() => {
    setValorVeiculoText("");
    setEntradaText("");
  }, []);

  // Números derivados
  const valorVeiculo = parseBRLInputToNumber(valorVeiculoText);
  const entradaDigitada = parseBRLInputToNumber(entradaText);

  // Limites por tipo (regras)
  const limiteAnos: Record<TipoVeiculo, number> = {
    Leve: 25,
    Moto: 10,
    Caminhão: 19,
  };

  const anoAtual = new Date().getFullYear();
  const idadeModelo =
    anoModelo && typeof anoModelo === "number"
      ? Math.max(0, anoAtual - anoModelo)
      : NaN;
  const idadeFabCalculada =
    anoFab && typeof anoFab === "number"
      ? Math.max(0, anoAtual - anoFab)
      : NaN;

  // Entrada mínima 10%
  const entradaMinima = Math.ceil(valorVeiculo * 0.1 * 100) / 100;
  const entradaAjustada = Math.max(
    entradaDigitada,
    valorVeiculo ? entradaMinima : 0
  );
  const entradaValida =
    entradaDigitada >= entradaMinima || valorVeiculo === 0;

  // Valor financiado base (sem IOF) respeitando entrada mínima
  const valorFinanciadoBase = Math.max(valorVeiculo - entradaAjustada, 0);

  // IOF + tarifas embutidas entram no principal financiado
  const principalComIOF = useMemo(() => {
    const principalBruto = Math.max(valorFinanciadoBase, 0);
    const iof = calcularIOF(principalBruto, prazo);
    return principalBruto + iof + TARIFAS_EMBUTIDAS;
  }, [valorFinanciadoBase, prazo]);

  // Idade considerada = maior entre modelo e fabricação
  const idadeConsiderada =
    isFinite(idadeModelo) && isFinite(idadeFabCalculada)
      ? Math.max(idadeModelo, idadeFabCalculada)
      : NaN;

  // Mensagem de erro de anos
  const anosErro: string | null = useMemo(() => {
    if (!anoModelo || !anoFab) return null; // ainda não preenchido
    if (typeof anoModelo !== "number" || typeof anoFab !== "number")
      return "Informe anos válidos.";
    if (anoModelo > anoAtual || anoFab > anoAtual)
      return "Anos não podem ser no futuro.";
    if (anoModelo < 1900 || anoFab < 1900) return "Anos devem ser ≥ 1900.";
    if (anoModelo < anoFab)
      return "Ano modelo não pode ser menor que o ano de fabricação.";
    const limite = limiteAnos[tipo];
    if (idadeModelo > limite || idadeFabCalculada > limite) {
      return `Para ${tipo.toLowerCase()}, o limite é de até ${limite} anos (modelo e fabricação).`;
    }
    return null;
  }, [anoModelo, anoFab, idadeModelo, idadeFabCalculada, tipo, anoAtual]);

  const anosValidos =
    !anosErro &&
    !!anoModelo &&
    !!anoFab &&
    typeof anoModelo === "number" &&
    typeof anoFab === "number";

  // Taxa da faixa, por banco
  function taxaPorBanco(b: TabelaTaxa): { taxaMes: number } | null {
    const tb = b.tipos[tipo];
    if (!tb) return null;
    if (!anosValidos || !isFinite(idadeConsiderada)) return null;
    if (idadeConsiderada > tb.maxAnos) return null;
    const faixa = tb.faixas.find((f) => idadeConsiderada <= f.maxIdade);
    return faixa ? { taxaMes: faixa.taxaMes } : null;
  }

  // Resultados (ordenados por menor parcela)
  const resultados = useMemo(() => {
    if (!valorVeiculo || !anosValidos || !entradaValida) return [];
    const list = TABELAS.map((b) => {
      const fx = taxaPorBanco(b);
      if (!fx) return null;
      const i = fx.taxaMes;
      const n = prazo;
      const parcelaBase = pmt(i, n, principalComIOF);
      const parcelaFinal = parcelaBase + SEGURO_MENSAL; // (oculto) somado na parcela
      const totalPago = parcelaFinal * n;
      return {
        nome: b.nome,
        taxaMes: i,
        parcela: parcelaFinal,
        total: totalPago,
      };
    }).filter(Boolean) as {
      nome: string;
      taxaMes: number;
      parcela: number;
      total: number;
    }[];

    return list.sort((a, b) => (a.parcela > b.parcela ? 1 : -1));
  }, [valorVeiculo, anosValidos, entradaValida, prazo, principalComIOF, tipo]);

  // Handlers com máscara
  const onChangeValor = (e: React.ChangeEvent<HTMLInputElement>) =>
    setValorVeiculoText(toBRLMask(e.target.value));
  const onChangeEntrada = (e: React.ChangeEvent<HTMLInputElement>) =>
    setEntradaText(toBRLMask(e.target.value));

  // Opções de prazo (**apenas** as pedidas)
  const PRAZOS = [6, 12, 24, 36, 48, 60];

  return (
    <main className="min-h-screen bg-gradient-primary">
      <div className="max-w-6xl mx-auto px-4 py-8">
        <h1 className="text-2xl md:text-3xl font-bold mb-6 text-brand">
          HIPERBAN - VEÍCULOS
        </h1>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* ===== Formulário ===== */}
          <div className="border border-brand/15 rounded-xl2 p-6 shadow-card bg-white/90">
 <div className="border border-brand/15 rounded-xl2 p-6 shadow-card bg-white">
              {/* Tipo */}
              <label className="flex flex-col gap-1">
                <span className="text-sm font-medium text-brand-acc">Tipo de veículo</span>
                <select
                  className="border rounded-lg p-2 focus:outline-none focus:ring-2 focus:ring-brand/40 focus:border-brand"
                  value={tipo}
                  onChange={(e) => setTipo(e.target.value as TipoVeiculo)}
                >
                  <option value="Leve">Veículos Leves</option>
                  <option value="Moto">Moto</option>
                  <option value="Caminhão">Caminhão</option>
                </select>
                <span className="text-xs text-gray-500 mt-1">
                  Limites: Leve ≤ 25 anos • Moto ≤ 10 • Caminhão ≤ 19.
                </span>
              </label>

              {/* Anos */}
              <div className="grid grid-cols-2 gap-3">
                <label className="flex flex-col gap-1">
                  <span className="text-sm font-medium text-brand-acc">Ano modelo</span>
                  <input
                    inputMode="numeric"
                    pattern="[0-9]*"
                    className="border rounded-lg p-2 focus:outline-none focus:ring-2 focus:ring-brand/40 focus:border-brand"
                    placeholder="ex.: 2018"
                    value={anoModelo}
                    onChange={(e) =>
                      setAnoModelo(
                        e.target.value ? parseInt(e.target.value, 10) : ""
                      )
                    }
                  />
                </label>
                <label className="flex flex-col gap-1">
                  <span className="text-sm font-medium text-brand-acc">Ano fabricação</span>
                  <input
                    inputMode="numeric"
                    pattern="[0-9]*"
                    className="border rounded-lg p-2 focus:outline-none focus:ring-2 focus:ring-brand/40 focus:border-brand"
                    placeholder="ex.: 2017"
                    value={anoFab}
                    onChange={(e) =>
                      setAnoFab(
                        e.target.value ? parseInt(e.target.value, 10) : ""
                      )
                    }
                  />
                </label>
              </div>
              {anosErro && (
                <div className="text-xs text-red-600 -mt-2">{anosErro}</div>
              )}

              {/* Valores */}
              <label className="flex flex-col gap-1">
                <span className="text-sm font-medium text-brand-acc">Valor do veículo</span>
                <input
                  className="border rounded-lg p-2 focus:outline-none focus:ring-2 focus:ring-brand/40 focus:border-brand"
                  placeholder="R$ 0,00"
                  value={valorVeiculoText}
                  onChange={onChangeValor}
                />
              </label>

              <label className="flex flex-col gap-1">
                <span className="text-sm font-medium text-brand-acc">
                  Valor de entrada (mín. {formatBRL(entradaMinima || 0)})
                </span>
                <input
                  className="border rounded-lg p-2 focus:outline-none focus:ring-2 focus:ring-brand/40 focus:border-brand"
                  placeholder="R$ 0,00"
                  value={entradaText}
                  onChange={onChangeEntrada}
                />
                {!entradaValida && valorVeiculo > 0 && (
                  <span className="text-xs text-red-600">
                    Entrada mínima é {formatBRL(entradaMinima)}.
                  </span>
                )}
              </label>

              <div className="text-sm text-gray-700">
                Valor financiado (auto): <b>{formatBRL(valorFinanciadoBase)}</b>
              </div>

              {/* Prazo (select) */}
              <label className="flex flex-col gap-1">
                <span className="text-sm font-medium text-brand-acc">Prazo (meses)</span>
                <select
                  className="border rounded-lg p-2 focus:outline-none focus:ring-2 focus:ring-brand/40 focus:border-brand"
                  value={prazo}
                  onChange={(e) => setPrazo(parseInt(e.target.value, 10))}
                >
                  {[6,12,24,36,48,60].map((p) => (
                    <option key={p} value={p}>
                      {p} meses
                    </option>
                  ))}
                </select>
              </label>
            </div>
          </div>

          {/* ===== Resultados ===== */}
          <div className="lg:col-span-2 border border-brand/15 rounded-xl2 p-6 shadow-card bg-white/90">
            <h2 className="text-xl font-semibold mb-4 text-brand-acc">
              Comparativo por Banco
            </h2>

            {anosValidos &&
            valorFinanciadoBase > 0 &&
            entradaValida &&
            resultados.length > 0 ? (
              <>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {resultados.map((r) => (
                    <div
                      key={`${r.nome}-${prazo}`} // força remontagem ao trocar o prazo
                      className="border border-brand/20 rounded-xl2 p-4 hover:shadow-card transition-shadow"
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          {LOGOS[r.nome] ? (
                            <img
                              src={LOGOS[r.nome]}
                              alt={r.nome}
                              width={28}
                              height={28}
                              style={{ display: "inline-block" }}
                            />
                          ) : null}
                          <span className="text-lg font-semibold">{r.nome}</span>
                        </div>
                        <div className="text-sm text-brand" aria-label="Taxa ao mês">
                          Taxa{" "}
                          {(r.taxaMes * 100).toLocaleString("pt-BR", {
                            minimumFractionDigits: 2,
                            maximumFractionDigits: 2,
                          })}
                          % a.m
                        </div>
                      </div>

                      <div className="mt-3 text-2xl font-extrabold text-brand">
                        {formatBRL(r.parcela)}
                      </div>

                      <div className="mt-2 text-sm flex items-baseline gap-1">
                        <span className="text-brand-acc">Total pago:</span>
                        <output
                          className="font-semibold text-brand"
                          key={`total-${r.nome}-${prazo}-${Math.round(r.total)}`}
                        >
                          {formatBRL(r.total)}
                        </output>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Botão SUBIR PROPOSTA */}
                {/* Botão SUBIR PROPOSTA */}
<div className="mt-6">
  <a
    href="https://loja.hiperban.com.br/meL29Rpc"
    target="_blank"
    rel="noopener noreferrer"
    className="inline-block px-5 py-2.5 rounded-xl2 bg-[#ff5d29] text-white font-semibold hover:bg-[#e24e20] transition-colors"
  >                 
                    SUBIR PROPOSTA
                  </a>
                </div>
              </>
            ) : (
              <div className="p-4 border rounded bg-gray-50 text-sm text-gray-700">
                Preencha tipo, anos, valores e prazo válidos para ver as
                simulações.
              </div>
            )}

            {/* Observações */}
            <div className="mt-6 text-sm text-gray-700">
              <p className="mb-1">
                <b>Observações:</b>
              </p>
              <ul className="list-disc ml-5 space-y-1">
                <li>
                  Entrada mínima: <b>10%</b> do valor do veículo.
                </li>
                <li>Regras de idade: Leve ≤ 25 • Moto ≤ 10 • Caminhão ≤ 19.</li>
                <li>
                  <b>Atenção:</b> simulador de referência; a parcela pode variar
                  conforme CPF e políticas do banco.
                </li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
