import {
  buildIntegrationsStatus,
  probeOpenAI,
  probeTavily,
} from "../lib/integrations";

async function main() {
  const status = buildIntegrationsStatus();
  const openai = status.openai.configured ? await probeOpenAI() : { ok: false, configured: false, status: null, code: "OPENAI_MISSING", detail: "not_configured" };
  const tavily = status.webSearch.configured ? await probeTavily() : { ok: false, configured: false, status: null, code: "TAVILY_MISSING", detail: "not_configured" };
  const payload = {
    environment: status.environment,
    openai: {
      configured: status.openai.configured,
      provider: status.openai.provider,
      model: status.openai.model,
      probeOk: openai.ok,
      probeStatus: openai.status,
      probeCode: openai.code,
    },
    webSearch: {
      configured: status.webSearch.configured,
      provider: status.webSearch.provider,
      probeOk: tavily.ok,
      probeStatus: tavily.status,
      probeCode: tavily.code,
      probeDetail: tavily.detail,
    },
  };
  const serialized = JSON.stringify(payload);
  if (/sk-|tvly-|Bearer /i.test(serialized) && /sk-[a-zA-Z0-9]{8,}/.test(serialized)) {
    throw new Error("Probe bloqueado: possível vazamento de segredo.");
  }
  console.log(serialized);
}

void main();
