import type { IncomingMessage, ServerResponse } from 'http';
import {
  getLowLatencyReply,
  getHighThinkingAudit,
  generateTacticalImage,
  getSearchGroundedInfo,
  analyzeMeshTelemetry,
} from './geminiHandler';

function parseJsonBody(req: IncomingMessage): Promise<Record<string, unknown>> {
  return new Promise((resolve) => {
    let body = '';
    req.on('data', (chunk) => {
      body += chunk;
    });
    req.on('end', () => {
      try {
        resolve(body ? JSON.parse(body) : {});
      } catch {
        resolve({});
      }
    });
  });
}

function sendJson(res: ServerResponse, status: number, data: unknown) {
  res.statusCode = status;
  res.setHeader('Content-Type', 'application/json');
  res.end(JSON.stringify(data));
}

export async function handleApiRequest(req: IncomingMessage, res: ServerResponse): Promise<boolean> {
  const url = req.url || '';
  if (!url.startsWith('/api/gemini/')) {
    return false;
  }

  if (req.method !== 'POST') {
    sendJson(res, 405, { error: 'Method Not Allowed' });
    return true;
  }

  const endpoint = url.replace('/api/gemini/', '').split('?')[0];
  const body = await parseJsonBody(req);

  try {
    switch (endpoint) {
      case 'quick-reply': {
        const prompt = String(body.prompt || '');
        const context = String(body.context || '');
        const reply = await getLowLatencyReply(prompt, context);
        sendJson(res, 200, { reply });
        return true;
      }

      case 'high-thinking': {
        const prompt = String(body.prompt || '');
        const result = await getHighThinkingAudit(prompt);
        sendJson(res, 200, result);
        return true;
      }

      case 'generate-image': {
        const prompt = String(body.prompt || 'Tactical topographical overview of mountainous terrain with mesh repeater towers');
        const aspectRatio = String(body.aspectRatio || '16:9');
        const result = await generateTacticalImage(prompt, aspectRatio);
        sendJson(res, 200, result);
        return true;
      }

      case 'search-grounding': {
        const query = String(body.query || '');
        const result = await getSearchGroundedInfo(query);
        sendJson(res, 200, result);
        return true;
      }

      case 'analyze-mesh': {
        const telemetry = JSON.stringify(body.telemetry || {});
        const result = await analyzeMeshTelemetry(telemetry);
        sendJson(res, 200, { analysis: result });
        return true;
      }

      default:
        sendJson(res, 404, { error: 'Unknown Gemini API endpoint' });
        return true;
    }
  } catch (err) {
    console.error(`Error in /api/gemini/${endpoint}:`, err);
    sendJson(res, 500, {
      error: err instanceof Error ? err.message : 'Internal Gemini Server Error',
    });
    return true;
  }
}
