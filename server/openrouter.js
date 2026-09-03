const OPENROUTER_BASE_URL = 'https://openrouter.ai/api/v1';
const DEFAULT_MODEL = 'openrouter/auto';
const MAX_API_KEY_LENGTH = 500;
const MAX_MODEL_LENGTH = 200;
const MAX_QUESTION_LENGTH = 2000;
const MAX_CONTEXT_LENGTH = 120000;

function isRecord(value) {
  return typeof value === 'object' && value !== null;
}

function textValue(value, fallback = '') {
  return typeof value === 'string' ? value : fallback;
}

function response(status, body) {
  return { status, body };
}

function upstreamErrorMessage(data, fallback) {
  if (isRecord(data) && isRecord(data.error)) {
    const message = textValue(data.error.message).trim();
    if (message) return message.slice(0, 300);
  }
  return fallback;
}

function upstreamStatus(status) {
  return [400, 401, 402, 403, 404, 408, 429].includes(status) ? status : 502;
}

async function readJson(res) {
  try {
    return await res.json();
  } catch {
    return null;
  }
}

function requestBody(value) {
  if (typeof value === 'string') {
    try {
      const parsed = JSON.parse(value);
      return isRecord(parsed) ? parsed : null;
    } catch {
      return null;
    }
  }
  return isRecord(value) ? value : null;
}

export async function processOpenRouterRequest(rawBody) {
  const body = requestBody(rawBody);
  if (!body) return response(400, { success: false, message: 'AI 요청 형식이 올바르지 않습니다.' });

  const apiKey = textValue(body.apiKey).trim();
  if (!apiKey || apiKey.length > MAX_API_KEY_LENGTH) {
    return response(400, { success: false, message: 'OpenRouter API 키를 확인해 주세요.' });
  }

  const action = textValue(body.action, 'query');
  if (action !== 'validate' && action !== 'query') {
    return response(400, { success: false, message: '지원하지 않는 AI 요청입니다.' });
  }

  if (action === 'validate') {
    try {
      const res = await fetch(`${OPENROUTER_BASE_URL}/key`, {
        headers: { Authorization: `Bearer ${apiKey}` },
      });
      const data = await readJson(res);
      if (!res.ok) {
        return response(upstreamStatus(res.status), {
          success: false,
          message: upstreamErrorMessage(data, 'OpenRouter API 키가 올바르지 않습니다.'),
        });
      }
      const keyData = isRecord(data) && isRecord(data.data) ? data.data : {};
      return response(200, {
        success: true,
        label: textValue(keyData.label),
      });
    } catch {
      return response(502, { success: false, message: 'OpenRouter 서버에 연결하지 못했습니다.' });
    }
  }

  const question = textValue(body.question).trim();
  if (!question || question.length > MAX_QUESTION_LENGTH) {
    return response(400, { success: false, message: 'AI 검색 질문을 입력해 주세요.' });
  }

  const model = textValue(body.model, DEFAULT_MODEL).trim() || DEFAULT_MODEL;
  if (model.length > MAX_MODEL_LENGTH) {
    return response(400, { success: false, message: 'AI 모델명이 너무 깁니다.' });
  }

  let contextText;
  try {
    contextText = JSON.stringify(body.context ?? {});
  } catch {
    return response(400, { success: false, message: 'AI 검색 데이터 형식을 확인해 주세요.' });
  }
  if (contextText.length > MAX_CONTEXT_LENGTH) {
    return response(413, { success: false, message: 'AI 검색 데이터가 너무 큽니다. 조회 범위를 줄여 주세요.' });
  }

  const request = {
    model,
    messages: [
      {
        role: 'system',
        content: [
          '당신은 CIMON 견적관리대장 분석 도우미입니다.',
          '반드시 제공된 JSON 데이터만 근거로 답하고, 데이터에 없는 수치나 업체를 추측하지 마세요.',
          '금액은 원화(KRW) 기준으로 설명하세요.',
          '현재 데이터는 견적관리대장 기준이며 실제 발주·매출과 다를 수 있음을 필요한 경우 명시하세요.',
          '제품명은 여러 품목이 포함된 견적에서 요약되어 있을 수 있으므로 제품별 정확한 집계가 불가능하면 그 한계를 명시하세요.',
          '질문에 답할 수 없으면 필요한 데이터가 무엇인지 간단히 설명하세요.',
        ].join('\n'),
      },
      {
        role: 'user',
        content: `질문:\n${question}\n\n견적관리대장 데이터(JSON):\n${contextText}`,
      },
    ],
    temperature: 0.1,
    max_tokens: 1600,
  };
  if (body.zdr === true) request.provider = { zdr: true };

  try {
    const res = await fetch(`${OPENROUTER_BASE_URL}/chat/completions`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
        'HTTP-Referer': 'https://product-selector-two.vercel.app',
        'X-OpenRouter-Title': 'CIMON Smart Quote',
      },
      body: JSON.stringify(request),
    });
    const data = await readJson(res);
    if (!res.ok) {
      return response(upstreamStatus(res.status), {
        success: false,
        message: upstreamErrorMessage(data, 'OpenRouter AI 검색에 실패했습니다.'),
      });
    }

    const choices = isRecord(data) && Array.isArray(data.choices) ? data.choices : [];
    const firstChoice = choices[0];
    const message = isRecord(firstChoice) && isRecord(firstChoice.message) ? firstChoice.message : null;
    const content = message?.content;
    const answer = typeof content === 'string' ? content.trim() : content == null ? '' : JSON.stringify(content);
    if (!answer) return response(502, { success: false, message: 'OpenRouter에서 답변을 받지 못했습니다.' });

    return response(200, {
      success: true,
      answer,
      model: textValue(isRecord(data) ? data.model : '', model),
    });
  } catch {
    return response(502, { success: false, message: 'OpenRouter 서버에 연결하지 못했습니다.' });
  }
}
