export interface MessageInterface {
  type: string; // Type of message (issue)
  message: string; // Description of the message (issue)
  view: string; // ID of the view, in case the user wants to navigate to it
  locationInView: string; // Where in the view the issue occurred
}