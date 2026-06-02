import { MessageInterface } from './message.interface';

export interface MessageLogServiceInterface {
  messages: MessageInterface[];
  notSeen: number;

  addMessage(msg: MessageInterface): any;
  addResponseIssues(response):any;
  addIssues(msgs: any[]): any;
  alreadySeen():any;
  info(message: string):any;
  error(message: string):any;
  success(message: string):any;
  warning(message: string):any;
  debug(message: string):any;
  loading(message: string):any;
}

export interface MessageLogClassServiceInterface {
  new (...args: any[]): MessageLogServiceInterface;
  instance: MessageLogServiceInterface;
}