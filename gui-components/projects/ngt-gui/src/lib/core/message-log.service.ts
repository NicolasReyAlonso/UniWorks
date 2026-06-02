import {Injectable} from '@angular/core';
import {NzMessageService} from "ng-zorro-antd/message";
import { Inject, Optional } from '@angular/core';

// Class interfaces
import { MessageInterface } from '../interfaces/message-log/message.interface';
import { MessageLogServiceInterface } from '../interfaces/message-log/message-log.interface';

// Library Services
import {StateService} from "./state.service";

// Library interfaces
import { StateServiceInterface } from '../interfaces/state/state.interface';


// Tokens
import { STATE_SERVICE } from '../tokens/state.token';

class Message implements MessageInterface{
  type: string; // Type of message (issue)
  message: string; // Description of the message (issue)
  view: string; // ID of the view, in case the user wants to navigate to it
  locationInView: string; // Where in the view the issue occurred
  constructor(t: string, m: string, v: string=null, loc: string=null) {
    this.type = t;
    this.message = m;
    this.view = v;
    this.locationInView = loc;
  }
}

@Injectable({
  providedIn: 'root'
})
export class MessageLogService implements MessageLogServiceInterface {
  static instance: MessageLogService;
  public messages: Message[] = [];
  public notSeen: number = 0;
  private state: StateServiceInterface;

  constructor(
    private defaultState: StateService,
    msg: NzMessageService,
    @Optional() @Inject(STATE_SERVICE) private injectedStateService: StateServiceInterface
  ) {
    this.state = injectedStateService || defaultState;
    MessageLogService.instance = this;
  }

  addMessage(msg: Message) {
    if (msg.view == null) {
      msg.view = this.state.getCurrentViewUrl();
    }
    this.messages.push(msg);
    this.notSeen+=1;
    // Control size, maximum 10000 messages
    if (this.messages.length > 10000) {
      this.messages.splice(0, 1);
    }
    // Notify, if there is something relevant
  }

  addResponseIssues(response) {
    if (response && response.issues) {
      this.addIssues(response.issues);
    }
  }

  addIssues(msgs: any[]) {
    if (!msgs) return;
    for (const msg of msgs) {
      this.addMessage(new Message(msg.type, msg.message));
    }
  }

  alreadySeen() {
    this.notSeen=0;
  }

  info(message: string) {
    this.addMessage(new Message("info", JSON.stringify(message)));
  }

  error(message: string) {
    this.addMessage(new Message("error", JSON.stringify(message)));
  }

  success(message: string) {
    this.addMessage(new Message("success", JSON.stringify(message)));
  }

  warning(message: string) {
    this.addMessage(new Message("warning", JSON.stringify(message)));
  }

  debug(message: string) {
    this.addMessage(new Message("debug", JSON.stringify(message)));
  }

  loading(message: string) {
    this.addMessage(new Message("loading", JSON.stringify(message)));
  }
}
