import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';

import { EntityClient } from 'ngt-gui';

import {
  AssistantEvent,
  AssistantModel,
  AssistantService,
  AssistantTool,
} from '../../services/assistant.service';

interface ChatMessage {
  role: 'user' | 'assistant';
  text: string;
}

interface PendingProposal {
  entity: string;
  rows: Record<string, any>[];
}

/**
 * Ventana flotante minimizable del asistente LLM.
 *
 * - Selector de modelo y de herramientas (lo integrado en el backend).
 * - Chat con streaming (texto incremental).
 * - Acciones de UI que llegan por el stream:
 *     * navigate_to        -> navega a la pantalla.
 *     * propose_table_rows -> muestra una tarjeta de confirmación; al
 *       confirmar, da de alta vía el CRUD existente (EntityClient.bulk).
 *
 * El contexto (pantalla/entidad que ve el usuario) se deduce de la URL del
 * router (`/d/<entidad>_browser`), sin acoplarse a la librería.
 */
@Component({
  selector: 'app-assistant-overlay',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './assistant-overlay.component.html',
  styleUrls: ['./assistant-overlay.component.css'],
})
export class AssistantOverlayComponent implements OnInit {
  open = false;
  minimized = false;

  models: AssistantModel[] = [];
  tools: AssistantTool[] = [];
  selectedModel = '';
  enabledTools = new Set<string>();

  messages: ChatMessage[] = [];
  input = '';
  streaming = false;
  toolTrace: string[] = [];
  errorMsg = '';

  pending: PendingProposal | null = null;
  confirming = false;

  constructor(
    private readonly assistant: AssistantService,
    private readonly entityClient: EntityClient,
    private readonly router: Router,
  ) {}

  async ngOnInit(): Promise<void> {
    try {
      const [{ models, default: def }, tools] = await Promise.all([
        this.assistant.listModels(),
        this.assistant.listTools(),
      ]);
      this.models = models;
      this.tools = tools;
      this.selectedModel = models.find((m) => m.name === def)?.name || models[0]?.name || '';
      this.enabledTools = new Set(tools.map((t) => t.name)); // todas activas por defecto
    } catch {
      this.errorMsg = 'No se pudo contactar con el asistente.';
    }
  }

  toggleOpen(): void {
    this.open = !this.open;
    if (this.open) this.minimized = false;
  }

  toggleTool(name: string): void {
    this.enabledTools.has(name) ? this.enabledTools.delete(name) : this.enabledTools.add(name);
  }

  private deriveContext(): Record<string, unknown> {
    const url = this.router.url.split('?')[0];
    const m = url.match(/\/d\/([^/]+)/);
    const ctx: Record<string, unknown> = { route: url };
    if (m) {
      ctx['screen'] = m[1];
      ctx['entity'] = m[1].replace(/_(browser|editable_table|table|form)$/, '');
    }
    return ctx;
  }

  send(): void {
    const text = this.input.trim();
    if (!text || this.streaming || !this.selectedModel) return;

    this.messages.push({ role: 'user', text });
    this.input = '';
    this.errorMsg = '';
    this.toolTrace = [];

    const history = this.messages.map((m) => ({ role: m.role, content: m.text }));
    const assistantMsg: ChatMessage = { role: 'assistant', text: '' };
    this.messages.push(assistantMsg);
    this.streaming = true;

    this.assistant
      .chat({
        model: this.selectedModel,
        enabled_tools: Array.from(this.enabledTools),
        messages: history,
        current_context: this.deriveContext(),
      })
      .subscribe({
        next: (ev: AssistantEvent) => this.handleEvent(ev, assistantMsg),
        error: () => {
          this.errorMsg = 'Error de conexión con el asistente.';
          this.streaming = false;
        },
        complete: () => (this.streaming = false),
      });
  }

  private handleEvent(ev: AssistantEvent, assistantMsg: ChatMessage): void {
    switch (ev.type) {
      case 'text':
        assistantMsg.text += ev.text;
        break;
      case 'tool':
        if (ev.status === 'running') this.toolTrace.push(ev.name);
        break;
      case 'ui_action':
        this.handleUiAction(ev.action, ev.input);
        break;
      case 'error':
        this.errorMsg = ev.message;
        break;
      case 'done':
        this.streaming = false;
        break;
    }
  }

  private handleUiAction(action: string, input: Record<string, any>): void {
    if (action === 'navigate_to' && input['route']) {
      this.router.navigateByUrl(input['route']);
    } else if (action === 'propose_table_rows' && input['entity'] && Array.isArray(input['rows'])) {
      this.pending = { entity: input['entity'], rows: input['rows'] };
    }
  }

  confirmProposal(): void {
    if (!this.pending) return;
    this.confirming = true;
    const { entity, rows } = this.pending;
    const items = rows.map((r) => ({ data: r }));
    this.entityClient
      .for(`/${entity}`)
      .bulk(items, 'partial')
      .subscribe({
        next: () => {
          this.confirming = false;
          this.pending = null;
          this.messages.push({ role: 'assistant', text: `✓ Añadido a "${entity}".` });
          this.refreshCurrentScreen();
        },
        error: () => {
          this.confirming = false;
          this.errorMsg = 'No se pudieron crear los registros.';
        },
      });
  }

  cancelProposal(): void {
    this.pending = null;
  }

  private refreshCurrentScreen(): void {
    const url = this.router.url;
    this.router.navigateByUrl('/', { skipLocationChange: true }).then(() => this.router.navigateByUrl(url));
  }
}
