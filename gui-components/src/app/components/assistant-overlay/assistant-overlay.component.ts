import { CommonModule } from '@angular/common';
import { Component, HostListener, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';

import { EntityClient } from 'ngt-gui';

import {
  AssistantEvent,
  AssistantModel,
  AssistantService,
  AssistantTool,
  ConversationSummary,
} from '../../services/assistant.service';

interface ChatMessage {
  role: 'user' | 'assistant';
  text: string;
}

interface PendingProposal {
  entity: string;
  rows: Record<string, any>[];
}

type Corner = 'tl' | 'tr' | 'bl' | 'br';

const FAB_SIZE = 52;
const MARGIN = 20;
const PANEL_W = 380;
const PANEL_H = 540;
const CORNER_KEY = 'assistant_fab_corner';

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

  // --- Historial de conversaciones (persistido por usuario) ---
  conversations: ConversationSummary[] = [];
  currentConversationId: string | null = null;
  showHistory = false;
  loadingHistory = false;

  // --- Botón flotante arrastrable ---
  corner: Corner = 'br';
  fabPos = { left: 0, top: 0 };
  dragging = false;
  private dragStartX = 0;
  private dragStartY = 0;
  private dragOrigLeft = 0;
  private dragOrigTop = 0;
  private moved = false;

  constructor(
    private readonly assistant: AssistantService,
    private readonly entityClient: EntityClient,
    private readonly router: Router,
  ) {}

  async ngOnInit(): Promise<void> {
    const saved = (typeof localStorage !== 'undefined' && localStorage.getItem(CORNER_KEY)) as Corner | null;
    if (saved && ['tl', 'tr', 'bl', 'br'].includes(saved)) this.corner = saved;
    this.applyCorner();

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

    this.refreshConversations();
  }

  // ------------------------------------------------------------------
  // Historial de conversaciones
  // ------------------------------------------------------------------

  async refreshConversations(): Promise<void> {
    this.loadingHistory = true;
    try {
      this.conversations = await this.assistant.listConversations();
    } catch {
      /* lista vacía si falla */
    } finally {
      this.loadingHistory = false;
    }
  }

  toggleHistory(): void {
    this.showHistory = !this.showHistory;
    if (this.showHistory) this.refreshConversations();
  }

  /** Empieza una conversación nueva (sin borrar las guardadas). */
  newChat(): void {
    this.messages = [];
    this.currentConversationId = null;
    this.pending = null;
    this.errorMsg = '';
    this.toolTrace = [];
    this.showHistory = false;
  }

  /** Carga una conversación guardada y la deja lista para continuar. */
  async openConversation(uuid: string): Promise<void> {
    if (this.streaming) return;
    const conv = await this.assistant.getConversation(uuid);
    if (!conv) {
      this.errorMsg = 'No se pudo cargar la conversación.';
      return;
    }
    this.messages = (conv.messages || [])
      .filter((m) => m.role === 'user' || m.role === 'assistant')
      .map((m) => ({ role: m.role as 'user' | 'assistant', text: m.content }));
    this.currentConversationId = conv.uuid;
    this.pending = null;
    this.errorMsg = '';
    this.toolTrace = [];
    this.showHistory = false;
  }

  async removeConversation(uuid: string, ev: Event): Promise<void> {
    ev.stopPropagation();
    const ok = await this.assistant.deleteConversation(uuid);
    if (!ok) return;
    if (this.currentConversationId === uuid) this.newChat();
    await this.refreshConversations();
  }

  toggleOpen(): void {
    this.open = !this.open;
    if (this.open) this.minimized = false;
  }

  // ------------------------------------------------------------------
  // Botón flotante: arrastrar y enganchar a la esquina más cercana
  // ------------------------------------------------------------------

  private clamp(v: number, min: number, max: number): number {
    return Math.max(min, Math.min(max, v));
  }

  /** Coloca el botón en la esquina activa (y al iniciar / redimensionar). */
  private applyCorner(): void {
    const W = window.innerWidth;
    const H = window.innerHeight;
    const right = W - FAB_SIZE - MARGIN;
    const bottom = H - FAB_SIZE - MARGIN;
    const map: Record<Corner, { left: number; top: number }> = {
      tl: { left: MARGIN, top: MARGIN },
      tr: { left: right, top: MARGIN },
      bl: { left: MARGIN, top: bottom },
      br: { left: right, top: bottom },
    };
    this.fabPos = map[this.corner];
  }

  onFabPointerDown(ev: PointerEvent): void {
    this.dragging = true;
    this.moved = false;
    this.dragStartX = ev.clientX;
    this.dragStartY = ev.clientY;
    this.dragOrigLeft = this.fabPos.left;
    this.dragOrigTop = this.fabPos.top;
    (ev.target as HTMLElement).setPointerCapture?.(ev.pointerId);
    ev.preventDefault();
  }

  @HostListener('document:pointermove', ['$event'])
  onPointerMove(ev: PointerEvent): void {
    if (!this.dragging) return;
    const dx = ev.clientX - this.dragStartX;
    const dy = ev.clientY - this.dragStartY;
    if (Math.abs(dx) + Math.abs(dy) > 4) this.moved = true;
    this.fabPos = {
      left: this.clamp(this.dragOrigLeft + dx, MARGIN, window.innerWidth - FAB_SIZE - MARGIN),
      top: this.clamp(this.dragOrigTop + dy, MARGIN, window.innerHeight - FAB_SIZE - MARGIN),
    };
  }

  @HostListener('document:pointerup')
  onPointerUp(): void {
    if (!this.dragging) return;
    this.dragging = false;
    if (!this.moved) {
      this.toggleOpen(); // fue un clic, no un arrastre
      return;
    }
    // Engancha a la esquina más cercana al centro del botón.
    const cx = this.fabPos.left + FAB_SIZE / 2;
    const cy = this.fabPos.top + FAB_SIZE / 2;
    const horiz = cx < window.innerWidth / 2 ? 'l' : 'r';
    const vert = cy < window.innerHeight / 2 ? 't' : 'b';
    this.corner = `${vert}${horiz}` as Corner;
    if (typeof localStorage !== 'undefined') localStorage.setItem(CORNER_KEY, this.corner);
    this.applyCorner();
  }

  @HostListener('window:resize')
  onResize(): void {
    if (!this.dragging) this.applyCorner();
  }

  /** Posición del panel anclado a la esquina activa del botón. */
  get panelStyle(): { [k: string]: string } {
    const W = window.innerWidth;
    const H = window.innerHeight;
    const onRight = this.corner === 'tr' || this.corner === 'br';
    const onBottom = this.corner === 'bl' || this.corner === 'br';
    const left = onRight
      ? this.clamp(W - PANEL_W - MARGIN, MARGIN, Math.max(MARGIN, W - PANEL_W - MARGIN))
      : MARGIN;
    const top = onBottom
      ? this.clamp(H - PANEL_H - MARGIN - FAB_SIZE - 8, MARGIN, H - 120)
      : MARGIN + FAB_SIZE + 8;
    return { left: `${left}px`, top: `${top}px` };
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
        conversation_id: this.currentConversationId,
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
      case 'conversation':
        // El backend confirma en qué conversación se guardó el turno (nueva o
        // existente). La adoptamos como actual y refrescamos el listado.
        this.currentConversationId = ev.uuid;
        this.refreshConversations();
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
