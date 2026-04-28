const VALID_REQUEST_FORMATS = new Set(["responses", "chat", "inputs"]);

export const missingUserTokenMessage =
  "Missing forwarded Databricks user token. Enable Databricks Apps user authorization, add the model-serving scope, redeploy or restart the app, and have users grant consent.";

export function normalizeHeaderValue(value) {
  if (Array.isArray(value)) {
    return value.find((item) => typeof item === "string" && item.trim())?.trim() || "";
  }

  return typeof value === "string" ? value.trim() : "";
}

export function getForwardedUserToken(req) {
  return (
    normalizeHeaderValue(req.get("x-forwarded-access-token")) ||
    normalizeHeaderValue(req.get("X-Forwarded-Access-Token")) ||
    normalizeHeaderValue(req.headers["x-forwarded-access-token"]) ||
    normalizeHeaderValue(req.headers["X-Forwarded-Access-Token"])
  );
}

export function normalizeDatabricksHost(host) {
  const trimmedHost = String(host || "").trim().replace(/\/+$/, "");

  if (!trimmedHost) {
    return "";
  }

  if (/^https?:\/\//i.test(trimmedHost)) {
    return trimmedHost;
  }

  return `https://${trimmedHost}`;
}

export function getRequestFormat() {
  const format = String(process.env.AGENT_REQUEST_FORMAT || "responses").trim().toLowerCase();
  return VALID_REQUEST_FORMATS.has(format) ? format : "responses";
}

export function normalizeMessages(messages) {
  if (!Array.isArray(messages)) {
    throw new Error("Request body must include a messages array.");
  }

  const normalizedMessages = messages
    .map((message) => {
      const role = message?.role === "assistant" ? "assistant" : "user";
      const content = typeof message?.content === "string" ? message.content : "";

      return { role, content };
    })
    .filter((message) => message.content.trim().length > 0);

  if (normalizedMessages.length === 0) {
    throw new Error("Send at least one non-empty message.");
  }

  return normalizedMessages;
}

export function buildAgentPayload(messages, requestFormat = getRequestFormat()) {
  const latestPrompt =
    [...messages].reverse().find((message) => message.role === "user")?.content || "";

  if (requestFormat === "chat") {
    return { messages };
  }

  if (requestFormat === "inputs") {
    return {
      inputs: {
        prompt: latestPrompt,
        messages
      }
    };
  }

  return { input: messages };
}

function extractTextFromContentParts(content) {
  if (!Array.isArray(content)) {
    return "";
  }

  return content
    .map((part) => {
      if (typeof part === "string") {
        return part;
      }

      if (typeof part?.text === "string") {
        return part.text;
      }

      if (typeof part?.content === "string") {
        return part.content;
      }

      return "";
    })
    .filter(Boolean)
    .join("\n")
    .trim();
}

function extractOutputText(output) {
  if (!Array.isArray(output)) {
    return "";
  }

  return output
    .map((item) => {
      if (typeof item === "string") {
        return item;
      }

      if (typeof item?.content === "string") {
        return item.content;
      }

      return extractTextFromContentParts(item?.content);
    })
    .filter(Boolean)
    .join("\n")
    .trim();
}

function extractPredictionsText(predictions) {
  if (typeof predictions === "string") {
    return predictions.trim();
  }

  if (!Array.isArray(predictions)) {
    return extractAgentText(predictions);
  }

  return predictions
    .map((prediction) => extractAgentText(prediction))
    .filter(Boolean)
    .join("\n")
    .trim();
}

export function extractAgentText(payload) {
  if (payload == null) {
    return "";
  }

  if (typeof payload === "string") {
    return payload.trim();
  }

  if (Array.isArray(payload)) {
    return payload
      .map((item) => extractAgentText(item))
      .filter(Boolean)
      .join("\n")
      .trim();
  }

  const openAiMessage = payload.choices?.[0]?.message?.content;
  if (typeof openAiMessage === "string" && openAiMessage.trim()) {
    return openAiMessage.trim();
  }

  const responsesText = extractOutputText(payload.output);
  if (responsesText) {
    return responsesText;
  }

  const directKeys = [
    "output_text",
    "text",
    "content",
    "answer",
    "response",
    "prediction"
  ];

  for (const key of directKeys) {
    const value = payload[key];

    if (typeof value === "string" && value.trim()) {
      return value.trim();
    }

    const nestedValue = extractAgentText(value);
    if (nestedValue) {
      return nestedValue;
    }
  }

  const predictionsText = extractPredictionsText(payload.predictions);
  if (predictionsText) {
    return predictionsText;
  }

  return "";
}

export function getPublicConfig(req) {
  const databricksHost = normalizeDatabricksHost(process.env.DATABRICKS_HOST);
  const servingEndpoint = process.env.SERVING_ENDPOINT || "";

  return {
    databricksHost,
    servingEndpoint,
    forwardedUserTokenPresent: Boolean(getForwardedUserToken(req)),
    requestFormat: getRequestFormat()
  };
}

export async function invokeServingEndpoint({ messages, token }) {
  const databricksHost = normalizeDatabricksHost(process.env.DATABRICKS_HOST);
  const servingEndpoint = process.env.SERVING_ENDPOINT;
  const requestFormat = getRequestFormat();

  if (!token) {
    const error = new Error(missingUserTokenMessage);
    error.status = 401;
    throw error;
  }

  if (!databricksHost) {
    const error = new Error("DATABRICKS_HOST is not configured.");
    error.status = 500;
    throw error;
  }

  if (!servingEndpoint) {
    const error = new Error("SERVING_ENDPOINT is not configured. Add a serving endpoint resource with key serving-endpoint and map it in app.yaml.");
    error.status = 500;
    throw error;
  }

  const endpointUrl = `${databricksHost}/serving-endpoints/${encodeURIComponent(
    servingEndpoint
  )}/invocations`;
  const payload = buildAgentPayload(messages, requestFormat);
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 120000);

  try {
    const response = await fetch(endpointUrl, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify(payload),
      signal: controller.signal
    });

    const responseText = await response.text();
    let rawResponse;

    try {
      rawResponse = responseText ? JSON.parse(responseText) : {};
    } catch {
      rawResponse = responseText;
    }

    if (!response.ok) {
      const error = new Error(`Databricks serving endpoint returned HTTP ${response.status}.`);
      error.status = response.status;
      error.details = rawResponse;
      throw error;
    }

    return {
      text: extractAgentText(rawResponse) || "The endpoint returned a response, but no displayable text was found.",
      rawResponse,
      request: {
        format: requestFormat,
        payload
      }
    };
  } catch (error) {
    if (error.name === "AbortError") {
      const timeoutError = new Error("Databricks serving endpoint request timed out after 120 seconds.");
      timeoutError.status = 504;
      throw timeoutError;
    }

    throw error;
  } finally {
    clearTimeout(timeout);
  }
}
