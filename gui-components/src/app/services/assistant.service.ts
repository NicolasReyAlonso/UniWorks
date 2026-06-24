import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';

import { EntityClient } from 'ngt-gui';

/** Un modelo seleccionable, tal y como lo describe GET /assistant/models. */
export interface AssistantModel {
  name: string;
  label: string;
  kind: string;
  model_id: string;
  capabilities: Record<string, unknown>;
}

/** Una herramienta integrada, de GET /assistant/tools. */
export interface AssistantTool {
  name: string;
  description: string;
  side: 'server' | 'ui';
  input_schema: Record<string, unknown>;
}

/** Mensaje del historial en el formato neutro que entiende el backend. */
export interface AssistantMessage {
  role: 'user' | 'assistant' | 'tool';
  content: string;
}

/** Resumen de una conversación guardada (GET /assistant/conversations). */
export interface ConversationSummary {
  uuid: string;
  title: string;
  model: string | null;
  message_count: number;
  created_at: string | null;
  updated_at: string | null;
}

/** Conversación completa con sus mensajes (GET /assistant/conversations/:uuid). */
export interface ConversationFull extends ConversationSummary {
  messages: AssistantMessage[];
}

/** Eventos del stream SSE de /assistant/chat. */
export type AssistantEvent =
  | { type: 'model'; name: string; label: string }
  | { type: 'text'; text: string }
  | { type: 'tool'; name: string; status: 'running' | 'done' }
  | { type: 'ui_action'; action: string; input: Record<string, any>; tool_id?: string }
  | { type: 'conversation'; uuid: string }
  | { type: 'error'; message: string }
  | { type: 'done' };

/**
 * Cliente del asistente LLM del backend (uniback.contrib.assistant).
 *
 * El chat se sirve como text/event-stream; usamos fetch + ReadableStream para
 * consumir el SSE incrementalmente (HttpClient no expone el cuerpo en streaming
 * con comodidad). Las credenciales van por cookie (`credentials: 'include'`),
 * de modo que el backend resuelve la sesión del usuario y aplica el ACL.
 */
@Injectable({ providedIn: 'root' })
export class AssistantService {
  constructor(private readonly entityClient: EntityClient) {}

  private get baseUrl(): string {
    return this.entityClient.baseUrl;
  }

  async listModels(): Promise<{ models: AssistantModel[]; default: string }> {
    const res = await fetch(`${this.baseUrl}/assistant/models`, { credentials: 'include' });
    const body = await res.json();
    return { models: body.content || [], default: body.default };
  }

  async listTools(): Promise<AssistantTool[]> {
    const res = await fetch(`${this.baseUrl}/assistant/tools`, { credentials: 'include' });
    const body = await res.json();
    return body.content || [];
  }

  // ----------------------------------------------------------------------
  // Historial de conversaciones (persistido por usuario en el backend)
  // ----------------------------------------------------------------------

  /** Lista las conversaciones del usuario actual (más recientes primero). */
  async listConversations(): Promise<ConversationSummary[]> {
    const res = await fetch(`${this.baseUrl}/assistant/conversations`, { credentials: 'include' });
    if (!res.ok) return [];
    const body = await res.json();
    return body.content || [];
  }

  /** Carga una conversación completa (con sus mensajes) para reanudarla. */
  async getConversation(uuid: string): Promise<ConversationFull | null> {
    const res = await fetch(`${this.baseUrl}/assistant/conversations/${uuid}`, { credentials: 'include' });
    if (!res.ok) return null;
    const body = await res.json();
    return body.content || null;
  }

  /** Borra una conversación del usuario. */
  async deleteConversation(uuid: string): Promise<boolean> {
    const res = await fetch(`${this.baseUrl}/assistant/conversations/${uuid}`, {
      method: 'DELETE',
      credentials: 'include',
    });
    return res.ok;
  }

  /** Renombra una conversación. */
  async renameConversation(uuid: string, title: string): Promise<boolean> {
    const res = await fetch(`${this.baseUrl}/assistant/conversations/${uuid}`, {
      method: 'PATCH',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title }),
    });
    return res.ok;
  }

  /**
   * Abre un turno de chat. Devuelve un Observable que emite cada evento SSE.
   * El llamante puede cancelar la suscripción para abortar el stream.
   */
  chat(payload: {
    model: string;
    enabled_tools: string[];
    messages: AssistantMessage[];
    current_context: Record<string, unknown>;
    conversation_id?: string | null;
  }): Observable<AssistantEvent> {
    const url = `${this.baseUrl}/assistant/chat`;
    return new Observable<AssistantEvent>((subscriber) => {
      const controller = new AbortController();

      (async () => {
        try {
          const res = await fetch(url, {
            method: 'POST',
            credentials: 'include',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload),
            signal: controller.signal,
          });
          if (!res.ok || !res.body) {
            subscriber.next({ type: 'error', message: `HTTP ${res.status}` });
            subscriber.complete();
            return;
          }
          const reader = res.body.getReader();
          const decoder = new TextDecoder();
          let buffer = '';
          while (true) {
            const { done, value } = await reader.read();
            if (done) break;
            buffer += decoder.decode(value, { stream: true });
            // Eventos SSE separados por línea en blanco.
            let sep: number;
            while ((sep = buffer.indexOf('\n\n')) !== -1) {
              const raw = buffer.slice(0, sep);
              buffer = buffer.slice(sep + 2);
              const line = raw.split('\n').find((l) => l.startsWith('data:'));
              if (!line) continue;
              try {
                subscriber.next(JSON.parse(line.slice(5).trim()) as AssistantEvent);
              } catch {
                /* ignora fragmentos no-JSON */
              }
            }
          }
          subscriber.complete();
        } catch (e: any) {
          if (e?.name !== 'AbortError') {
            subscriber.next({ type: 'error', message: String(e?.message || e) });
          }
          subscriber.complete();
        }
      })();

      return () => controller.abort();
    });
  }
}
