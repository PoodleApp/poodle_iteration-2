/* @flow */

import { type Email } from '../types'

// Data from nodemailer
export type DeliveryResult = {
  messageId: string,
  envelope: Object,
  accepted: string[], // email addresses
  rejected: string[],
  pending: string[],
  response: string
}

export type MessageOptions = Object

export type SmtpConfig = {
  service: string,
  auth: SmtpAuthConfig
}

type SmtpAuthConfig = {
  type: 'OAuth2',
  accessToken: string,
  clientId: string,
  clientSecret: string,
  expires: number,
  refreshToken: string,
  service: string,
  user: Email
}

export interface Transporter {
  sendMail(message: MessageOptions): Promise<DeliveryResult>
}
